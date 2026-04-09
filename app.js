// app.js
import { questions } from "./questions.js";
import { submitDataToSpreadsheet } from "./api.js";

// Configuration & Utilities
const totalQuestions = questions.length;
const optionKeys = ["A", "B", "C", "D"];

/**
 * VARK Learning Style Mapping (Fleming & Mills, 1992)
 * Maps style_belajar values to VARK categories
 */
const VARK_MAPPING = {
  video: {
    vark_code: "V",
    vark_type: "Visual",
    vark_full: "Pembelajaran Visual (Video, Diagram, Warna)",
  },
  pdf: {
    vark_code: "R",
    vark_type: "Reading/Writing",
    vark_full: "Pembelajaran Reading/Writing (Text, Artikel, Notes)",
  },
  guru: {
    vark_code: "A",
    vark_type: "Aural",
    vark_full: "Pembelajaran Aural (Mendengar, Diskusi, Penjelasan)",
  },
  explore: {
    vark_code: "K",
    vark_type: "Kinesthetic",
    vark_full: "Pembelajaran Kinesthetic (Hands-on, Praktek, Simulasi)",
  },
};

/**
 * Transform style_belajar value to VARK learning style info
 */
function transformLearningStyle(styleBelajarValue) {
  return (
    VARK_MAPPING[styleBelajarValue] || {
      vark_code: "?",
      vark_type: "Unknown",
      vark_full: "Gaya belajar tidak dikenali",
    }
  );
}

/**
 * Calculate Proficiency Score from readiness grid (0-100)
 * Formula: (sum of all readiness levels / 10) * 100
 * Max possible: 5 items x level 2 = 10
 */
function calculateProficiencyScore(readinessData) {
  const vals = Object.values(readinessData).map((v) => (v !== null ? v : 0));
  const totalLevel = vals.reduce((a, b) => a + b, 0);
  return (totalLevel / 10) * 100;
}

/**
 * Calculate Quiz Score (0 or 100)
 * Finds the correct answer dynamically from questions data
 */
function calculateQuizScore(quizAnswer) {
  const quizQuestion = questions.find((q) => q.id === "quiz");
  if (!quizQuestion) return 0;
  const correctAnswer = quizQuestion.opts.find((o) => o.ok === true)?.v;
  return quizAnswer === correctAnswer ? 100 : 0;
}

/**
 * Calculate Final Readiness Score (0-100)
 * Formula: (Proficiency x 0.7) + (Quiz x 0.3)
 * Based on: Bloom's Taxonomy + Self-Efficacy Theory
 */
function calculateReadinessScore(readinessData, quizAnswer) {
  const proficiency = calculateProficiencyScore(readinessData);
  const quiz = calculateQuizScore(quizAnswer);
  return Math.round(proficiency * 0.7 + quiz * 0.3);
}

/**
 * Escape special characters to prevent XSS
 */
const esc = (text) => {
  if (text === null || text === undefined) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

// Application State
let currentStepIndex = 0;
const userAnswers = {};

/**
 * Save progress to localStorage
 */
function saveProgress() {
  try {
    localStorage.setItem(
      "assessmentProgress",
      JSON.stringify({
        stepIndex: currentStepIndex,
        answers: userAnswers,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn("Gagal menyimpan progress ke localStorage:", error.message);
  }
}

/**
 * Restore progress from localStorage
 */
function restoreProgress() {
  try {
    const saved = localStorage.getItem("assessmentProgress");
    if (!saved) return false;

    const { stepIndex, answers } = JSON.parse(saved);
    if (stepIndex === undefined || !answers) return false;

    // Check if saved progress is less than 5 minutes old
    const { timestamp } = JSON.parse(saved);
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > 5 * 60 * 1000) {
      localStorage.removeItem("assessmentProgress");
      return false;
    }

    // Restore state
    currentStepIndex = stepIndex;
    Object.assign(userAnswers, answers);

    console.log(`✅ Progress restored from step ${stepIndex + 1}`);
    return true;
  } catch (error) {
    console.warn("Gagal restore progress:", error.message);
    return false;
  }
}

/**
 * Clear saved progress
 */
function clearProgress() {
  try {
    localStorage.removeItem("assessmentProgress");
  } catch (error) {
    console.warn("Gagal hapus progress:", error.message);
  }
}

/**
 * Initialize responses object based on question types
 */
function initResponses() {
  questions.forEach((question) => {
    if (question.type === "text") {
      userAnswers[question.id] = {};
      question.fields.forEach((f) => (userAnswers[question.id][f.key] = ""));
    } else if (question.type === "mradio" || question.type === "grid") {
      userAnswers[question.id] = {};
      const items = question.groups || question.items;
      items.forEach((item) => (userAnswers[question.id][item.key || item.k] = null));
    } else if (question.type === "checkbox") {
      userAnswers[question.id] = [];
    } else {
      userAnswers[question.id] = null;
    }
  });
}

/**
 * Check if the current question is answered correctly/completely
 */
function isStepComplete() {
  const currentQuestion = questions[currentStepIndex];
  if (!currentQuestion) return false;

  const ans = userAnswers[currentQuestion.id];
  if (currentQuestion.type === "text") return currentQuestion.fields.every((f) => (ans[f.key] || "").trim().length > 0);
  if (currentQuestion.type === "mradio") return currentQuestion.groups.every((g) => ans[g.key] !== null);
  if (currentQuestion.type === "grid") return currentQuestion.items.every((i) => ans[i.k] !== null);
  if (currentQuestion.type === "checkbox") return ans.length > 0;
  return ans !== null;
}

/**
 * Global UI Update
 */
function render() {
  if (currentStepIndex >= totalQuestions) {
    showResult();
    return;
  }

  const currentQuestion = questions[currentStepIndex];
  const progressPercent = Math.round((currentStepIndex / totalQuestions) * 100);
  const appEl = document.getElementById("app");

  // Initial structure or update existing one
  const cardExists = appEl.querySelector(".card");

  if (!cardExists) {
    appEl.innerHTML = `
            <div class="card">
                <div class="header-bar">
                    <div class="header-logo">📊</div>
                    <div>
                        <div class="header-title">Asesmen Awal Excel</div>
                        <div class="header-sub">Excel Intermediate — SMA</div>
                    </div>
                </div>
                <div class="pgbar"><div class="pgfill"></div></div>
                <div id="question-container"></div>
                <div class="nav" id="nav-container"></div>
            </div>
        `;
  }

  // Update Progress
  appEl.querySelector(".pgfill").style.width = `${progressPercent}%`;

  // Update Question Content
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = renderQuestionHTML(currentQuestion);

  // Update Nav
  const navContainer = document.getElementById("nav-container");
  navContainer.innerHTML = `
        ${currentStepIndex > 0 ? '<button class="btnb" data-action="back">← Kembali</button>' : "<div></div>"}
        <button class="btnp" ${isStepComplete() ? "" : "disabled"} data-action="next">
            ${currentStepIndex < totalQuestions - 1 ? "Lanjut →" : "Lihat Hasilku ✨"}
        </button>
    `;

  // Autofocus for text inputs
  const firstInput = appEl.querySelector(".inp");
  if (firstInput) setTimeout(() => firstInput.focus(), 50);

  // Save progress to localStorage
  saveProgress();
}

/**
 * Generate HTML for specific question types
 */
function renderQuestionHTML(q) {
  const ans = userAnswers[q.id];
  let html = `<div class="qwrap">
        <div class="smeta">Pertanyaan ${q.step} dari ${totalQuestions}</div>
        <div class="qtitle">${esc(q.title)}</div>`;

  if (q.hint) html += `<div class="qhint">${esc(q.hint)}</div>`;

  if (q.type === "text") {
    q.fields.forEach((f) => {
      const maxLen = f.key === "nama" ? 100 : 50;
      const fieldValue = esc(ans[f.key]);
      html += `<div class="igrp">
                <label class="ilabel" for="${q.id}_${f.key}">${esc(f.label)}</label>
                <input class="inp" id="${q.id}_${f.key}" data-qid="${q.id}" data-fkey="${f.key}" placeholder="${esc(f.ph)}" value="${fieldValue}" maxlength="${maxLen}" required>
            </div>`;
    });
  } else if (q.type === "mradio") {
    q.groups.forEach((g) => {
      html += `<div class="qlabel" role="group" aria-label="${esc(g.label)}">${esc(g.label)}</div>`;
      g.opts.forEach((o) => {
        const isSelected = ans[g.key] === o.v;
        html += `<div class="opt${isSelected ? " sel" : ""}" role="radio" aria-checked="${isSelected}" tabindex="0" data-action="setMR" data-qid="${q.id}" data-gkey="${g.key}" data-val="${o.v}">
                    <div class="okey" style="width:10px;border:none"></div>
                    <div class="olabel">${esc(o.l)}</div>
                </div>`;
      });
    });
  } else if (q.type === "mcq") {
    q.opts.forEach((o, i) => {
      let cls = "opt";
      const isSelected = ans === o.v;

      // Show blue highlight when selected (no green/red feedback)
      if (isSelected) {
        cls += " sel";
      }
      html += `<div class="${cls}" role="radio" aria-checked="${isSelected}" tabindex="0" data-action="setMCQ" data-qid="${q.id}" data-val="${o.v}">
                <div class="okey">${optionKeys[i]}</div>
                <div class="otxt">
                    <div class="olabel" style="${o.l.startsWith("=") ? "font-family:monospace;font-size:13px" : ""}">${esc(o.l)}</div>
                    ${o.s ? `<div class="osub">${esc(o.s)}</div>` : ""}
                </div>
            </div>`;
    });
    if (!ans) html += `<div class="kbhint">Tekan A / B / C / D untuk memilih</div>`;
  } else if (q.type === "grid") {
    html += `<div class="grid-wrap">`;
    q.items.forEach((item) => {
      const currentVal = ans[item.k];
      html += `<div class="gitem" role="group" aria-label="${esc(item.fn)} - ${esc(item.d)}">
                <div><div class="gfn">${esc(item.fn)}</div><div class="gdesc">${esc(item.d)}</div></div>
                <div class="gbtns">`;
      q.lvs.forEach((lv) => {
        const isSelected = currentVal === lv.v;
        html += `<button class="gb${isSelected ? " g" + lv.v : ""}" role="radio" aria-checked="${isSelected}" data-action="setGrid" data-qid="${q.id}" data-ikey="${item.k}" data-val="${lv.v}">${esc(lv.l)}</button>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
  } else if (q.type === "checkbox") {
    q.opts.forEach((o) => {
      const isSelected = ans.includes(o.v);
      html += `<div class="chk${isSelected ? " sel" : ""}" role="checkbox" aria-checked="${isSelected}" tabindex="0" data-action="togChk" data-qid="${q.id}" data-val="${o.v}">
                <div class="cbox">${isSelected ? "✓" : ""}</div>
                <div class="otxt">
                    <div class="olabel">${esc(o.l)}</div>
                    ${o.s ? `<div class="osub">${esc(o.s)}</div>` : ""}
                </div>
            </div>`;
    });
  }

  html += `</div>`;
  return html;
}

/**
 * Handle form submission and result display
 */
async function showResult() {
  const appEl = document.getElementById("app");
  appEl.innerHTML = `<div class="card">
        <div class="header-bar"><div class="header-logo">📊</div><div><div class="header-title">Asesmen Awal Excel</div><div class="header-sub">Menganalisis profilmu...</div></div></div>
        <div class="pgbar"><div class="pgfill" style="width:100%"></div></div>
        <div style="display:flex;align-items:center;gap:10px;padding:2rem 0;color:#64748b;font-size:15px">
            <div class="dots"><span></span><span></span><span></span></div>Merekam data...
        </div>
    </div>`;

  // Calculate Readiness Score (0-100)
  const readinessScore = calculateReadinessScore(userAnswers.readiness, userAnswers.quiz);

  // Transform Learning Style to VARK
  const gayaBelajar = userAnswers.style_belajar?.gaya;
  const varkAnalysis = transformLearningStyle(gayaBelajar);

  // Attach calculated scores to userAnswers before submission
  userAnswers.readinessScore = readinessScore;
  userAnswers.varkAnalysis = varkAnalysis;

  console.log("📊 Readiness Score:", readinessScore);
  console.log("🧠 VARK Analysis:", varkAnalysis);

  await submitDataToSpreadsheet(userAnswers);

  const category = readinessScore >= 70 ? "Mahir" : readinessScore >= 40 ? "Siap Intermediate" : "Pemula Terpandu";
  const badgeCls = category === "Mahir" ? "bm" : category === "Siap Intermediate" ? "bs" : "bp";

  // Clear saved progress after successful submission
  clearProgress();

  appEl.innerHTML = `
        <div class="card">
            <div class="header-bar"><div class="header-logo">✨</div><div><div class="header-title">Profil Kesiapanmu</div><div class="header-sub">Berdasarkan jawabanmu</div></div></div>
            <div class="pgbar"><div class="pgfill" style="width:100%"></div></div>
            <div class="qwrap">
                <div class="smeta">Hei ${esc(userAnswers.identity?.nama || "kamu")}!</div>
                <div style="margin:.75rem 0"><span class="badge ${badgeCls}">${esc(category)}</span></div>
                <div class="rcard">
                    <div class="rhead"><div class="rlabel">Skor Readiness</div><div class="rval">${readinessScore}/100 — ${esc(category)}</div></div>
                    <div class="rbody">
                        <p><strong>Gaya Belajar (VARK):</strong> ${esc(varkAnalysis.vark_full)}</p>
                        <p style="margin-top:8px">Data kamu berhasil direkam! Gurumu akan menganalisis hasilmu untuk menyesuaikan materi kelas.</p>
                    </div>
                </div>
                <div style="margin-top:1rem;display:flex;gap:8px">
                    <button class="btnb" data-action="print">🖨 Cetak</button>
                    <button class="btnb" data-action="reload">↺ Isi Ulang</button>
                </div>
            </div>
        </div>`;
}

/**
 * Event Delegation - Handle all clicks in the app
 */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;

  const action = el.dataset.action;
  const { qid, val, fkey, gkey, ikey } = el.dataset;

  if (action === "next") {
    if (isStepComplete()) {
      currentStepIndex++;
      render();
    }
  } else if (action === "back") {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      render();
    }
  } else if (action === "setMR") {
    userAnswers[qid][gkey] = val;
    render();
  } else if (action === "setMCQ") {
    userAnswers[qid] = val;
    render();
  } else if (action === "setGrid") {
    userAnswers[qid][ikey] = parseInt(val);
    render();
  } else if (action === "togChk") {
    const arr = userAnswers[qid];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(val);
    render();
  } else if (action === "print") {
    window.print();
  } else if (action === "reload") {
    clearProgress();
    window.location.reload();
  }
});

/**
 * Input Handling - Use event delegation for input but update state directly to avoid focus loss
 */
document.addEventListener("input", (e) => {
  const el = e.target.closest(".inp");
  if (!el) return;

  const { qid, fkey } = el.dataset;
  userAnswers[qid][fkey] = el.value;

  // update only the button state without full rerender
  const nextBtn = document.querySelector('[data-action="next"]');
  if (nextBtn) nextBtn.disabled = !isStepComplete();

  // Save progress
  saveProgress();
});

// Keyboard Support - Enhanced for accessibility
document.addEventListener("keydown", (e) => {
  if (currentStepIndex >= totalQuestions) return;
  const currentQuestion = questions[currentStepIndex];

  // Radio/Checkbox: Enter/Space to select
  if ((e.key === "Enter" || e.key === " ") && document.activeElement?.hasAttribute("role") && (document.activeElement.getAttribute("role") === "radio" || document.activeElement.getAttribute("role") === "checkbox")) {
    document.activeElement.click();
    e.preventDefault();
    return;
  }

  // MCQ: A-D keys to select answers
  if (currentQuestion.type === "mcq") {
    const keyMap = { a: "a", b: "b", c: "c", d: "d", A: "a", B: "b", C: "c", D: "d" };
    if (keyMap[e.key]) {
      userAnswers[currentQuestion.id] = keyMap[e.key];
      render();
      e.preventDefault();
      return;
    }
  }

  // Enter to proceed if can go next (when not in text input)
  if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT" && isStepComplete()) {
    currentStepIndex++;
    render();
    e.preventDefault();
    return;
  }

  // Grid: Arrow keys to navigate grid buttons
  if (currentQuestion.type === "grid" && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
    const focused = document.activeElement.closest(".gb");
    if (focused) {
      const siblings = Array.from(focused.parentElement.querySelectorAll(".gb"));
      const idx = siblings.indexOf(focused);

      if (e.key === "ArrowLeft" && idx > 0) siblings[idx - 1].focus();
      if (e.key === "ArrowRight" && idx < siblings.length - 1) siblings[idx + 1].focus();

      e.preventDefault();
      return;
    }
  }
});

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  initResponses();

  // Try to restore previous progress
  const hasRestoredProgress = restoreProgress();
  if (hasRestoredProgress && currentStepIndex > 0) {
    console.log(`📝 Lanjut dari step sebelumnya atau mulai baru?`);
  }

  render();
});
