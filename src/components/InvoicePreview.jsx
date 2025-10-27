import React from 'react'
import './InvoicePreview.css' // for responsive table styles

function currency(n) {
  return '₹ ' + Number(n || 0).toFixed(2)
}

export default function InvoicePreview({
  customer,
  invoiceMeta,
  items,
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
  invoiceRef,
}) {
  return (
    <div
      ref={invoiceRef}
      style={{
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          borderBottom: '2px solid #7b2a2a',
          paddingBottom: 10,
        }}
      >
        <div>
          <img src="/logo_new.jpg" alt="logo" style={{ height: 80 }} />
          <div style={{ color: '#6b3b3b', fontSize: 13, marginTop: 8 }}>
            VedAarna Studio<br />
            525, Lower Ground Floor, Sector - 27<br />
            Gurugram, Haryana - 122009
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ color: '#7b2a2a' }}>TAX INVOICE</h3>
          <div>
            Invoice #: <strong>{invoiceMeta.number}</strong>
          </div>
          <div>
            Date: <strong>{invoiceMeta.date}</strong>
          </div>
        </div>
      </header>

      {/* BILLING INFO */}
      <section style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Bill To</div>
            <div>{customer.name}</div>
            <div>{customer.phone}</div>
            <div>{customer.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>Payable To</div>
            <div>VedAarna Studio</div>
            <div>GSTIN: XXAAAA0000X1Z5</div>
          </div>
        </div>

        {/* INVOICE TABLE */}
        <div className="invoice-table" style={{ marginTop: 16 }}>
          <div className="invoice-table-header">
            <div>Item</div>
            <div>Qty</div>
            <div>Rate</div>
            <div>Disc</div>
            <div>Tax</div>
            <div>Amount</div>
          </div>

          {items.map((it) => {
            const amount = it.qty * it.rate
            const disc = (amount * (it.discount || 0)) / 100
            const taxable = amount - disc
            const tax = (taxable * (it.tax || 0)) / 100
            const lineTotal = taxable + tax

            return (
              <div key={it.id} className="invoice-table-row">
                <div>{it.name}</div>
                <div>{it.qty}</div>
                <div>{currency(it.rate)}</div>
                <div>{it.discount}%</div>
                <div>{it.tax}%</div>
                <div>{currency(lineTotal)}</div>
              </div>
            )
          })}
        </div>

        {/* TOTALS */}
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <div>Subtotal: <strong>{currency(subtotal)}</strong></div>
          <div>Discount: <strong>- {currency(totalDiscount)}</strong></div>
          <div>Tax: <strong>{currency(totalTax)}</strong></div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 8,
              color: '#7b2a2a',
            }}
          >
            Grand Total: {currency(grandTotal)}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 16, color: '#6b3b3b', textAlign: 'center' }}>
          Thank you for shopping at VedAarna Studio.<br />
          For custom fittings allow 7–10 days.
        </div>

        {/* Bottom Banner */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <img
            src="/Bottom_Banner.jpg"
            alt="VedAarna Studio Banner"
            style={{
              width: '100%',
              maxWidth: '800px',
              height: 'auto',
              borderRadius: '10px',
              margin: '10px auto 0',
              display: 'block',
            }}
          />
        </div>
      </section>
    </div>
  )
}

