// Marli's Complaint Box — Google Apps Script backend
// Deploy as a Web App: Execute as "Me", Access "Anyone"
// Paste the Web App URL into CONFIG.sheetsUrl in app.js

const SHEET_NAME = "complaints";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Sheet '" + SHEET_NAME + "' not found");
    sheet.appendRow([data.id, data.user, data.category, data.message, data.submittedAt]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Sheet '" + SHEET_NAME + "' not found");
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const headers = rows[0];
    const entries = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    return ContentService
      .createTextOutput(JSON.stringify(entries))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
