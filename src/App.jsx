import React, { useState, useRef, useCallback } from 'react'
import './App.css'
import InvoiceForm from './components/InvoiceForm'
import InvoicePreview from './components/InvoicePreview'
import InvoiceAgent from './components/InvoiceAgent'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// ── Financial year helper ─────────────────────────────────────────────────────
// Returns e.g. "26-27" for FY 2026-27 (Apr 2026 – Mar 2027)
function getCurrentFinancialYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-based
  // FY starts in April (month 4)
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = fyStart + 1
  return `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`
}

// ── Invoice number helpers ────────────────────────────────────────────────────
// Format: VS/01/26-27
function loadInvoiceNumber() {
  const saved = localStorage.getItem('va_invoice_number')
  if (saved) return saved
  const initial = `VS/01/${getCurrentFinancialYear()}`
  localStorage.setItem('va_invoice_number', initial)
  return initial
}

function nextInvoiceNumber(current) {
  // Parse "VS/01/26-27" → increment the numeric part → "VS/02/26-27"
  const match = current.match(/^VS\/(\d+)\/(.+)$/)
  if (match) {
    const next = String(Number(match[1]) + 1).padStart(2, '0')
    const fy = getCurrentFinancialYear()
    return `VS/${next}/${fy}`
  }
  return current
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Date format helper: "YYYY-MM-DD" → "DD-MM-YYYY" ─────────────────────────
export function formatDateForDisplay(isoDate) {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}
// ─────────────────────────────────────────────────────────────────────────────

// Empty dispatch meta object — single source of truth for the new fields
const EMPTY_DISPATCH = {
  shipTo: '',
  paymentMethod: '',
  refNo: '',
  buyerOrderNo: '',
  dispatchDocNo: '',
  dispatchThrough: '',
  destination: '',
  termsOfDelivery: '',
}

export default function App() {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', gstin: '', recipientGstin: '', advance: 0 })
  const [dispatchMeta, setDispatchMeta] = useState({ ...EMPTY_DISPATCH })
  const [invoiceMeta, setInvoiceMeta] = useState({
    number: loadInvoiceNumber(),
    date: new Date().toISOString().split('T')[0]
  })
  const [items, setItems] = useState([])
  const invoiceRef = useRef(null)
  // Refs to hold the latest download functions from InvoiceActions
  const downloadFnRef = useRef({})

  function resetInvoice() {
    const newNumber = nextInvoiceNumber(invoiceMeta.number)
    localStorage.setItem('va_invoice_number', newNumber)
    setCustomer({ name: '', phone: '', email: '', address: '', gstin: '', recipientGstin: '', advance: 0 })
    setDispatchMeta({ ...EMPTY_DISPATCH })
    setInvoiceMeta({ number: newNumber, date: new Date().toISOString().split('T')[0] })
    setItems([])
  }

  function onInvoiceSent() {
    // Called after PDF download — advance invoice number for next bill
    const newNumber = nextInvoiceNumber(invoiceMeta.number)
    localStorage.setItem('va_invoice_number', newNumber)
    setInvoiceMeta(prev => ({ ...prev, number: newNumber }))
  }

  // Called by InvoiceAgent when the user completes the conversation
  function handleAgentComplete({ customer: agentCustomer, items: agentItems, dispatchMeta: agentDispatch }) {
    setCustomer({ name: agentCustomer.name || '', phone: agentCustomer.phone || '', email: agentCustomer.email || '', address: agentCustomer.address || '', gstin: agentCustomer.gstin || '', recipientGstin: agentCustomer.recipientGstin || '', advance: Number(agentCustomer.advance || 0) });
    if (agentDispatch) {
      setDispatchMeta({
        shipTo:           agentDispatch.shipTo           || '',
        paymentMethod:    agentDispatch.paymentMethod    || '',
        refNo:            agentDispatch.refNo            || '',
        buyerOrderNo:     agentDispatch.buyerOrderNo     || '',
        dispatchDocNo:    agentDispatch.dispatchDocNo    || '',
        dispatchThrough:  agentDispatch.dispatchThrough  || '',
        destination:      agentDispatch.destination      || '',
        termsOfDelivery:  agentDispatch.termsOfDelivery  || '',
      });
    }
    setItems(agentItems.map(it => ({
      id: it.id || `${Date.now()}-${Math.random()}`,
      name: it.name || '',
      qty: Number(it.qty || 1),
      rate: Number(it.rate || 0),
      discount: Number(it.discount || 0),
      tax: Number(it.tax || 0),
    })));
    setInvoiceMeta(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
  }

  // Called by InvoiceAgent when user picks a download type
  function handleAgentDownload(type) {
    const fns = downloadFnRef.current;
    if (type === "PDF" && fns.generatePDF) fns.generatePDF(true);
    else if (type === "Multi-page PDF" && fns.downloadInvoiceMultiPage) fns.downloadInvoiceMultiPage();
    else if (type === "Image" && fns.downloadBillImage) fns.downloadBillImage();
    else if (type === "WhatsApp" && fns.whatsappShare) fns.whatsappShare();
  }

  function addItem(item) {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const newItem = {
      id,
      name: item.name || '',
      qty: Number(item.qty || 1),
      rate: Number(item.rate || 0),
      discount: Number(item.discount || 0),
      tax: Number(item.tax || 0),
    };

    setItems(prev => [...prev, newItem]);
  }

  const subtotal = items.reduce((acc, i) => acc + i.qty * i.rate, 0)
  const totalDiscount = items.reduce((acc, i) => acc + (i.rate * i.qty * (i.discount || 0)) / 100, 0)
  const totalTax = items.reduce((acc, i) => acc + (i.rate * i.qty * (i.tax || 0)) / 100, 0)
  const grandTotal = subtotal - totalDiscount + totalTax

  const totals = { subtotal, totalDiscount, totalTax, grandTotal }

  return (
    <>
      {/* Toast notifications — outside the grid so they don't become grid items */}
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} theme="light" />

      {/* Invoice Agent floating button — outside the grid */}
      <InvoiceAgent onComplete={handleAgentComplete} onDownload={handleAgentDownload} />

      <div className="app-container">
        {/* LEFT SIDE: FORM */}
        <div>
          <InvoiceForm
            invoiceMeta={invoiceMeta}
            setInvoiceMeta={setInvoiceMeta}
            customer={customer}
            setCustomer={setCustomer}
            dispatchMeta={dispatchMeta}
            setDispatchMeta={setDispatchMeta}
            addItem={addItem}
            invoiceRef={invoiceRef}
            totals={totals}
            onReset={resetInvoice}
            onInvoiceSent={onInvoiceSent}
            downloadFnRef={downloadFnRef}
          />
        </div>

        {/* RIGHT SIDE: PREVIEW */}
        <div>
          <InvoicePreview
            customer={customer}
            invoiceMeta={invoiceMeta}
            dispatchMeta={dispatchMeta}
            items={items}
            setItems={setItems}
            subtotal={subtotal}
            totalDiscount={totalDiscount}
            totalTax={totalTax}
            grandTotal={grandTotal}
            invoiceRef={invoiceRef}
          />
        </div>
      </div>
    </>
  )
}
