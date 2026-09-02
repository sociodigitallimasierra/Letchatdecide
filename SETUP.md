# Digital Vault — Setup (GitHub Pages + Google Sheets + Stripe)

## 1. GitHub Pages
1. Push this folder to a GitHub repo (e.g. `youruser/digital-vault`).
2. Repo → Settings → Pages → Source: `Deploy from branch` → Branch `main` / root.
3. Add file `.nojekyll` at root (already included if present; otherwise `New-Item .nojekyll`).

## 2. Google Sheets (products & sales)
1. Create a Google Sheet (any name).
2. Extensions → Apps Script → paste `apps-script/Code.gs` → Save → Deploy → New deployment → Type: Web app → Execute as: Me → Who has access: Anyone → Deploy → Copy the `https://script.google.com/macros/s/.../exec` URL.
3. The script auto-creates sheets `Products` and `Sales` with headers:
   - Products: `id,title,description,price,stock,image,fileUrl,stripeLink,active`
   - Sales: `id,date,productId,product,email,amount,currency,status,token,fileUrl`
4. Open `admin.html` → Settings → paste Sheet ID (from sheet URL) and Apps Script URL → Save. Or edit `js/config.js`.
5. Use Admin → Products to add items; they sync to the sheet.

Tip: `image` can be `./producto-ejemplo.png`, a full URL, or a Drive link. `fileUrl` should be a Drive share link with `Anyone with the link — Viewer` (or any direct download URL). `stripeLink` is optional.

## 3. Stripe Payment Links (USD)
1. Stripe Dashboard → Payments → Payment Links → New → set price in USD → Create link.
2. Paste link into product's `Stripe Link` field in Admin.
3. Buyer flow: Click Buy → opens Stripe link in new tab → after paying, returns to store and enters same email to unlock download + email copy (via Apps Script `MailApp`).

## 4. Admin
- URL: `admin.html`
- Default password: `admin123` — change in `js/config.js` → `adminPassword`.
- Panels: Products/Stock, Sales, Settings. Stock and prices update live (USD).

## 5. Local test
Just open `index.html` — no build step. Works offline via `localStorage` demo product (`producto-ejemplo.png`) until Sheets is configured.
