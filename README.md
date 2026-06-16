# marli's complaint box

Static site, ready for GitHub Pages. Folder: `marlis-complaint-box/` on the Desktop.

## Deploy
1. Create a GitHub repo, push this folder's contents to it.
2. Repo Settings → Pages → Source: deploy from branch `main`, folder `/ (root)`.
3. Site goes live at `https://<username>.github.io/<repo>/`.

## Configure before real use (edit `app.js`)
- **Passwords**: `CONFIG.passwords.marli` / `CONFIG.passwords.raghav`. Plain client-side check — visible in page source, not real security, just a fun lock.
- **Recipient emails**: `CONFIG.recipients.raghavInbox` / `marliInbox` — currently filler addresses.
- **Actual email sending**: currently simulated (logged to console + saved locally) so the site works end to end with zero setup. To send real emails, sign up for free at emailjs.com, create an email service + two templates (vars: `from_user`, `category`, `message`, `ticket_id`, `submitted_at`), fill in `CONFIG.emailjs` (publicKey/serviceId/templateToRaghav/templateToMarli), and set `enabled: true`.

## Data storage
Complaints are saved in the browser's `localStorage` (per-device, not synced across computers). The ledger (`/pareto/index.html`) reads from that to draw pareto charts by category, filterable by user and by day/week/month.

## Structure
- `index.html` — password gate + complaint form
- `pareto/index.html` — the ledger (pareto charts)
- `style.css`, `app.js` — shared styles/logic
