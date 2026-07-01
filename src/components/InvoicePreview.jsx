import React, { useState } from "react";
import "./InvoicePreview.css";
import { motion, AnimatePresence } from "framer-motion";

function currency(n) {
  return "₹ " + Number(n || 0).toFixed(2);
}

export default function InvoicePreview({
  customer,
  invoiceMeta,
  items,
  setItems,
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
  invoiceRef,
}) {
  // track hovered row for showing remove icon
  const [hoveredItemId, setHoveredItemId] = useState(null);
  // track which item currently showing confirmation tooltip
  const [confirmItemId, setConfirmItemId] = useState(null);

  const hasValidCustomerGST =
    customer?.gstin &&
    customer.gstin.trim() !== "" &&
    customer.gstin.trim().toUpperCase() !== "NA";

  const advanceAmount = Number(customer?.advance || 0);
  const finalTotal = (grandTotal || 0) - advanceAmount;

  const handleDeleteConfirmed = (id) => {
    // remove only the specific item
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConfirmItemId(null);
    // optional: clear hovered id if it was the same
    if (hoveredItemId === id) setHoveredItemId(null);
  };

  return (
    <div
      ref={invoiceRef}
      className="invoice-print-root"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="invoice-print-header">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <img src={`${import.meta.env.BASE_URL}logo_new.jpg`} alt="logo" style={{ height: 80, borderRadius: 6 }} />
          <div style={{ color: "#6b3b3b", fontSize: 13 }}>
            VedAarna Studio<br />525, Lower Ground Floor, Sector - 27<br />Gurugram, Haryana - 122009
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h3 style={{ color: "#7b2a2a", margin: 0 }}>TAX INVOICE</h3>
          <div style={{ marginTop: 6 }}>
            <div>Invoice #: <strong>{invoiceMeta?.number}</strong></div>
            <div>Date: <strong>{invoiceMeta?.date}</strong></div>
          </div>
        </div>
      </header>

      {/* ── Body (grows to fill space) ──────────────────────── */}
      <section className="invoice-print-body">
        {/* Bill To / Payable To boxes */}
        <div className="invoice-header-section">
          <div className="bill-to box">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Bill To</div>
            <div>{customer?.name}</div>
            <div>{customer?.phone}</div>
            <div>{customer?.email}</div>
          </div>

          <div className="payable-to box">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Payable To</div>
            <div>VedAarna Studio</div>
            {hasValidCustomerGST && <div>GSTIN: {customer.gstin}</div>}
          </div>
        </div>

        {/* Invoice table */}
        <div className="invoice-table" style={{ marginTop: 16 }}>
          <div className="invoice-table-header">
            <div></div>
            <div>Item</div>
            <div>Qty</div>
            <div>Rate</div>
            <div>Disc</div>
            <div>Tax</div>
            <div>Amount</div>
          </div>

          <AnimatePresence>
            {items.map((it) => {
              const amount = (it.qty || 0) * (it.rate || 0);
              const disc = (amount * (it.discount || 0)) / 100;
              const taxable = amount - disc;
              const tax = (taxable * (it.tax || 0)) / 100;
              const lineTotal = taxable + tax;

              return (
                <motion.div
                  key={it.id}
                  className="invoice-table-row item-row"
                  layout
                  onMouseEnter={() => setHoveredItemId(it.id)}
                  onMouseLeave={() => {
                    if (confirmItemId !== it.id) setHoveredItemId(null);
                  }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: "grid", gridTemplateColumns: "0.6fr 2fr 1fr 1fr 1fr 1fr 1fr", alignItems: "center", gap: "6px" }}
                >
                  <div style={{ position: "relative", textAlign: "center" }}>
                    {hoveredItemId === it.id && (
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmItemId((cur) => (cur === it.id ? null : it.id));
                        }}
                        title="Remove item"
                      >
                        −
                      </button>
                    )}
                    <AnimatePresence>
                      {confirmItemId === it.id && (
                        <motion.div
                          className="remove-tooltip"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          onMouseEnter={() => { setConfirmItemId(it.id); setHoveredItemId(it.id); }}
                          onMouseLeave={() => { setConfirmItemId(null); setHoveredItemId(null); }}
                        >
                          <div>Remove this item?</div>
                          <div className="tooltip-actions" style={{ marginTop: 6 }}>
                            <button className="confirm-btn" onClick={(e) => { e.stopPropagation(); handleDeleteConfirmed(it.id); }}>Yes</button>
                            <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); setConfirmItemId(null); setHoveredItemId(null); }}>No</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>{it.name}</div>
                  <div>{it.qty}</div>
                  <div>{currency(it.rate)}</div>
                  <div>{it.discount}%</div>
                  <div>{it.tax}%</div>
                  <div>{currency(lineTotal)}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Totals — separated from items by top border */}
        <div className="invoice-totals">
          <div>Subtotal: <strong>{currency(subtotal)}</strong></div>
          <div>Discount: <strong>- {currency(totalDiscount)}</strong></div>
          {hasValidCustomerGST ? (
            <>
              <div>CGST (2.5%): <strong>{currency(totalTax / 2)}</strong></div>
              <div>SGST (2.5%): <strong>{currency(totalTax / 2)}</strong></div>
              <div style={{ borderTop: "1px solid #e9dcd8", marginTop: 4, paddingTop: 4 }}>
                Tax Total: <strong>{currency(totalTax)}</strong>
              </div>
            </>
          ) : (
            <div>Tax: <strong>{currency(totalTax)}</strong></div>
          )}
          {advanceAmount > 0 && (
            <div style={{ color: "#b91c1c" }}>
              Advance Payment: <strong>- {currency(advanceAmount)}</strong>
            </div>
          )}
          <div className="invoice-grand-total">Grand Total: {currency(finalTotal)}</div>
        </div>
      </section>

      {/* ── Footer — always at bottom ───────────────────────── */}
      <footer className="invoice-print-footer">
        <div className="invoice-footer-text">
          Thank you for shopping at VedAarna Studio.<br />For custom fittings allow 7–10 days.
        </div>
        {/* Text-based banner — replaces Bottom_Banner.jpg; renders perfectly at any page size */}
        <div className="invoice-footer-banner-text">
          {/* Brand name block */}
          <div className="ifbt-brand-name">VEDAARNA STUDIO</div>
          <div className="ifbt-tagline">A Legacy in Every Stitch</div>

          {/* Services line — nowrap keeps it on one line */}
          <div className="ifbt-headline">
            Bridal Blouse, Anarkali &amp; Lehenga, Gowns, Churidars, Western Wear
          </div>

          <div className="ifbt-email">
            <span className="ifbt-icon">✉</span> vedaaranstudio@gmail.com
          </div>
          <div className="ifbt-follow">Follow Us</div>
          <div className="ifbt-social">
            {/* Proper Instagram SVG icon */}
            <span className="ifbt-ig-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign:"middle",marginRight:3}}>
                <defs>
                  <radialGradient id="ig-grad" cx="30%" cy="107%" r="130%">
                    <stop offset="0%" stopColor="#fdf497"/>
                    <stop offset="20%" stopColor="#fd5949"/>
                    <stop offset="45%" stopColor="#d6249f"/>
                    <stop offset="75%" stopColor="#285AEB"/>
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" fill="url(#ig-grad)"/>
                <circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1.1" fill="#fff"/>
              </svg>
            </span>vedaarnastudio
            &nbsp;&nbsp;
            <span className="ifbt-fb-icon">f</span> vedaarnastudio
          </div>
        </div>
      </footer>
    </div>
  );
}
