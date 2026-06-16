/* ====================================================
   Marli's Complaint Box — shared logic
   ====================================================
   HOW TO CONFIGURE (read me!):

   1) PASSWORDS
      Set MARLI_PASSWORD and RAGHAV_PASSWORD below.
      NOTE: this is a plain client-side check, visible to
      anyone who views source. It is a fun "lock," not real
      security. Don't reuse a real password here.

   2) EMAIL (via EmailJS — https://www.emailjs.com, free tier)
      Currently wired with PLACEHOLDER values so the site
      runs end-to-end without crashing. Until you fill in
      real EmailJS credentials below, submissions are simply
      logged to the browser console and saved to localStorage
      (the Pareto page still works either way).

      To go live:
        a. Create a free EmailJS account.
        b. Add an Email Service (e.g. Gmail) -> get SERVICE_ID.
        c. Create two Email Templates (one for "to Raghav",
           one for "to Marli") -> get TEMPLATE_ID_TO_RAGHAV /
           TEMPLATE_ID_TO_MARLI. Each template just needs
           variables: {{from_user}} {{category}} {{message}}
           {{ticket_id}} {{submitted_at}}
        d. Get your PUBLIC_KEY from EmailJS account settings.
        e. Paste all 5 values into CONFIG.emailjs below.
        f. Set EMAILJS_ENABLED to true.
   ==================================================== */

const CONFIG = {
  passwords: {
    marli: "mnzi",
    raghav: "rnbw"
  },
  recipients: {
    raghavInbox: "raghav_naidu@hotmail.com",
    marliInbox: "spiralbots@gmail.com"
  },
  emailjs: {
    enabled: false, // flip to true once real EmailJS creds are filled in
    publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
    serviceId: "YOUR_EMAILJS_SERVICE_ID",
    templateToRaghav: "YOUR_TEMPLATE_ID_TO_RAGHAV",
    templateToMarli: "YOUR_TEMPLATE_ID_TO_MARLI"
  },
  // Paste your deployed Apps Script Web App URL here, then set enabled: true
  sheets: {
    enabled: true,
    url: "https://script.google.com/macros/s/AKfycbyZbvceqIqqfUVl5znYQ3SVTBGLuOLym77CNgt830Se3U3KC5yjT7Ty3PkB9YKB1GDmEg/exec"
  },
  storageKey: "complaintBox.entries.v1",
  sessionKey: "complaintBox.session.v1"
};

/* ---------- session / auth ---------- */

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(CONFIG.sessionKey) || "null");
  } catch (e) {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify({ user, at: Date.now() }));
}

function clearSession() {
  sessionStorage.removeItem(CONFIG.sessionKey);
}

function checkPassword(input) {
  if (input === CONFIG.passwords.marli) return "marli";
  if (input === CONFIG.passwords.raghav) return "raghav";
  return null;
}

/* ---------- storage (pareto data source) ---------- */

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
  } catch (e) {
    return [];
  }
}

function saveEntry(entry) {
  const entries = loadEntries();
  entries.push(entry);
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(entries));
  return entries.length;
}

function nextTicketId() {
  const n = loadEntries().length + 1;
  return "#" + String(n).padStart(4, "0");
}

/* ---------- email sending ---------- */

function loadEmailJsSdk() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
    s.onload = () => {
      try {
        window.emailjs.init(CONFIG.emailjs.publicKey);
        resolve();
      } catch (e) { reject(e); }
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Sends a complaint email. Resolves with { sent: boolean, simulated: boolean }.
 * Never throws — falls back to simulated/logged mode on any failure so the
 * UI flow (ticket stamp, etc.) always completes.
 */
async function sendComplaintEmail({ fromUser, toAddress, category, message, ticketId, submittedAt }) {
  const payload = { fromUser, toAddress, category, message, ticketId, submittedAt };

  if (!CONFIG.emailjs.enabled) {
    console.log("[Marli's Complaint Box] EmailJS disabled — simulated send:", payload);
    return { sent: false, simulated: true };
  }

  try {
    await loadEmailJsSdk();
    const templateId = fromUser === "marli" ? CONFIG.emailjs.templateToRaghav : CONFIG.emailjs.templateToMarli;
    await window.emailjs.send(CONFIG.emailjs.serviceId, templateId, {
      from_user: fromUser,
      to_email: toAddress,
      category: category,
      message: message,
      ticket_id: ticketId,
      submitted_at: submittedAt
    });
    return { sent: true, simulated: false };
  } catch (err) {
    console.warn("[Marli's Complaint Box] EmailJS send failed, falling back to simulated:", err);
    return { sent: false, simulated: true };
  }
}

/* ---------- Google Sheets sync ---------- */

/**
 * Posts a single entry to the Apps Script backend.
 * Silently no-ops if sheets.enabled is false.
 */
async function syncToSheets(entry) {
  if (!CONFIG.sheets.enabled || !CONFIG.sheets.url) return;
  try {
    await fetch(CONFIG.sheets.url, {
      method: "POST",
      body: JSON.stringify(entry)
    });
  } catch (err) {
    console.warn("[Complaint Box] Sheets sync failed (offline?):", err);
  }
}

/**
 * Fetches all entries from the shared Google Sheet.
 * Falls back to localStorage if sheets are disabled or unreachable.
 * Returns a promise that always resolves to an array.
 */
async function loadEntriesFromSheets() {
  if (!CONFIG.sheets.enabled || !CONFIG.sheets.url) return loadEntries();
  try {
    const res = await fetch(CONFIG.sheets.url);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return loadEntries();
  } catch (err) {
    console.warn("[Complaint Box] Could not reach Sheets, using localStorage:", err);
    return loadEntries();
  }
}

/* ---------- date bucket helpers (used by pareto page too) ---------- */

function isoDate(d) { return d.toISOString().slice(0, 10); }

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // ISO week, Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function bucketKey(dateObj, granularity) {
  const d = new Date(dateObj);
  if (granularity === "day") return isoDate(d);
  if (granularity === "week") return "Wk of " + isoDate(startOfWeek(d));
  if (granularity === "month") return d.toLocaleString(undefined, { year: "numeric", month: "short" });
  return isoDate(d);
}
