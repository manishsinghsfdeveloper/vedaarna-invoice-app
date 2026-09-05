# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- React 18 + Vite 4, no TypeScript, no test framework
- PDF/image export: `html2canvas` + `jsPDF`
- Email: `@emailjs/browser` (credentials in `InvoiceActions.jsx` — currently placeholder strings)
- Deploy: GitHub Pages via `gh-pages` (`npm run deploy`)

## Commands
```
npm run dev       # local dev server
npm run build     # production build → dist/
npm run deploy    # build + push to gh-pages branch
```
No lint or test scripts exist in this project.

## Invoice Number Format
Format is `VS/NN/YY-YY` (e.g. `VS/01/26-27`). Sequence is persisted in `localStorage` key `va_invoice_number`. `getCurrentFinancialYear()` in `App.jsx` computes the FY suffix (starts April).

## Date Handling
- The `<input type="date">` stores ISO `YYYY-MM-DD` in state.
- `formatDateForDisplay()` (exported from `App.jsx`) converts to `DD-MM-YYYY` for all rendered/printed output. **Always use this helper in the preview — never render the raw ISO string.**

## GST Logic
- Toggling "Add GST (VedAarna Studio)" sets `customer.gstin = OWNER_GSTIN` and shows the GSTIN in the invoice header (not in a "Payable To" box — that section was removed).
- `hasOwnerGST` guards all GST-specific UI: CGST/SGST split, GST breakdown table, "Tax Amount in words".
- Tax auto-sets to 5% on new items when `isValidGST` is true.
- `customer.recipientGstin` is the **customer's** GSTIN/UIN displayed in "Bill To"; defaults to `N/A` if blank.

## Number-to-Words
`numberToWords(amount)` is in `src/utils.js` — Indian numbering (lakh/crore). Import from there.

## Currency Formatting
Use `toLocaleString("en-IN", { minimumFractionDigits: 2 })` for all printed amounts (tabular alignment). The local `currency()` helper in `InvoicePreview.jsx` already does this.

## State Shapes (top-level in `App.jsx`)
```js
customer     = { name, phone, email, address, gstin, recipientGstin, advance }
invoiceMeta  = { number, date }        // date is ISO "YYYY-MM-DD"
dispatchMeta = { shipTo, paymentMethod, refNo, buyerOrderNo,
                 dispatchDocNo, dispatchThrough, destination, termsOfDelivery }
items        = [{ id, name, qty, rate, discount, tax }]
```
- `dispatchMeta` is separate from `customer` — both passed as distinct props to `InvoicePreview` and `InvoiceForm`.
- `handleAgentComplete` in `App.jsx` accepts `{ customer, items, dispatchMeta }` from `InvoiceAgent` and calls `setDispatchMeta`.

## PDF/Image Generation (`InvoiceActions.jsx`)
- All download functions clone the live DOM node off-screen before rendering with `html2canvas`.
- `buildA5PageNode` uses `.invoice-bill-to-section` (not `.invoice-header-section`) to show/hide the Bill To block per page.
- A4 PDF uses `minHeight: 1123px` on the clone to fill one page; Image export does NOT (to avoid blank space below footer).
- The `downloadFnRef` ref pattern exposes download functions to `InvoiceAgent` — always register all four functions inside the `useEffect` in `InvoiceActions`.

## Key CSS Classes (don't rename without updating JS selectors)
| Class | Used in JS |
|---|---|
| `.invoice-bill-to-section` | `buildA5PageNode`, PDF clone |
| `.invoice-print-footer` | image crop measurement |
| `.invoice-totals` | A5 pagination show/hide |
| `.invoice-table-row` | A5 item slicing |
| `.remove-btn`, `.remove-tooltip` | stripped from all clones |

## Numeric Alignment (GST compliance)
All monetary columns use `.col-num` class which sets `font-variant-numeric: tabular-nums` and `text-align: right`. The `.invoice-totals` block also has these rules. Do not remove them.
