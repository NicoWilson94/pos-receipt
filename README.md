# Pastabox POS – Receipt Page

A small web page that prints counter receipts for the **Pastabox** AppSheet POS on a thermal printer. It works offline after the first visit.

- **Live page:** `https://nicowilson94.github.io/pos-receipt/receipt.html`
- **Store:** Pastabox – Gading Serpong · Karelia Village, Kab. Tangerang 15334 · +62-851-7166-2126
- **App:** AppSheet POS (data model v2) on a Google Sheet with `SET_` (settings) and `TRX_` (transaction) tabs

Order data is passed in the link **after `#`**. Browsers never send that part to the server, so order data never reaches GitHub. Only the layout is public.

---

## Files

| File | Purpose |
|---|---|
| `receipt.html` | Layout and logic. Reads the link, builds the receipt, sets the paper size, opens the print dialog |
| `sw.js` | Offline cache. Serves the saved copy first, then refreshes it in the background. **Current VERSION: `receipt-v8`** |
| `logo.png` | Pastabox logo, trimmed with no empty margin (336 × 178 px) |

## Receipt layout

```
            [ PASTABOX logo ]
        Pastabox - Gading Serpong
  Karelia Village, Kab. Tangerang 15334
           +62-851-7166-2126
----------------------------------------
                GF-512                    <- big, bold order number
            GrabFood · Nico               <- platform · customer (· Group)
----------------------------------------
╔══════════════════════════════════════╗
║            CATATAN ORDER             ║  <- order note: top, double box
║            Antar ke lobby            ║
╚══════════════════════════════════════╝
2x Butter Lemon Reguler          110.000  <- qty + dish, dish total incl. add-ons
  Pasta: Spaghetti
  + 2x Fried Mushroom                     <- add-ons, no price
  Cutlery: Yes
  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
    Note: less spicy                      <- dish note: under the dish, dashed box
  └ ─ ─ ─ ─ ─ ─ ─ ─ ┘
1x Es Teh Manis                    8.000
----------------------------------------
TOTAL                         Rp 118.000
            9 Nov 2026 13:30
```

Notes use **boxes and bold text**, not colour, because thermal printers only print black. The **order note** (catatan) sits at the top in a thick double box with a "CATATAN ORDER" heading. A **dish note** sits under its dish in a thin dashed box.

## Link parameters

| Param | Meaning | Example |
|---|---|---|
| `logo` | Logo file | `logo.png` |
| `s` / `a` / `p` | Store name / address / phone | |
| `id` | Order number (printed big) | `GF-512` |
| `plat` | Platform | `GrabFood` |
| `t` | Customer name | `Nico` |
| `ot` | Order type, sent only for group orders | `Group` |
| `d` | Date text | `9 Nov 2026 13:30` |
| `i` | Items (see format below) **required** | |
| `n` | Order note / catatan | `Antar ke lobby` |
| `tot` | Total | `118000` |
| `f` | Footer text (optional) | `Terima kasih!` |
| `w` | Paper width `58` (default) or `80` | `80` |
| `auto` | `1` = open the print dialog automatically (default), `0` = don't | |
| `cur` | Currency prefix (default `Rp`) | |

### Item format (`i`)

Items are joined with ` , ` (AppSheet list output). Each item:

```
qty|Dish name~detail~detail|unitPrice|itemTotal
```

- `~` separates detail lines printed under the dish (Pasta, add-ons, Cutlery, For, Note).
- A detail starting with `Note:` is printed in the highlight box.
- An add-on detail may end with `^amount` (e.g. `+ 2x Fried Mushroom^46000`). The amount is **not printed**, because the dish total already includes it.
- `itemTotal` (4th field) is the dish total including add-ons. Old 3-field lines (`qty|name|price`) still work; their total is qty × price.

Example:
```
2|Butter Lemon Reguler~Pasta: Spaghetti~+ 2x Fried Mushroom^46000~Cutlery: Yes~Note: less spicy|32000|110000 , 1|Es Teh Manis|8000|8000
```

---

## AppSheet setup

Table names are the app's table names (`TRX_Sales`, `TRX_Sale Items`, `TRX_Sale Item Addons`). Use the exact `Related …` column names from your app.

**1. `TRX_Sale Item Addons` → virtual column `Receipt Text`** (Text)
```
"~+ " & IF([Qty] * [LineID].[Qty] > 1, ROUND([Qty] * [LineID].[Qty]) & "x ", "") & [Item].[Item Name] & "^" & ROUND([Line Total] * [LineID].[Qty])
```
Add-ons are **per dish** (Qty usually 1) and are multiplied by the dish quantity.

**2. `TRX_Sale Items` → virtual column `Item Total`** (Price). This is the live dish total and is always correct, even before a sync:
```
[Qty] * ([Unit Price] + [Addons Total])
```
where `Addons Total = SUM([Related TRX_Sale Item Addons][Line Total])`.

**3. `TRX_Sale Items` → virtual column `Line`** (Text)
```
ROUND([Qty]) & "|" & [Item].[Item Name]
& IF(ISNOTBLANK([Pasta Type]), "~Pasta: " & [Pasta Type].[Pasta Name], "")
& SUBSTITUTE(CONCATENATE([Related TRX_Sale Item Addons][Receipt Text]), " , ", "")
& IF([Item].[Category].[Ask Cutlery], "~Cutlery: " & [Cutlery], "")
& IF(ISNOTBLANK([For]), "~For: " & [For], "")
& IF(ISNOTBLANK([Note]), "~Note: " & [Note], "")
& "|" & ROUND([Unit Price]) & "|" & ROUND([Item Total])
```

**4. `TRX_Sales` → virtual column `Print Text`** (LongText)
```
CONCATENATE([Related TRX_Sale Items][Line])
```

**5. Action `Print`** (For: TRX_Sales · External: go to a website · Prominent · Launch External OFF)
```
"https://nicowilson94.github.io/pos-receipt/receipt.html#"
& "logo=logo.png"
& "&s=" & ENCODEURL("Pastabox - Gading Serpong")
& "&a=" & ENCODEURL("Karelia Village, Kab. Tangerang 15334")
& "&p=" & ENCODEURL("+62-851-7166-2126")
& "&id=" & ENCODEURL([Order Number])
& "&plat=" & ENCODEURL([Platform].[Platform Name])
& IF([Order Type] = "Group", "&ot=Group", "")
& IF(ISNOTBLANK([Customer Name]), "&t=" & ENCODEURL([Customer Name]), "")
& "&d=" & ENCODEURL(TEXT([Order Date], "D MMM YYYY HH:MM"))
& "&i=" & ENCODEURL([Print Text])
& IF(ISNOTBLANK([Notes]), "&n=" & ENCODEURL([Notes]), "")
& "&tot=" & ROUND([Net Total])
& "&w=80"
```
- **Only if:** `AND(NOT([Refund Status]), ISNOTBLANK([Print Text]))`
- **Optional auto-print:** View `New Sale` → Event actions → Form Saved → Print
- Use `&w=58` for 58 mm paper.

---

## Printing and offline use

- **Tablet:** Android + Bluetooth thermal printer + the **RawBT** app (turn on its Android print service). In the print dialog choose RawBT, set the paper to 80 mm (or smallest) and margins to None.
- **AppSheet:** Settings → Offline mode → "The app can start when offline" + "Delayed sync". Open the app from the AppSheet app (Play Store), not a Chrome link.
- **First use:** open one receipt **while online** so the page is saved for offline use.
- **Offline test:** airplane mode with Bluetooth on → new order → Print.
- **Windows laptop:** a Chrome shortcut with `--kiosk-printing` and the thermal printer as the default printer skips the dialog.

## Updating the page

1. Repo → **Add file → Upload files** → upload the changed file(s) with the same name → **Commit changes**.
2. After changing `receipt.html` or `logo.png`, **bump `VERSION` in `sw.js`** (e.g. `receipt-v7` → `receipt-v8`) and upload `sw.js` too.
3. Wait 1–3 minutes for GitHub Pages to publish.
4. On each device, open a receipt online, close it, and open it again. The first open still shows the saved copy.
   If it's still old: Chrome → Site settings → `nicowilson94.github.io` → Clear & reset (laptop: Ctrl + Shift + R).

**Quick test link:**
`https://nicowilson94.github.io/pos-receipt/receipt.html#i=2|Carbonara~Pasta: Spaghetti~Note: less spicy|34000|68000&tot=68000&id=TEST-1&plat=GrabFood&t=Nico&logo=logo.png&w=80&auto=0`

## Troubleshooting

| Problem | Fix |
|---|---|
| "No receipt data in the link" | `Print Text` is empty. Check the `Line` formula |
| Raw `~` / `^` / `\|` shown on the receipt | The device still has the old page. Reopen it or clear the site data (see Updating) |
| Dish total misses add-ons | `Line` must end with `ROUND([Item Total])`, not `[Line Total]` |
| Add-on counted only once for 2 dishes | Add-on Qty must be per dish (1). `Receipt Text` multiplies it by `[LineID].[Qty]` |
| Prints on A4 / tiny receipt in a corner | Print dialog: printer RawBT or thermal, paper 80 mm, margins None |
| Logo missing | File must be exactly `logo.png` (lowercase) |
| Marks on the paper | The RawBT free version adds them. Buy the licence |

## Change log

| Version | Change |
|---|---|
| v8 | Order note moved to the top in a double box with a heading; dish note in a dashed box |
| v7 | Logo trimmed (no empty margin) |
| v6 | Big bold order number; platform · customer on one line; smaller gap under the logo |
| v5 | Dish notes and catatan highlighted (bold, boxed) |
| v4 | `2x Dish` format, removed the "qty x Rp price" line, add-ons without price |
| v3 | Data model v2: pasta, add-ons, cutlery, For, catatan, platform, customer |
| v2 | Offline cache, exact paper size |
