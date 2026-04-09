/**
 * ================================================================
 * api.js - Google Sheets Integration Module
 * ================================================================
 * Purpose: Handle all HTTP communication dengan Google Apps Script
 *          untuk mengirim data assessment ke Google Sheets
 *
 * Maintained By: Egi Pebriyawan
 * Last Updated: April 9, 2026
 * ================================================================
 */

/**
 * GOOGLE_SHEET_URL Configuration
 *
 * WHY UPLOAD KE GITHUB?
 * ❌ JANGAN pakai URL configuration di browser environment
 * ✅ BOLEH upload ke GitHub karena:
 *    - URL ini adalah PUBLIC Web App (tidak ada authentication key)
 *    - Siapa pun pun bisa trigger GAS Web App (by design)
 *    - Security: semua data dikirim via HTTPS (encrypted)
 *    - Tidak ada API key / secret token (only execution ID)
 *    - Per Google best practice: public endpoints aman untuk disimpan di repo
 *
 * SETUP ULANG (jika diperlukan):
 * 1. Google Apps Script Editor → Deployments
 * 2. Click "New Deployment" → Type: Web app
 * 3. Copy execution URL → Replace const di bawah
 * 4. Format: https://script.google.com/macros/s/[EXECUTION_ID]/exec
 *
 * PRODUCTION SECURITY:
 * - GAS Web App URL-nya tidak sensitive (tidak ada key/token)
 * - Tambahkan rate limiting di GAS jika diperlukan (future TODO)
 * - GAS automatically handles DDoS protection
 */
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyC6spCPukjUDS6oljHMgxJQ7fymR9Sr53ihVX6wq-zCdKdDJamyPpn-QHYW56hUWmvnw/exec";

/**
 * extractExecutionId(url)
 *
 * PURPOSE:
 *   Extract execution ID dari Google Apps Script URL untuk debugging
 *   Membantu verifikasi URL correctness
 *
 * PARAMETER:
 *   url (string): Full URL dari GAS Web App
 *              Contoh: "https://script.google.com/macros/s/ABC123xyz/exec"
 *
 * RETURNS:
 *   string: Execution ID (ABC123xyz)
 *           Atau "INVALID_URL" jika format salah
 *
 * USED BY:
 *   Development debugging (not used in production)
 *
 * EXAMPLE:
 *   const id = extractExecutionId(GOOGLE_SHEET_URL);
 *   console.log(`GAS Execution ID: ${id}`);
 */
function extractExecutionId(url) {
  const match = url.match(/\/s\/([^\/]+)\/exec/);
  return match ? match[1] : "INVALID_URL";
}

/**
 * validatePayload(data)
 *
 * PURPOSE:
 *   Validate assessment data sebelum dikirim ke GAS
 *   Mencegah partial/corrupted data sampai ke Google Sheets
 *
 * PARAMETER:
 *   data (object): userAnswers object dari app.js
 *                 Expected fields:
 *                 - identity {nama, kelas}
 *                 - readiness {sum, avg, if, vlookup, pivot}
 *                 - quiz (string: "a", "b", "c", atau "d")
 *                 - varkAnalysis {code, type}
 *                 - readinessScore (0-100)
 *
 * RETURNS:
 *   object: {
 *     valid: boolean,
 *     errors: string[] (jika ada masalah)
 *   }
 *
 * VALIDATION RULES:
 *   1. Data must be object (not null/undefined)
 *   2. Required fields must exist: identity, readiness, quiz
 *   3. Readiness score must be 0-100
 *   4. Quiz answer must be valid (a/b/c/d)
 *   5. VARK code harus V|A|R|K
 *
 * EXAMPLE:
 *   const validation = validatePayload(userAnswers);
 *   if (!validation.valid) {
 *     console.error("Validation errors:", validation.errors);
 *     return false;
 *   }
 */
function validatePayload(data) {
  const errors = [];

  // Check object validity
  if (!data || typeof data !== "object") {
    errors.push("Data harus berupa object");
    return { valid: false, errors };
  }

  // Check required fields
  if (!data.identity || !data.identity.nama) {
    errors.push("Field 'nama' (identity) required");
  }
  if (!data.readiness) {
    errors.push("Field 'readiness' required");
  }
  if (typeof data.quiz !== "string") {
    errors.push("Field 'quiz' must be string (a/b/c/d)");
  }

  // Validate readiness score range
  if (typeof data.readinessScore === "number" && (data.readinessScore < 0 || data.readinessScore > 100)) {
    errors.push(`Readiness score out of range: ${data.readinessScore} (expected 0-100)`);
  }

  // Validate VARK code
  if (data.varkAnalysis && !["V", "A", "R", "K"].includes(data.varkAnalysis.code)) {
    errors.push(`Invalid VARK code: ${data.varkAnalysis.code}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * formatPayloadForLogging(data)
 *
 * PURPOSE:
 *   Format assessment data untuk console logging (debugging)
 *   Membantu developer lihat exact data yang dikirim
 *
 * PARAMETER:
 *   data (object): userAnswers object
 *
 * RETURNS:
 *   string: Formatted summary dengan key fields
 *
 * EXAMPLE OUTPUT:
 *   "📊 Assessment Data:
 *    ├─ Nama: Ali Ahmad (Kelas: XI IPS 2)
 *    ├─ Readiness Score: 75/100
 *    ├─ Quiz Answer: b ✓
 *    ├─ VARK Style: V (Visual)
 *    └─ Devices: laptop, hp"
 *
 * USED BY:
 *   submitDataToSpreadsheet() untuk debug logging
 */
function formatPayloadForLogging(data) {
  try {
    const nama = data.identity?.nama || "N/A";
    const kelas = data.identity?.kelas || "N/A";
    const score = data.readinessScore || "N/A";
    const quiz = data.quiz || "N/A";
    const vark = data.varkAnalysis?.code || "?";
    const varkType = data.varkAnalysis?.type || "Unknown";
    const perangkat = Array.isArray(data.access_perangkat) ? data.access_perangkat.join(", ") : "N/A";

    return `📊 Assessment Data:\n` + `├─ Nama: ${nama} (Kelas: ${kelas})\n` + `├─ Readiness Score: ${score}/100\n` + `├─ Quiz Answer: ${quiz}\n` + `├─ VARK Style: ${vark} (${varkType})\n` + `└─ Devices: ${perangkat}`;
  } catch (error) {
    return "⚠️ Error formatting payload: " + error.message;
  }
}

/**
 * submitDataToSpreadsheet(data)
 *
 * PURPOSE:
 *   Main function untuk submit assessment data ke Google Sheets
 *   Dipanggil ketika user click "Lihat Hasilku" button di app.js
 *
 * PARAMETER:
 *   data (object): userAnswers object dari app.js
 *                 Contains all 8 questions answers + calculated scores
 *
 * RETURNS:
 *   Promise<boolean>:
 *   - true: Data successfully saved to Google Sheets
 *   - false: Error during submission (network, validation, GAS error)
 *
 * WORKFLOW:
 *   1. Validate payload (check all required fields)
 *   2. Log formatted data untuk debugging
 *   3. POST ke Google Apps Script Web App
 *   4. Parse response
 *   5. Handle success/error dengan user feedback
 *
 * ERROR HANDLING:
 *   - Validation Error: Log ke console + return false
 *   - Network Error: Catch block + return false
 *   - HTTP Error (non-200): Check response.ok + return false
 *   - GAS Error: Log GAS response text + return false
 *
 * NETWORK DETAILS:
 *   - Method: POST (to trigger GAS doPost handler)
 *   - Headers: "text/plain;charset=utf-8" (avoid CORS preflight)
 *   - Body: JSON.stringify(data) (serialized userAnswers)
 *   - Timeout: Browser default (~30 seconds)
 *   - CORS: Google Apps Script automatically handles
 *
 * CALL SITE:
 *   app.js → showResult() function → submitDataToSpreadsheet(userAnswers)
 *
 * FUTURE IMPROVEMENTS:
 *   - Add retry logic (3 times max)
 *   - Add progress bar untuk long uploads
 *   - Batch multiple submissions jika offline
 *
 * EXAMPLE:
 *   const success = await submitDataToSpreadsheet(userAnswers);
 *   if (success) {
 *     console.log("Data saved!");
 *   } else {
 *     console.log("Save failed - show retry button");
 *   }
 */
export async function submitDataToSpreadsheet(data) {
  // STEP 1: Validate data before sending
  // ====================================
  const validation = validatePayload(data);
  if (!validation.valid) {
    console.error("❌ Validation failed:", validation.errors);
    return false;
  }

  // STEP 2: Log formatted data untuk debugging
  // ==========================================
  console.log(formatPayloadForLogging(data));
  console.log(`Sending to GAS: ${GOOGLE_SHEET_URL}`);

  // STEP 3: Send POST request to Google Apps Script
  // ================================================
  try {
    const response = await fetch(GOOGLE_SHEET_URL, {
      method: "POST", // MUST be POST untuk trigger doPost(e) di GAS
      body: JSON.stringify(data), // Convert object to JSON string
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // text/plain untuk avoid CORS preflight
      },
      // Note: No timeout specified (uses browser default ~30s)
      // Note: No credentials specified (same-origin policy not applicable here)
    });

    // STEP 4: Check HTTP response status
    // ===================================
    if (!response.ok) {
      console.error(`❌ Server error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("GAS Error Response:", errorBody);
      return false;
    }

    // STEP 5: Parse success response
    // ==============================
    const result = await response.text();
    console.log("✅ Data berhasil dikirim ke Google Sheets:", result);
    console.log("🔗 Check Google Sheets untuk verifikasi data baru");
    return true;
  } catch (error) {
    // Network error (timeout, connection refused, CORS blocked, etc.)
    console.error("❌ Gagal mengirim data:", error.message);
    console.error("Error Type:", error.name);

    // Help developer debug network issues
    if (error.message.includes("Failed to fetch")) {
      console.error(
        "🔍 Debugging tips:\n" +
          "1. Check internet connection\n" +
          "2. Verify GOOGLE_SHEET_URL in api.js\n" +
          "3. Verify GAS Web App is deployed (Apps Script → Deployments)\n" +
          "4. Check browser console for CORS errors\n" +
          "5. Try opening GAS URL directly in browser",
      );
    }

    return false;
  }
}
