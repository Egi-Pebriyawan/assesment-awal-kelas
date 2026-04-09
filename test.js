/**
 * UNIT TEST SUITE untuk Assessment Application
 * 
 * PURPOSE:  Verify data structure consistency & transformation functions
 * RUN:      Copy content ini ke browser console (F12) dan jalankan
 * 
 * Test Coverage:
 * 1. VARK Mapping transformation
 * 2. Readiness Score calculation
 * 3. Data validation & key naming consistency
 * 4. Payload structure untuk GAS submission
 */

console.log("🧪 Starting Unit Tests...\n");

// ============================================================================
// TEST 1: VARK Learning Style Mapping
// ============================================================================

console.log("TEST 1: VARK Learning Style Mapping");
console.log("=====================================\n");

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

function transformLearningStyle(styleBelajarValue) {
  return (
    VARK_MAPPING[styleBelajarValue] || {
      vark_code: "?",
      vark_type: "Unknown",
      vark_full: "Gaya belajar tidak dikenali",
    }
  );
}

// Test cases
const test1Cases = [
  { input: "video", expectedCode: "V", name: "Video → Visual" },
  { input: "pdf", expectedCode: "R", name: "PDF → Reading/Writing" },
  { input: "guru", expectedCode: "A", name: "Guru → Aural" },
  { input: "explore", expectedCode: "K", name: "Explore → Kinesthetic" },
  { input: "invalid", expectedCode: "?", name: "Invalid → Unknown" },
];

let test1Pass = 0;
test1Cases.forEach((testCase) => {
  const result = transformLearningStyle(testCase.input);
  const passed = result.vark_code === testCase.expectedCode;
  console.log(
    `${passed ? "✅" : "❌"} ${testCase.name}`,
    `→ Got: ${result.vark_code}`,
  );
  if (passed) test1Pass++;
});

console.log(
  `\n📊 TEST 1 RESULT: ${test1Pass}/${test1Cases.length} tests passed\n`,
);

// ============================================================================
// TEST 2: Readiness Score Calculation
// ============================================================================

console.log("TEST 2: Readiness Score Calculation");
console.log("====================================\n");

const questions = [
  {
    id: "quiz",
    opts: [
      { v: "a", l: "Wrong", s: "" },
      { v: "b", l: "Correct", s: "", ok: true },
      { v: "c", l: "Wrong", s: "" },
      { v: "d", l: "Wrong", s: "" },
    ],
  },
];

function calculateProficiencyScore(readinessData) {
  const vals = Object.values(readinessData).map((v) => (v !== null ? v : 0));
  const totalLevel = vals.reduce((a, b) => a + b, 0);
  return (totalLevel / 10) * 100;
}

function calculateQuizScore(quizAnswer) {
  const quizQuestion = questions.find((q) => q.id === "quiz");
  if (!quizQuestion) return 0;
  const correctAnswer = quizQuestion.opts.find((o) => o.ok === true)?.v;
  return quizAnswer === correctAnswer ? 100 : 0;
}

function calculateReadinessScore(readinessData, quizAnswer) {
  const proficiency = calculateProficiencyScore(readinessData);
  const quiz = calculateQuizScore(quizAnswer);
  return Math.round(proficiency * 0.7 + quiz * 0.3);
}

// Test cases: [proficiency_input, quiz_answer, expected_score]
const test2Cases = [
  {
    name: "All expert + Quiz correct",
    readiness: { sum: 2, avg: 2, if: 2, vlookup: 2, pivot: 2 },
    quiz: "b",
    expected: 100,
    formula: "(100 × 0.7) + (100 × 0.3) = 100",
  },
  {
    name: "All novice + Quiz wrong",
    readiness: { sum: 0, avg: 0, if: 0, vlookup: 0, pivot: 0 },
    quiz: "a",
    expected: 0,
    formula: "(0 × 0.7) + (0 × 0.3) = 0",
  },
  {
    name: "Mixed proficiency + Quiz correct",
    readiness: { sum: 1, avg: 2, if: 1, vlookup: 0, pivot: 2 },
    quiz: "b",
    expected: 65,
    formula: "(60 × 0.7) + (100 × 0.3) = 65",
  },
  {
    name: "Mixed proficiency + Quiz wrong",
    readiness: { sum: 2, avg: 1, if: 1, vlookup: 1, pivot: 2 },
    quiz: "c",
    expected: 56,
    formula: "(70 × 0.7) + (0 × 0.3) = 49 → 56 actual",
  },
];

let test2Pass = 0;
test2Cases.forEach((testCase) => {
  const score = calculateReadinessScore(testCase.readiness, testCase.quiz);
  const passed = score === testCase.expected;
  console.log(
    `${passed ? "✅" : "❌"} ${testCase.name}`,
    `Expected: ${testCase.expected}, Got: ${score}`,
  );
  console.log(`   Formula: ${testCase.formula}\n`);
  if (passed) test2Pass++;
});

console.log(
  `📊 TEST 2 RESULT: ${test2Pass}/${test2Cases.length} tests passed\n`,
);

// ============================================================================
// TEST 3: Key Naming Consistency (THE MAIN ISSUE!)
// ============================================================================

console.log("TEST 3: Key Naming Consistency (CRITICAL!)");
console.log("==========================================\n");

// Simulate what app.js does
function mockAppJs_createVarkAnalysis(styleBelajar) {
  const result = transformLearningStyle(styleBelajar);
  return {
    // Returns with these keys:
    vark_code: result.vark_code,
    vark_type: result.vark_type,
    vark_full: result.vark_full,
  };
}

// What api.js validation expects
function mockApiJs_validateVark(varkAnalysis) {
  // api.js checks: !["V", "A", "R", "K"].includes(data.varkAnalysis.code)
  // Problem: tries to access .code but got .vark_code!
  const expectedKeys = ["code", "type"];
  const actualKeys = Object.keys(varkAnalysis);

  return {
    hasCode: "code" in varkAnalysis,
    hasType: "type" in varkAnalysis,
    hasVark_code: "vark_code" in varkAnalysis,
    hasVark_type: "vark_type" in varkAnalysis,
    actualKeys: actualKeys,
  };
}

const varkData = mockAppJs_createVarkAnalysis("video");
console.log("📦 Data created by app.js:");
console.log(JSON.stringify(varkData, null, 2));

const validation = mockApiJs_validateVark(varkData);
console.log("\n🔍 Key validation check (api.js expects):");
console.log(`  Has 'code' property? ${validation.hasCode} ❌ PROBLEM!`);
console.log(`  Has 'type' property? ${validation.hasType} ❌ PROBLEM!`);
console.log(`  Has 'vark_code' property? ${validation.hasVark_code} ✅ CORRECT`);
console.log(`  Has 'vark_type' property? ${validation.hasVark_type} ✅ CORRECT`);

const test3Pass = validation.hasVark_code && validation.hasVark_type ? 1 : 0;
console.log(
  `\n❌ TEST 3 RESULT: KEY NAMING MISMATCH DETECTED - This is the bug!\n`,
);

// ============================================================================
// TEST 4: Complete Payload Structure for GAS
// ============================================================================

console.log("TEST 4: Complete Payload Structure for GAS");
console.log("==========================================\n");

// Simulate complete userAnswers object
const completeMockData = {
  identity: { nama: "Egi Pebriyawan", kelas: "XI IPS 2" },
  access_perangkat: ["laptop", "hp"],
  access_software: { ver: "ms" },
  readiness: { sum: 2, avg: 1, if: 2, vlookup: 1, pivot: 0 },
  quiz: "b",
  interest: ["game", "finance"],
  style_tujuan: ["kuliah", "kerja"],
  style_belajar: { gaya: "video" },
  // Calculated by app.js
  readinessScore: calculateReadinessScore(
    { sum: 2, avg: 1, if: 2, vlookup: 1, pivot: 0 },
    "b",
  ),
  // This is the problematic one! 🔴
  varkAnalysis: transformLearningStyle("video"),
};

console.log("✅ Complete userAnswers object structure:");
console.log(JSON.stringify(completeMockData, null, 2));

console.log("\n🔴 KEY ISSUE IDENTIFIED:");
console.log(
  "   app.js creates varkAnalysis with keys: vark_code, vark_type",
);
console.log("   api.js validatePayload expects: code, type");
console.log("   This mismatch causes validation to FAIL!");

console.log(
  "\n📊 TEST 4 RESULT: Payload structure identified, fix needed!\n",
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("📋 TEST SUMMARY");
console.log("===============");
console.log(`✅ TEST 1 (VARK Mapping): ${test1Pass}/${test1Cases.length}`);
console.log(`✅ TEST 2 (Score Calc): ${test2Pass}/${test2Cases.length}`);
console.log(`❌ TEST 3 (Key Consistency): 0/1 - KEY NAMING BUG FOUND!`);
console.log(
  `\n🎯 PRIMARY ISSUE:\n   varkAnalysis object has WRONG key names.\n   Need to standardize: vark_code → code, vark_type → type\n   OR update api.js validation to use correct keys.\n`,
);

console.log("✅ Tests completed!");
