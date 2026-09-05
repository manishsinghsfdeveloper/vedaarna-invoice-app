# Project Documentation Rules (Non-Obvious Only)

## Code Organization Gotchas
- `formatDateForDisplay` is exported from `src/App.jsx` (the root component), not from `src/utils.js`. This is non-standard — utilities are split between `App.jsx` and `utils.js`.
- The "Add GST" checkbox does NOT add a customer GSTIN — it sets the *owner's* GSTIN (`06ABCFV1239R1ZP`) onto `customer.gstin`. The customer's own GSTIN is `customer.recipientGstin`.
- There is no "Payable To" box in the current invoice — it was replaced by a Declaration + Bank Details row at the bottom.

## Key File Purposes
- `src/utils.js`: `currency()` (unused in preview — preview has its own), `numberToWords()` (Indian system)
- `src/components/InvoiceActions.jsx`: All PDF/image/email/WhatsApp export logic; also registers download functions into `downloadFnRef` for the AI agent
- `src/components/InvoiceAgent.jsx`: Floating chat-based invoice builder (separate from the form)

## Non-Obvious Config
- `BASE_URL` from `import.meta.env.BASE_URL` is used for logo image path — required for GitHub Pages deployment where the app lives at a subdirectory path.
- EmailJS credentials in `InvoiceActions.jsx` are still placeholder strings ("YOUR_SERVICE_ID" etc.) — email feature is non-functional until configured.
