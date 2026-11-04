# Pastabox POS – Receipt Printing (AppSheet) – Project Context

Paste this whole file to Claude to continue where we left off.

## About the app
- Owner: Nico, who runs the **Pastabox** restaurant (Gading Serpong, Karelia Village, Kab. Tangerang 15334, +62-851-7166-2126).
- POS app built in **AppSheet**. The editor app name is "Pastabox TRX". The internal app folder is `OnlineRestaurantSales-95579623`.
- Data is in Google Sheets. The default app folder in Drive is `appsheet/data/OnlineRestaurantSales-95579623/`.
- Cashier/employee shown on receipts: "MM" (currently hard-coded).

## Tables and columns (known so far)
**Sales** (parent / order table)
- `Order Number`, `Order Date`, `Customer Name`, `Total`, `Status`, `Notes`
- `Print Request` (real column, DateTime, initial value empty): set by the Request Receipt action to start the PDF bot
- `Related Sale Items`: the related list of item rows
- There is **no** `Subtotal` column.

**Sale Items** (child / item table; exact table name not confirmed)
- `Item` (a Ref to the menu/item table, so it shows an ID such as ITM-001), `Qty`, `Unit Price`, `Line Total`
- ⚠️ STILL UNKNOWN: the **name column of the menu/item table**. It's needed to show the item name instead of ITM-001 via `[Item].[<Name Column>]`.

## Two receipt methods

### Method A – PDF via an AppSheet bot (WORKING, needs internet)
- Action **Request Receipt** (Sales): "Data: set the values of some columns in this row" → `[Print Request] = NOW()`, display Prominent.
- Bot **Print Receipt Bot**:
  - Event "Click Print Receipt": Data change, table Sales, **Updates only**, condition
    `[_THISROW_BEFORE].[Print Request] <> [_THISROW_AFTER].[Print Request]`
  - Step **Create Receipt** (Create a new file): PDF, template = **Receipt_Template.docx** (Word template in Drive), folder `"Receipts"`, Disable Timestamp ON. Attachment page size Custom: **width 80 mm, height 250 mm**, margins: top 7, bottom 7, left 0, right 0 (pt).
  - File name prefix (unique per request, avoids showing an old saved copy):
    `[Order Number] & "-" & TEXT([Print Request], "YYYYMMDDHHMMSS")`
- To open the PDF in the app: a virtual column `Receipt PDF` (type **File**) or an action **Open Receipt** ("External: open a file"):
  `"Receipts/" & [Order Number] & "-" & TEXT([Print Request], "YYYYMMDDHHMMSS") & ".pdf"`
- PDFs are saved in `appsheet/data/OnlineRestaurantSales-95579623/Receipts/`.
- The Word template was fixed: page 80 × 250 mm, margins 0, outer table 80 mm wide, item table 2 columns (~57 mm + ~22 mm), top gap removed.
  - The template still uses `<<[Item]>>`, which prints ITM-001. Change it to `<<[Item].[<Name Column>]>>`.
  - Template tags: `<<[Order Number]>>`, `<<Start: [Related Sale Items]>>` … `<<[Item]>>`, `<<[Qty]>> x <<[Unit Price]>>`, `<<[Line Total]>>` … `<<End>>`, `<<TEXT([Order Date], "DD/MM/YYYY HH:MM")>>`
- Limits: slow (about 5–20 s plus a sync), no offline use, fixed page height. Kept for formal receipts and email.
- Lessons learned:
  - AppSheet converts the Doc/Docx to HTML. Page width, margins and fixed table widths carry over, and a wide page shifts and squeezes the content.
  - HTML templates in AppSheet must encode tags (`&lt;&lt;[Col]&gt;&gt;`), close every tag (`<br />`), and have Start/End inside the same table row. We switched back to the Word template.

### Method B – Instant HTML receipt page (IN SETUP, works offline) ← chosen for counter receipts
- Hosted on GitHub Pages. Account **NicoWilson94**, repository **pos-receipt** (public).
  URL: `https://nicowilson94.github.io/pos-receipt/receipt.html`
- Files in the repository: `receipt.html`, `sw.js` (offline cache, **VERSION "receipt-v2"**, saved copy first then refresh in the background; Nico chose NOT to use the later v3), `logo.png` (Pastabox logo taken from the Word template).
- Receipt layout (matches the Word format): logo → store name/address/phone centred → line → "Order No: …" centred → line → each item (name left, line total right, "qty x Rp price" underneath) → TOTAL (only if `tot=` is sent) → date centred at the bottom → optional footer.
- Data is passed after `#` in the URL (never sent to GitHub). Parameters: `s` store, `a` address, `p` phone, `logo`, `id` order no, `d` date text, `i` items, `tot` total, `f` footer, `w` 58|80, `auto` (1 = auto print).
  Item format: `qty|name|price , qty|name|price` (AppSheet list output).
- AppSheet setup (status: GitHub upload in progress; the steps below haven't been confirmed as done):
  1. Virtual column `Line` in Sale Items (Text):
     `ROUND([Qty]) & "|" & [Item].[<Name Column>] & "|" & ROUND([Unit Price])`
  2. Virtual column `Items Text` in Sales (Text): `CONCATENATE([Related Sale Items][Line])`
  3. Action **Print** (Sales, "External: go to a website", Prominent), target:
     ```
     "https://nicowilson94.github.io/pos-receipt/receipt.html#"
     & "logo=logo.png"
     & "&s=" & ENCODEURL("Pastabox - Gading Serpong")
     & "&a=" & ENCODEURL("Karelia Village, Kab. Tangerang 15334")
     & "&p=" & ENCODEURL("+62-851-7166-2126")
     & "&id=" & ENCODEURL([Order Number])
     & "&d=" & ENCODEURL(TEXT([Order Date], "DD/MM/YYYY HH:MM"))
     & "&i=" & ENCODEURL([Items Text])
     & "&tot=" & ROUND([Total])
     & "&w=80"
     ```
     Optional: run it from the Sales form under Behavior → Event actions → Form Saved.
  4. Tablet: Android + Bluetooth 80 mm thermal printer + the **RawBT** app (turn on its Android print service). Open the receipt once online so it's saved for offline use.
  5. AppSheet Settings → Offline mode: "The app can start when offline" + "Delayed sync".
- Updating: upload a file with the same name in GitHub (Add file → Upload files → Commit). Bump the VERSION in `sw.js` after changing receipt.html. Pages can take 1–3 min to publish, GitHub tells browsers to reuse old copies for about 10 min, and with v2 the first open after an update may still show the old layout (reopen it, or clear the site data in Chrome).

## Open items / next steps
1. Finish the GitHub upload and turn on Pages (Settings → Pages → Deploy from a branch → main / root). Test:
   `https://nicowilson94.github.io/pos-receipt/receipt.html#i=1|Carbonara|37000&tot=37000&logo=logo.png`
2. Tell Claude the item/menu table's **name column**, so ITM-001 can be replaced with the item name (in both the Word template and the `Line` formula).
3. Add the `Line` and `Items Text` virtual columns and the **Print** action, then test printing with RawBT, including offline (airplane mode with Bluetooth on).
4. Optional: dynamic PDF height (try an expression in Attachment Page Height: `120 + COUNT([Related Sale Items]) * 12`), QRIS code, kitchen ticket.
