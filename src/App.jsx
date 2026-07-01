import React, { useState, useRef, useCallback } from 'react'
import './App.css'
import InvoiceForm from './components/InvoiceForm'
import InvoicePreview from './components/InvoicePreview'
import InvoiceAgent from './components/InvoiceAgent'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// ── Invoice number helpers ────────────────────────────────────────────────────
function loadInvoiceNumber() {
  const saved = localStorage.getItem('va_invoice_number')
  if (saved) return saved
  const initial = 'VA#1001'
  localStorage.setItem('va_invoice_number', initial)
  return initial
}

function nextInvoiceNumber(current) {
  // Extracts the numeric part of "VA#1001" → 1001, increments, returns "VA#1002"
  const match = current.match(/^(VA#)(\d+)$/)
  if (match) {
    const next = String(Number(match[2]) + 1)
    return `${match[1]}${next}`
  }
  return current
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', gstin: '', advance: 0 })
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
    setCustomer({ name: '', phone: '', email: '', gstin: '', advance: 0 })
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
  function handleAgentComplete({ customer: agentCustomer, items: agentItems }) {
    setCustomer({ name: agentCustomer.name || '', phone: agentCustomer.phone || '', email: agentCustomer.email || '', gstin: agentCustomer.gstin || '', advance: Number(agentCustomer.advance || 0) });
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
    else if (type === "A5 PDF" && fns.downloadInvoiceA5) fns.downloadInvoiceA5();
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
