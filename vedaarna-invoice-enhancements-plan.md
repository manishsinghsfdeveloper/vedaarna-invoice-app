# VedAarna Invoice App — Enhancement Plan

## Top-Level Overview

This plan covers **seven** enhancement areas for the VedAarna Invoice App currently deployed at
`https://manishsinghsfdeveloper.github.io/vedaarna-invoice-app/`. The app is a React + Vite
frontend deployed via GitHub Pages (`npm run deploy` → `gh-pages -d dist`). All changes must
remain frontend-only (no serverless functions, since GitHub Pages serves static files only).

**Approach:**
- All sub-tasks are self-contained and touch distinct files
- Email will be switched from AWS SES/Netlify to **EmailJS** (already in `package.json` as `emailjs-com`)
- A5 PDF will be rebuilt as a real **single multi-page A5 PDF** (not separate JPEGs per page)
- GST/CGST/SGST split display will be added to both the preview and the A5 PDF — CGST 2.5% and SGST 2.5% shown as separate lines
- WhatsApp will open general chat with pre-filled invoice message
- A rule-based conversational invoice agent will be built as a slide-out panel (Option A — free, no AI API needed)

---

## Sub-Task 1 — GST Auto-fill: 5% Tax + CGST/SGST Split Display

**Status:** `[ ] pending`

### Intent
When a valid GSTIN is entered in the form, the Tax (%) field for new items should auto-default
to 5%, and the invoice preview's totals section should break the tax into CGST (2.5%) + SGST (2.5%)
lines instead of a single "Tax" line. This gives a compliant GST breakdown on the bill.

### Expected Outcomes
- Tax field in "Add Item" form defaults to `5` when `customer.gstin` is valid
- Invoice preview totals section shows when GSTIN is present:
  ```
  Subtotal:          ₹ 7,600.00
  Discount:        - ₹     0.00
  CGST (2.5%):       ₹   185.00
  SGST (2.5%):       ₹   185.00
  ────────────────────────────────
  Tax Total:         ₹   370.00
  Grand Total:       ₹ 7,970.00
  ```
- When GSTIN is absent, falls back to single "Tax: ₹ X" line (current behaviour)
- The Tax column on each item row still shows the full percentage (e.g. "5%") — only the TOTALS section splits into CGST/SGST
- The `totalTax` calculation in `App.jsx` is UNCHANGED — only the display changes

### Todo List
1. In `src/components/InvoiceForm.jsx`, add a `useEffect` that watches `customer.gstin`:
   - When GSTIN becomes valid (non-empty, not "NA"), set `newItem.tax` to `5`
   - When GSTIN is cleared, reset `newItem.tax` to `0`
2. In `src/components/InvoicePreview.jsx`, update the totals section:
   - Detect `hasValidCustomerGST` (already computed on line 25)
   - When true, replace the single "Tax" row with two rows: CGST (2.5%) and SGST (2.5%)
   - Each showing `totalTax / 2` as the amount
   - Keep total calculation unchanged in `App.jsx` (tax is already totalled correctly)

### Relevant Context
- `src/components/InvoiceForm.jsx` lines 14–31: `newItem` state and `handleChange`
- `src/components/InvoicePreview.jsx` lines 25–28: `hasValidCustomerGST` flag
- `src/components/InvoicePreview.jsx` lines 199–205: totals display section
- `src/App.jsx` lines 30–33: tax calculation (no change needed here)

---

## Sub-Task 2 — Add GST Radio Button (Pre-fill Owner's GSTIN + Auto-Apply 5%)

**Status:** `[ ] pending`

### Intent
Add a radio button labeled "Add GST" in the form. When selected, it automatically fills the
GSTIN field with the owner's GST number `06ABCFV1239R1ZP` and shows it below the radio for
reference. It also triggers the auto-5% behavior from Sub-Task 1. When deselected, it clears
the GSTIN field.

### Expected Outcomes
- A radio button "Add GST" appears above the GSTIN input field
- Clicking it sets GSTIN to `06ABCFV1239R1ZP` and displays it below as a reference label
- The GSTIN text input is still editable (for customer GST scenarios)
- Toggling off the radio clears the GSTIN field
- Auto-5% tax from Sub-Task 1 fires as a consequence

### Todo List
1. In `src/components/InvoiceForm.jsx`, add local state `const [useOwnerGST, setUseOwnerGST] = useState(false)`
2. Add radio button UI above the GSTIN input:
   ```
   ○ Add GST (VedAarna Studio)
   06ABCFV1239R1ZP  ← reference label shown when radio is on
   ```
3. On radio toggle:
   - If checked: call `setCustomer({ ...customer, gstin: '06ABCFV1239R1ZP' })`
   - If unchecked: call `setCustomer({ ...customer, gstin: '' })`
4. Keep the existing GSTIN text input below (user can still type a custom GSTIN)
5. Sync `useOwnerGST` back to false if user manually clears the GSTIN text input

### Relevant Context
- `src/components/InvoiceForm.jsx` lines 63–70: GSTIN input section
- `src/components/InvoiceForm.css`: add styles for the radio label and reference text

---

## Sub-Task 3 — A5 PDF: Single Multi-Page PDF (7 items/page, proper layout)

**Status:** `[ ] pending`

### Intent
Replace the current A5 function (which downloads separate JPEG files per page) with a single
multi-page A5 PDF. Page 1 gets the full invoice layout. Pages 2+ get header + items only.
The last page gets header + remaining items + totals + footer banner. 7 items per page.

### Expected Outcomes
- "Invoice A5" button downloads a single `VedAarna_<CustomerName>_A5.pdf` file
- A5 dimensions: 148mm × 210mm
- Page 1: Header, Bill To / Payable To, Item table (up to 7 items), totals (if ≤ 7 items), footer
- Page 2+: Header only, Item table continuation (up to 7 items)
- Last page: Header, remaining items, totals, footer banner
- Text and layout scaled appropriately for A5 (smaller fonts than A4)
- The existing A4 "Download PDF" button is unchanged

### Todo List
1. In `src/components/InvoiceActions.jsx`, rewrite `downloadInvoiceA5()`:
   - Chunk `items` into groups of 7
   - For each page, build a temporary hidden DOM element styled for A5 (559px wide = 148mm at 96dpi)
   - Page 1 DOM: clone full invoice node (header + bill-to + items chunk 1 + totals + footer)
   - Middle pages DOM: clone header only + items chunk N (hide bill-to, totals, footer)
   - Last page DOM: clone header + last items chunk + totals + footer
   - Single-page invoices (≤7 items): just one page with full layout
   - Render each DOM node through `html2canvas` at scale 2, capture to PNG
   - Use `jsPDF("p", "mm", "a4")` sized to A5 (`new jsPDF("p", "mm", "a5")`)
   - Add each canvas image to the PDF (`pdf.addPage()` between pages)
   - At end, `pdf.save(filename)`
2. Update the button label from "Invoice A5" to "Download A5 PDF"
3. Remove the old per-page JPEG download logic entirely

### Relevant Context
- `src/components/InvoiceActions.jsx` lines 168–250: current `downloadInvoiceA5()` function
- `src/components/InvoiceActions.jsx` line 293: "Invoice A5" button
- `src/components/InvoicePreview.jsx`: the DOM structure to clone per page
- jsPDF supports A5 natively: `new jsPDF("p", "mm", "a5")` → 148×210mm pages
- Items are passed as `items` prop from `InvoiceForm` → need to pass items down to `InvoiceActions`

### Note on Data Flow
Currently `InvoiceActions` receives `invoiceRef`, `customer`, and `totals`. For page-aware A5 PDF,
it also needs `items`, `invoiceMeta`, and `subtotal`/`totalDiscount`/`totalTax` props so it can
reconstruct each page's DOM correctly. These need to be threaded from `App.jsx` → `InvoiceForm` → `InvoiceActions`.

---

## Sub-Task 4 — Email via EmailJS (Replace AWS SES / Netlify Function)

**Status:** `[ ] pending`

### Intent
Replace the Netlify/AWS SES email backend with EmailJS, which works entirely from the browser
with no server required — perfect for GitHub Pages. The `emailjs-com` package is already installed.
When "Email + Upload" is clicked, the invoice PDF (as base64 attachment) is sent to
`vedaarnastudio@gmail.com` with the customer name and date in the subject line.

### Expected Outcomes
- "Email + Upload" sends an email to `vedaarnastudio@gmail.com`
- Email subject: `VedAarna Invoice — <CustomerName> | <Date>`
- Email body includes: Customer name, phone, email, invoice total, date
- PDF attachment sent via EmailJS (using a template with file attachment support)
- No Netlify serverless function called
- Success/error shown via `react-toastify` (already available)
- The `pdfUrl` state (used for WhatsApp) can store a generic confirmation message or be removed

### EmailJS Setup Steps (one-time, done before coding)
1. Create free account at https://www.emailjs.com
2. Add Gmail service (connect `vedaarnastudio@gmail.com` as the sender)
3. Create an email template with variables:
   - `{{customer_name}}`, `{{customer_phone}}`, `{{customer_email}}`
   - `{{invoice_total}}`, `{{invoice_date}}`, `{{invoice_number}}`
4. Note: EmailJS free tier does NOT support PDF attachments directly
   - **Workaround:** Send invoice details as HTML table in the email body
   - The PDF itself is downloaded locally; the email is for reference notification
5. Store Service ID, Template ID, and Public Key in the code (these are public-safe)

### Todo List
1. Switch import from `emailjs-com` to `@emailjs/browser` (more modern, same free tier)
   - Or keep `emailjs-com` since it's already installed (`emailjs.sendForm` / `emailjs.send`)
2. In `src/components/InvoiceActions.jsx`, replace `uploadAndSend()`:
   - Generate the PDF and trigger local download (user keeps a copy)
   - Call `emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)`
   - `templateParams` includes all invoice details as text (not attachment)
   - Show `toast.success("Invoice emailed to vedaarnastudio@gmail.com!")` on success
   - Show `toast.error("Email failed. Try again.")` on error
3. Add EmailJS credentials as constants at top of `InvoiceActions.jsx` (safe to commit for public repos)
4. Update WhatsApp button: enable it after email is sent (currently requires `pdfUrl` from S3)

### Relevant Context
- `src/components/InvoiceActions.jsx` lines 132–157: current `uploadAndSend()` function
- `emailjs-com` is already in `package.json` dependencies
- `react-toastify` is already installed — use `toast.success/error` instead of `alert()`
- The Netlify serverless function (`netlify/functions/sendInvoice.js`) can remain as-is (it won't be called)

---

## Sub-Task 5 — WhatsApp Share Enhancement

**Status:** `[ ] pending`

### Intent
The WhatsApp button currently is disabled until S3 upload completes (which will no longer happen).
Update it to open WhatsApp Web with a pre-filled message any time (no upload dependency).
The message includes customer name, total, and invoice number. If customer phone is provided,
open the chat directly to that number (`wa.me/<phone>`). Otherwise open general WhatsApp Web.

### Expected Outcomes
- "Share on WhatsApp" button is always enabled (not gated behind upload)
- If `customer.phone` is provided: opens `https://wa.me/<phone>?text=...` (direct chat)
- If `customer.phone` is empty: opens `https://wa.me/?text=...` (general WhatsApp)
- Pre-filled message includes: Invoice #, Customer name, Total amount, date
- Button remains the same green WhatsApp style

### Todo List
1. In `src/components/InvoiceActions.jsx`, update `whatsappShare()`:
   - Remove the `!pdfUrl` disable condition
   - Build the phone URL: if `customer.phone` is non-empty, strip non-digits and prepend country code
     (assume India +91 if no country code present)
   - Build message text with invoice details
   - Open appropriate WhatsApp URL
2. Update button: remove `disabled={!pdfUrl}` condition

### Relevant Context
- `src/components/InvoiceActions.jsx` lines 159–166: current `whatsappShare()` function
- `src/components/InvoiceActions.jsx` line 284: `disabled={!pdfUrl}` on WhatsApp button

---

## Sub-Task 6 — Standard Billing Enhancements

**Status:** `[ ] pending`

### Intent
Three quality-of-life improvements that make the app behave like a professional billing tool.
All are included in implementation (not optional).

### 6A — Invoice Number Auto-Increment
- **Problem:** User types the invoice number manually every time
- **Fix:** On page load, read last invoice number from `localStorage`. On PDF download, increment and save it
- **Behaviour:** VA#1001 → VA#1002 → VA#1003 automatically
- **Files:** `src/App.jsx`

### 6B — Toast Notifications Replace All `alert()` Calls
- **Problem:** Raw browser `alert()` blocks UI and looks unprofessional
- **Fix:** Replace every `alert()` in `InvoiceActions.jsx` with `toast.success()` / `toast.error()`
- `react-toastify` is already installed — just needs `<ToastContainer>` added to `App.jsx`
- **Files:** `src/components/InvoiceActions.jsx`, `src/App.jsx`

### 6C — Reset / New Invoice Button
- **Problem:** No way to clear all fields and start fresh without refreshing the page
- **Fix:** "New Invoice" button at the top of the form that resets customer, items, and invoice meta to defaults
- **Files:** `src/App.jsx` (reset function passed as prop), `src/components/InvoiceForm.jsx` (button UI)

---

## Sub-Task 7 — Conversational Invoice Agent (Rule-Based, Option A)

**Status:** `[ ] pending`

### Intent
Build a slide-out chat panel inside the existing app. The agent asks the user questions one by
one (customer name, phone, items, quantity, rate, GST toggle) then builds the invoice in the
background and triggers the chosen download format. No AI API required — pure rule-based state
machine. Can be upgraded to AI later.

### Conversation Flow
```
Agent: 👋 Hi! Let's build your invoice. What's the customer's name?
You:   Priya Sharma
Agent: Got it! Customer phone number?
You:   9876543210
Agent: Customer email? (press Enter to skip)
You:   priya@email.com
Agent: Should I add GST? (yes / no)
You:   yes
Agent: ✅ GSTIN set to 06ABCFV1239R1ZP. Now let's add items.
Agent: Item name?
You:   Bridal Lehenga
Agent: Quantity?
You:   1
Agent: Rate (₹)?
You:   15000
Agent: Discount %? (Enter for 0)
You:   0
Agent: ✅ Item added! Add another item? (yes / no)
You:   no
Agent: Invoice ready! How do you want to download it?
       [PDF]  [A5 PDF]  [Image]  [WhatsApp]
```

### Expected Outcomes
- A floating "🤖 Invoice Agent" button in the bottom-right corner of the screen
- Click opens a slide-up chat panel (mobile-friendly, same maroon theme)
- All answers the user gives populate the real invoice form state via the existing `setCustomer`, `addItem`, etc. functions
- At the final step, the chosen download format triggers the existing `generatePDF()`, `downloadInvoiceA5()`, or `downloadBillImage()` functions
- Agent panel can be closed/reopened at any time; conversation state resets on re-open
- A "Fill form instead" link in the panel header lets the user switch to manual mode

### Todo List
1. Create `src/components/InvoiceAgent.jsx`:
   - Local state: `messages` array, `step` (current question), `tempData` (collecting answers)
   - Steps enum: `NAME → PHONE → EMAIL → GST → ITEM_NAME → QTY → RATE → DISCOUNT → MORE_ITEMS → DOWNLOAD`
   - On each user reply, advance step and push agent response to messages
   - At `DOWNLOAD` step, show 4 clickable buttons (PDF / A5 PDF / Image / WhatsApp)
   - Calls `onComplete(customerData, items, downloadType)` callback prop when done
2. Create `src/components/InvoiceAgent.css` — slide-up panel, chat bubbles, maroon theme
3. In `src/App.jsx`:
   - Add `onAgentComplete` handler that calls `setCustomer`, bulk-adds items, then triggers download
   - Render `<InvoiceAgent>` always (it manages its own open/closed state)
4. Pass `generatePDF`, `downloadInvoiceA5`, `downloadBillImage` as refs/callbacks via App → InvoiceAgent

### Relevant Context
- `src/App.jsx`: state setters (`setCustomer`, `setItems`) to be called by agent
- `src/components/InvoiceActions.jsx`: download functions that agent will trigger
- `src/components/InvoiceForm.jsx`: existing form (agent is an ALTERNATIVE input path, not a replacement)
- `src/App.css`: layout (agent button fixed-position bottom-right, z-index above preview)

---

## Testing Locally

After each sub-task is implemented:
```bash
# Start local dev server
npm run dev
# Open http://localhost:5173/vedaarna-invoice-app/
```

## Deployment to GitHub Pages

After all sub-tasks pass local testing:
```bash
npm run build          # Build the dist/ folder
npm run deploy         # Push dist/ to gh-pages branch
# Wait ~2 minutes then visit:
# https://manishsinghsfdeveloper.github.io/vedaarna-invoice-app/
```

---

## Implementation Order

```
Sub-Task 2  →  Sub-Task 1   (GST radio triggers CGST/SGST display)
                    ↓
Sub-Task 3                  (A5 PDF — needs items prop threaded through)
                    ↓
Sub-Task 6                  (Toast notifications, auto-increment, New Invoice)
                    ↓
Sub-Task 4                  (EmailJS — independent of above)
                    ↓
Sub-Task 5                  (WhatsApp fix — remove pdfUrl dependency)
                    ↓
Sub-Task 7                  (Invoice Agent — builds on all completed download functions)
```

Sub-Tasks 4 and 5 can be worked on independently of 2/1/3.
Sub-Task 7 (Agent) must come last since it calls the download functions from other sub-tasks.
