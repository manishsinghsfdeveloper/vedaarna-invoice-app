# Project Coding Rules (Non-Obvious Only)

## Critical Patterns
- **`formatDateForDisplay(isoDate)`** exported from `src/App.jsx` — must be used whenever rendering `invoiceMeta.date` in the preview/print. Raw ISO string must never appear on the invoice.
- **`numberToWords(amount)`** in `src/utils.js` — Indian system (lakh/crore). Import from utils, not inline.
- `currency()` inside `InvoicePreview.jsx` uses `toLocaleString("en-IN")` for tabular digit alignment — do not revert to `.toFixed(2)` which breaks GST compliance digit stacking.

## GST Toggle Architecture
- `customer.gstin` is the **owner's** GSTIN (set by the checkbox toggle). This field drives `hasOwnerGST` which controls header GSTIN display, CGST/SGST split, GST breakdown table, and "Tax Amount in words".
- `customer.recipientGstin` is the **customer's** GSTIN shown in "Bill To". Separate field, separate concern.

## InvoiceActions DOM Clone Rules
- All four export functions (`generatePDF`, `downloadBillImage`, `downloadInvoiceA5`, `whatsappShare`) clone the invoice node to `document.body` at `-9999px` before calling `html2canvas`.
- Image export sets `display: block` (NOT flex) on the clone to prevent scrollHeight inflation.
- PDF export needs `minHeight: 1123px` + `display: flex` to keep footer at A4 page bottom.
- Always `document.body.removeChild(clone)` after rendering — check existing functions before adding new ones.
- `buildA5PageNode` uses `.invoice-bill-to-section` selector — if this class is renamed the A5 export silently breaks.

## State Shape
```js
customer    = { name, phone, email, address, gstin, recipientGstin, advance }
invoiceMeta = { number, date }   // date is ISO "YYYY-MM-DD"
dispatchMeta = { shipTo, paymentMethod, refNo, buyerOrderNo, dispatchDocNo, dispatchThrough, destination, termsOfDelivery }
items       = [{ id, name, qty, rate, discount, tax }]
```
- `dispatchMeta` is a **separate top-level state object** in `App.jsx` — not nested inside `customer`.
- `handleAgentComplete` in `App.jsx` accepts `{ customer, items, dispatchMeta }` from the agent and calls `setDispatchMeta` explicitly.

## localStorage
Key `va_invoice_number` persists the current invoice number. On reset/download, call `nextInvoiceNumber()` from `App.jsx` (not ad-hoc string manipulation).
