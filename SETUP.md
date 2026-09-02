# Let the chat decide — Setup (GitHub Pages + Google Sheets + PayPal)

## 1. GitHub Pages
1. Push this folder to GitHub repo `sociodigitallimasierra/Letchatdecide`.
2. Settings → Pages → Source: Deploy from branch → `main` / root.
3. `.nojekyll` already included.

## 2. Google Sheets (products & sales)
1. Create a Google Sheet.
2. Extensions → Apps Script → paste `apps-script/Code.gs` → Save → Deploy → Web app → Execute as Me → Who has access: Anyone → Copy `.../exec` URL.
3. Auto-creates sheets:
   - Products: `id,title,description,price,stock,image,fileUrl,paypalLink,active`
   - Sales: `id,date,productId,product,email,amount,currency,status,token,fileUrl`
4. Open `manage.html` → Settings → paste Sheet ID + Apps Script URL → Save.
5. Manage → Products → add items; they sync to sheet.

Tip: `image` can be `./images/pinceles.png`, `https://...` or `images/...`. `fileUrl` = Drive link (Anyone with the link). `paypalLink` must include `&custom=PRODUCT_ID` for IPN auto-verify.

## 3. PayPal (USD) + IPN auto-delivery
1. PayPal Business → Create payment link/button per product: amount in USD, add `custom` = product `id` (e.g. `prod_001`).
2. Paste link into product's `PayPal Link` field.
3. Enable IPN: PayPal → Settings → IPN → IPN URL = your Apps Script `.../exec` → Enable.
4. Buyer flow: Choose → Enter email → Continue to PayPal → Pay → IPN VERIFIED → Apps Script decrements stock, saves sale, emails `fileUrl` to payer_email (no on-screen download exposed).

Without IPN: buyer still enters email before PayPal; sale is saved as pending_paypal and you can manually verify.

## 4. Admin
- URL: `manage.html` (hidden, not linked from store)
- Password: `cga4233Qwee` → change in `js/config.js`
- Panels: Products/Stock, Sales, Settings, GitHub image storage.
- GitHub image upload: Settings → paste `owner/repo`, `main`, `images`, PAT (classic, `repo` scope) → in product modal use `Upload image to GitHub repo`.

## 5. Images
- Store: `logo.png` (1536x1024), `web-wallpaper.png`, `producto-ejemplo.png` at root, `images/pinceles.png`. Keep uploads <500KB for fast load.
- Fix: if image fails, falls back to `producto-ejemplo.png`.

## 6. Local test
Open `index.html` — no build. Works offline via localStorage until Sheets configured. Store now keeps local stock (no auto-overwrite from Sheets) to avoid stock mismatch.
