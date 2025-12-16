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
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", borderBottom: "2px solid #7b2a2a", paddingBottom: 10 }}>
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

      <section style={{ marginTop: 16 }}>
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

        {/* Invoice table header */}
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

          {/* Rows with AnimatePresence */}
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
                    // if confirmation is open for this item we keep hovered state until tooltip closed
                    if (confirmItemId !== it.id) setHoveredItemId(null);
                  }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: "grid", gridTemplateColumns: "0.6fr 2fr 1fr 1fr 1fr 1fr 1fr", alignItems: "center", gap: "6px", position: "relative" }}
                >
                  {/* Remove button + per-item tooltip */}
                  <div style={{ position: "relative", textAlign: "center" }}>
                    {/* show button only when hoveredItemId === this id */}
                    {hoveredItemId === it.id && (
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // toggle confirmation for this item
                          setConfirmItemId((cur) => (cur === it.id ? null : it.id));
                        }}
                        title="Remove item"
                      >
                        −
                      </button>
                    )}

                    {/* tooltip popped only for the item with confirmItemId */}
                    <AnimatePresence>
                      {confirmItemId === it.id && (
                        <motion.div
                          className="remove-tooltip"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          onMouseEnter={() => {
                            // keep tooltip alive while mouse is over it
                            setConfirmItemId(it.id);
                            setHoveredItemId(it.id);
                          }}
                          onMouseLeave={() => {
                            // close tooltip when user leaves tooltip area
                            setConfirmItemId(null);
                            setHoveredItemId(null);
                          }}
                        >
                          <div>Remove this item?</div>
                          <div className="tooltip-actions" style={{ marginTop: 6 }}>
                            <button
                              className="confirm-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfirmed(it.id);
                              }}
                            >
                              Yes
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmItemId(null);
                                setHoveredItemId(null);
                              }}
                            >
                              No
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div style={{ textAlign: "left" }}>{it.name}</div>
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

        {/* Totals */}
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <div>Subtotal: <strong>{currency(subtotal)}</strong></div>
          <div>Discount: <strong>- {currency(totalDiscount)}</strong></div>
          <div>Tax: <strong>{currency(totalTax)}</strong></div>
          {advanceAmount > 0 && <div style={{ color: "#b91c1c" }}>Advance Payment: <strong>- {currency(advanceAmount)}</strong></div>}
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: "#7b2a2a" }}>Grand Total: {currency(finalTotal)}</div>
        </div>

        {/* Footer & banner */}
        <div style={{ marginTop: 40, color: "#6b3b3b", textAlign: "center" }}>
          Thank you for shopping at VedAarna Studio.<br />For custom fittings allow 7–10 days.
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <img src={`${import.meta.env.BASE_URL}Bottom_Banner.jpg`} alt="VedAarna Studio Banner" style={{ width: "100%", marginTop: 16, borderRadius: 8, objectFit: "cover" }} />
        </div>
      </section>
    </div>
  );
}
