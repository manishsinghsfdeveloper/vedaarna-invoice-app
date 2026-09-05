# Project Architecture Rules (Non-Obvious Only)

## Data Flow
```
App.jsx (state owner)
  ├── InvoiceForm.jsx     — user input → calls setCustomer / setInvoiceMeta / addItem
  ├── InvoicePreview.jsx  — renders live DOM node (invoiceRef) + calls setItems for deletions
  ├── InvoiceActions.jsx  — reads invoiceRef.current DOM, clones it for html2canvas
  └── InvoiceAgent.jsx    — AI chat, calls downloadFnRef.current.{generatePDF,…} to trigger downloads
```

## Hidden Coupling
- `InvoiceActions` reads the **live rendered DOM** (not state) via `invoiceRef`. Layout changes in `InvoicePreview.jsx` directly affect PDF/image output — CSS class renames silently break export.
- `downloadFnRef.current` is populated inside `InvoiceActions`'s `useEffect` with no dependency array — it re-registers on every render. This is intentional so closures always capture latest state.
- `onInvoiceSent` callback (passed App→Form→Actions) increments the invoice number in localStorage after PDF save. Calling `generatePDF(false)` (upload-only mode) intentionally skips this increment.

## Financial Year Logic
`getCurrentFinancialYear()` in `App.jsx` determines the FY suffix (e.g. `26-27`). FY starts April 1. If an invoice is created in Jan–Mar it gets the *previous* year's FY. This is correct Indian fiscal year behaviour.

## Print/Export Architecture
- A4 PDF: single full-canvas image split into 297mm pages — no real pagination, just canvas slicing.
- A5 PDF: genuine pagination — `buildA5PageNode` creates one clone per page with a slice of 7 rows max. Bill To shown only on page 1; Totals and Footer shown only on last page.
- Image: measures actual footer bottom via `getBoundingClientRect` then crops canvas to that height — eliminates blank white space below footer.

## Constraints
- No state management library — prop-drilling all the way; adding a store would require threading through `App.jsx`.
- No routing — single-page, no URL state.
- `items` array IDs use `crypto.randomUUID()` with a `Date.now()` fallback — IDs are client-only, never sent to a backend.
