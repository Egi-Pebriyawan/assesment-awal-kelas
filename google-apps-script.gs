/**
 * Google Apps Script untuk Excel Assessment Form
 * Template untuk menangani data dari Frontend dengan struktur baru
 *
 * Struktur Data Baru (setelah refactoring):
 * - access_perangkat: ARRAY (Checkbox) - pilih banyak
 * - access_software: OBJECT dengan key 'ver' - STRING (Radio)
 * - style_tujuan: ARRAY (Checkbox) - pilih banyak
 * - style_belajar: OBJECT dengan key 'gaya' - STRING (Radio)
 *
 * Dokumentasi: https://developers.google.com/apps-script/guides/sheets
 */

/**
 * Main handler untuk POST request dari Frontend
 * Deploy sebagai Web App dengan "Execute as" = akun Anda & akses "Anyone"
 */
function doPost(e) {
  try {
    // 1. Parse JSON payload dari Frontend
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    /**
     * 2. Helper Function: Convert Array ke String (untuk Checkbox data)
     * Input:  ["laptop", "hp"]
     * Output: "laptop, hp"
     */
    function handleArray(value) {
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return value || "";
    }

    /**
     * 3. Helper Function: Safely access nested objects
     * Misal: data.access_software?.ver atau data.identity?.nama
     */
    function safeGet(obj, key, defaultVal = "") {
      return obj?.[key] || defaultVal;
    }

    /**
     * 4. Map Frontend data ke Row di Spreadsheet
     * PENTING: Sesuaikan urutan kolom di bawah dengan struktur Sheet Anda!
     *
     * Expected Sheet Header Row:
     * [Timestamp, Nama, Kelas, Perangkat (checkbox), Software,
     *  SKOR KESIAPAN (0-100), SUM, AVERAGE, IF, VLOOKUP, Pivot, Quiz,
     *  Interest (checkbox), Tujuan Belajar (checkbox), Gaya Belajar,
     *  VARK Code, VARK Type]
     */
    const rowData = [
      new Date(), // Column A: Timestamp
      safeGet(data.identity, "nama"), // Column B: Nama Lengkap
      safeGet(data.identity, "kelas"), // Column C: Kelas
      handleArray(data.access_perangkat), // Column D: Perangkat (ARRAY → String)
      safeGet(data.access_software, "ver"), // Column E: Software (String)
      safeGet(data, "readinessScore"), // Column F: ⭐ Readiness Score (0-100) [NEW]
      safeGet(data.readiness, "sum"), // Column G: SUM Formula
      safeGet(data.readiness, "avg"), // Column H: AVERAGE Formula
      safeGet(data.readiness, "if"), // Column I: IF Formula
      safeGet(data.readiness, "vlookup"), // Column J: VLOOKUP Formula
      safeGet(data.readiness, "pivot"), // Column K: Pivot Table
      safeGet(data.quiz), // Column L: Quiz Answer
      handleArray(data.interest), // Column M: Interest Topics (ARRAY → String)
      handleArray(data.style_tujuan), // Column N: Tujuan Belajar (ARRAY → String)
      safeGet(data.style_belajar, "gaya"), // Column O: Gaya Belajar (String)
      safeGet(data.varkAnalysis, "vark_code"), // Column P: ⭐ VARK Code (V/A/R/K) [NEW]
      safeGet(data.varkAnalysis, "vark_type"), // Column Q: ⭐ VARK Type (Full name) [NEW]
    ];

    /**
     * 5. Append Row ke Spreadsheet
     */
    sheet.appendRow(rowData);

    /**
     * 6. Optional: Update timestamp di cell tertentu untuk tracking
     * (Uncomment jika perlu last submission time tracking)
     */
    // const lastRow = sheet.getLastRow();
    // sheet.getRange(lastRow, 1).setValue(new Date());

    /**
     * 7. Return Success Response ke Frontend
     */
    return ContentService.createTextOutput(
      JSON.stringify({
        result: "success",
        message: "Data berhasil disimpan!",
        timestamp: new Date().toISOString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    /**
     * Error Handling - Log & Return Error Response
     */
    Logger.log("Error di doPost:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        error: error.toString(),
        message: "Terjadi kesalahan saat menyimpan data",
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Optional: Test function untuk debug di Apps Script Editor
 * Run this untuk test struktur data
 * Menu: Run > Run function > testData
 */
function testData() {
  // Mock data sesuai struktur Frontend
  const mockPayload = JSON.stringify({
    identity: { nama: "Egi Pebriyawan", kelas: "XI IPS 2" },
    access_perangkat: ["laptop", "hp"], // ARRAY - Checkbox
    access_software: { ver: "ms" }, // STRING - Radio
    readiness: { sum: 2, avg: 1, if: 2, vlookup: 1, pivot: 0 },
    quiz: "b",
    interest: ["game", "finance"], // ARRAY - Checkbox
    style_tujuan: ["kuliah", "kerja"], // ARRAY - Checkbox
    style_belajar: { gaya: "video" }, // STRING - Radio
    // ⭐ NEW - Calculated by Frontend
    readinessScore: 75, // (50 * 0.7) + (100 * 0.3) = 65 → rounded
    varkAnalysis: {
      vark_code: "V",
      vark_type: "Visual",
      vark_full: "Pembelajaran Visual (Video, Diagram, Warna)",
    },
  });

  // Simulate e object
  const e = {
    postData: {
      contents: mockPayload,
    },
  };

  // Call doPost with test data
  const response = doPost(e);
  Logger.log("Response:", response.getContent());
}

/**
 * DEPLOYMENT STEPS:
 *
 * 1. Buka script.google.com atau dari Google Sheet (Tools > Script editor)
 * 2. Replace existing code dengan code ini
 * 3. Simpan (Ctrl+S)
 * 4. Click "Deploy" → "New Deployment"
 *    - Type: "Web app"
 *    - Execute as: [Akun Anda]
 *    - Who has access: "Anyone"
 * 5. Copy URL yang di-generate
 * 6. Paste ke api.js sebagai GOOGLE_SHEET_URL
 *
 * SPREADSHEET COLUMN STRUCTURE (17 columns):
 * A: Timestamp | B: Nama | C: Kelas | D: Perangkat | E: Software
 * F: SKOR KESIAPAN (0-100) ⭐ | G: SUM | H: AVG | I: IF | J: VLOOKUP | K: Pivot
 * L: Quiz | M: Interest | N: Tujuan | O: Gaya Belajar
 * P: VARK Code ⭐ | Q: VARK Type ⭐
 *
 * TESTING:
 * 1. Di Apps Script Editor, Run > testData() untuk test
 * 2. Buka Sheet, harus ada row baru dengan mock data
 * 3. Dari Frontend, submit form dan check Sheet untuk data baru
 *
 * TROUBLESHOOTING:
 * - Error 403? Pastikan deployment set ke "Anyone" dapat akses
 * - Data tidak muncul? Check Logger (View > Logs) untuk error messages
 * - Array jadi "[object Object]"? Gunakan handleArray() di semua checkbox fields
 * - Skor Kesiapan kosong? Pastikan frontend mengirim readinessScore
 * - VARK kosong? Pastikan frontend mengirim varkAnalysis object
 */
