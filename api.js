// api.js
// URL Web App dari Google Apps Script
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyC6spCPukjUDS6oljHMgxJQ7fymR9Sr53ihVX6wq-zCdKdDJamyPpn-QHYW56hUWmvnw/exec";

/**
 * Submit survey data to Google Sheets via Web App URL
 */
export async function submitDataToSpreadsheet(data) {
  try {
    const response = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Plain text to avoid CORS preflight in GAS
      }
    });
    return true;
  } catch (error) {
    console.error("Gagal mengirim data:", error);
    return false;
  }
}