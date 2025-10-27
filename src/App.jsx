import React, { useState, useRef } from 'react'
import './App.css'
import InvoiceForm from './components/InvoiceForm'
import InvoicePreview from './components/InvoicePreview'

export default function App() {
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' })
  const [invoiceMeta, setInvoiceMeta] = useState({ id: 'VA-001', date: new Date().toISOString().split('T')[0] })
  const [items, setItems] = useState([])
  const invoiceRef = useRef(null)

  function addItem(item) {
    setItems(prev => [...prev, item])
  }

  const subtotal = items.reduce((acc, i) => acc + i.qty * i.rate, 0)
  const totalDiscount = items.reduce((acc, i) => acc + (i.rate * i.qty * (i.discount || 0)) / 100, 0)
  const totalTax = items.reduce((acc, i) => acc + (i.rate * i.qty * (i.tax || 0)) / 100, 0)
  const grandTotal = subtotal - totalDiscount + totalTax

  return (
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
          grandTotal={grandTotal}
        />
      </div>

      {/* RIGHT SIDE: PREVIEW */}
      <div>
        <InvoicePreview
          customer={customer}
          invoiceMeta={invoiceMeta}
          items={items}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          totalTax={totalTax}
          grandTotal={grandTotal}
          invoiceRef={invoiceRef}
        />
      </div>
    </div>
  )
}
