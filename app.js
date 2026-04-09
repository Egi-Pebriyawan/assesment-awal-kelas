// app.js
import { questions } from './questions.js';
import { submitDataToSpreadsheet } from './api.js';

// Configuration & Utilities
const totalQuestions = questions.length;
const optionKeys = ['A', 'B', 'C', 'D'];

/**
 * Escape special characters to prevent XSS
 */
const esc = (text) => {
    if (text === null || text === undefined) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
};

// Application State
let currentStepIndex = 0;
const userAnswers = {};

/**
 * Initialize responses object based on question types
 */
function initResponses() {
    questions.forEach(question => {
        if (question.type === 'text') {
            userAnswers[question.id] = {};
            question.fields.forEach(f => userAnswers[question.id][f.key] = '');
        } else if (question.type === 'mradio' || question.type === 'grid') {
            userAnswers[question.id] = {};
            const items = question.groups || question.items;
            items.forEach(item => userAnswers[question.id][item.key || item.k] = null);
        } else if (question.type === 'checkbox') {
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
    if (currentQuestion.type === 'text') return currentQuestion.fields.every(f => (ans[f.key] || '').trim().length > 0);
    if (currentQuestion.type === 'mradio') return currentQuestion.groups.every(g => ans[g.key] !== null);
    if (currentQuestion.type === 'grid') return currentQuestion.items.every(i => ans[i.k] !== null);
    if (currentQuestion.type === 'checkbox') return ans.length > 0;
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
    const appEl = document.getElementById('app');
    
    // Initial structure or update existing one
    const cardExists = appEl.querySelector('.card');
    
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
    appEl.querySelector('.pgfill').style.width = `${progressPercent}%`;
    
    // Update Question Content
    const questionContainer = document.getElementById('question-container');
    questionContainer.innerHTML = renderQuestionHTML(currentQuestion);
    
    // Update Nav
    const navContainer = document.getElementById('nav-container');
    navContainer.innerHTML = `
        ${currentStepIndex > 0 ? '<button class="btnb" data-action="back">← Kembali</button>' : '<div></div>'}
        <button class="btnp" ${isStepComplete() ? '' : 'disabled'} data-action="next">
            ${currentStepIndex < totalQuestions - 1 ? 'Lanjut →' : 'Lihat Hasilku ✨'}
        </button>
    `;
    
    // Autofocus for text inputs
    const firstInput = appEl.querySelector('.inp');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
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
    
    if (q.type === 'text') {
        q.fields.forEach(f => {
            html += `<div class="igrp">
                <label class="ilabel">${esc(f.label)}</label>
                <input class="inp" data-qid="${q.id}" data-fkey="${f.key}" placeholder="${esc(f.ph)}" value="${esc(ans[f.key])}">
            </div>`;
        });
    } else if (q.type === 'mradio') {
        q.groups.forEach(g => {
            html += `<div class="qlabel">${esc(g.label)}</div>`;
            g.opts.forEach(o => {
                const isSelected = ans[g.key] === o.v;
                html += `<div class="opt${isSelected ? ' sel' : ''}" data-action="setMR" data-qid="${q.id}" data-gkey="${g.key}" data-val="${o.v}">
                    <div class="okey" style="width:10px;border:none"></div>
                    <div class="olabel">${esc(o.l)}</div>
                </div>`;
            });
        });
    } else if (q.type === 'mcq') {
        q.opts.forEach((o, i) => {
            let cls = 'opt';
            if (ans === o.v) cls += o.ok ? ' ok' : ' no';
            else if (ans && o.ok) cls += ' ok';
            
            html += `<div class="${cls}" data-action="setMCQ" data-qid="${q.id}" data-val="${o.v}">
                <div class="okey">${optionKeys[i]}</div>
                <div class="otxt">
                    <div class="olabel" style="${o.l.startsWith('=') ? 'font-family:monospace;font-size:13px' : ''}">${esc(o.l)}</div>
                    ${o.s ? `<div class="osub">${esc(o.s)}</div>` : ''}
                </div>
            </div>`;
        });
        if (!ans) html += `<div class="kbhint">Tekan A / B / C / D untuk memilih</div>`;
    } else if (q.type === 'grid') {
        html += `<div class="grid-wrap">`;
        q.items.forEach(item => {
            const currentVal = ans[item.k];
            html += `<div class="gitem">
                <div><div class="gfn">${esc(item.fn)}</div><div class="gdesc">${esc(item.d)}</div></div>
                <div class="gbtns">`;
            q.lvs.forEach(lv => {
                html += `<button class="gb${currentVal === lv.v ? ' g' + lv.v : ''}" data-action="setGrid" data-qid="${q.id}" data-ikey="${item.k}" data-val="${lv.v}">${esc(lv.l)}</button>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;
    } else if (q.type === 'checkbox') {
        q.opts.forEach(o => {
            const isSelected = ans.includes(o.v);
            html += `<div class="chk${isSelected ? ' sel' : ''}" data-action="togChk" data-qid="${q.id}" data-val="${o.v}">
                <div class="cbox">${isSelected ? '✓' : ''}</div>
                <div class="otxt">
                    <div class="olabel">${esc(o.l)}</div>
                    ${o.s ? `<div class="osub">${esc(o.s)}</div>` : ''}
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
    const appEl = document.getElementById('app');
    appEl.innerHTML = `<div class="card">
        <div class="header-bar"><div class="header-logo">📊</div><div><div class="header-title">Asesmen Awal Excel</div><div class="header-sub">Menganalisis profilmu...</div></div></div>
        <div class="pgbar"><div class="pgfill" style="width:100%"></div></div>
        <div style="display:flex;align-items:center;gap:10px;padding:2rem 0;color:#64748b;font-size:15px">
            <div class="dots"><span></span><span></span><span></span></div>Merekam data...
        </div>
    </div>`;
    
    const readinessAns = userAnswers.readiness;
    const vals = Object.values(readinessAns).filter(v => v !== null);
    const score = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 2)) * 100) : 0;
    
    await submitDataToSpreadsheet(userAnswers);

    const category = score >= 70 ? 'Mahir' : score >= 40 ? 'Siap Intermediate' : 'Pemula Terpandu';
    const badgeCls = category === 'Mahir' ? 'bm' : category === 'Siap Intermediate' ? 'bs' : 'bp';
    
    appEl.innerHTML = `
        <div class="card">
            <div class="header-bar"><div class="header-logo">✨</div><div><div class="header-title">Profil Kesiapanmu</div><div class="header-sub">Berdasarkan jawabanmu</div></div></div>
            <div class="pgbar"><div class="pgfill" style="width:100%"></div></div>
            <div class="qwrap">
                <div class="smeta">Hei ${esc(userAnswers.identity?.nama || 'kamu')}!</div>
                <div style="margin:.75rem 0"><span class="badge ${badgeCls}">${esc(category)}</span></div>
                <div class="rcard">
                    <div class="rhead"><div class="rlabel">Skor Readiness</div><div class="rval">${score}/100 — ${esc(category)}</div></div>
                    <div class="rbody">
                        <p>Data kamu berhasil direkam! Gurumu akan menganalisis hasilmu untuk menyesuaikan materi kelas.</p>
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
document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    
    const action = el.dataset.action;
    const { qid, val, fkey, gkey, ikey } = el.dataset;
    
    if (action === 'next') {
        if (isStepComplete()) {
            currentStepIndex++;
            render();
        }
    } else if (action === 'back') {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            render();
        }
    } else if (action === 'setMR') {
        userAnswers[qid][gkey] = val;
        render();
    } else if (action === 'setMCQ') {
        userAnswers[qid] = val;
        render();
    } else if (action === 'setGrid') {
        userAnswers[qid][ikey] = parseInt(val);
        render();
    } else if (action === 'togChk') {
        const arr = userAnswers[qid];
        const idx = arr.indexOf(val);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
        render();
    } else if (action === 'print') {
        window.print();
    } else if (action === 'reload') {
        window.location.reload();
    }
});

/**
 * Input Handling - Use event delegation for input but update state directly to avoid focus loss
 */
document.addEventListener('input', e => {
    const el = e.target.closest('.inp');
    if (!el) return;
    
    const { qid, fkey } = el.dataset;
    userAnswers[qid][fkey] = el.value;
    
    // update only the button state without full rerender
    const nextBtn = document.querySelector('[data-action="next"]');
    if (nextBtn) nextBtn.disabled = !isStepComplete();
});

// Keyboard Support
document.addEventListener('keydown', e => {
    if (currentStepIndex >= totalQuestions) return;
    const currentQuestion = questions[currentStepIndex];
    if (currentQuestion.type === 'mcq') {
        const keyMap = { a: 'a', b: 'b', c: 'c', d: 'd', A: 'a', B: 'b', C: 'c', D: 'd' };
        if (keyMap[e.key]) {
            userAnswers[currentQuestion.id] = keyMap[e.key];
            render();
        }
    }
    if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && isStepComplete()) {
        currentStepIndex++;
        render();
    }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initResponses();
    render();
});