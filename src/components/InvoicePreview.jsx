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
  // Validate GSTIN
  const hasValidCustomerGST =
    customer?.gstin &&
    customer.gstin.trim() !== "" &&
    customer.gstin.trim().toUpperCase() !== "NA";

  // Advance payment logic
  const advanceAmount = Number(customer.advance || 0);
  const finalTotal = grandTotal - advanceAmount;

  // Track hovered and confirm states per item
  const [hoveredItem, setHoveredItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);

  // Delete specific item
  const handleDeleteItem = (id) => {
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    setConfirmItem(null); // Close tooltip
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
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          borderBottom: "2px solid #7b2a2a",
          paddingBottom: 10,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <img
            src={`${import.meta.env.BASE_URL}logo_new.jpg`}
            alt="logo"
            style={{ height: 80, borderRadius: 6 }}
          />
          <div style={{ color: "#6b3b3b", fontSize: 13 }}>
            VedAarna Studio
            <br />
            525, Lower Ground Floor, Sector - 27
            <br />
            Gurugram, Haryana - 122009
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <h3 style={{ color: "#7b2a2a", margin: 0 }}>TAX INVOICE</h3>
          <div style={{ marginTop: 6 }}>
            <div>
              Invoice #: <strong>{invoiceMeta.number}</strong>
            </div>
            <div>
              Date: <strong>{invoiceMeta.date}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* BILL TO / PAYABLE TO */}
      <section style={{ marginTop: 16 }}>
        <div className="invoice-header-section">
          <div className="bill-to box">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Bill To</div>
            <div>{customer.name}</div>
            <div>{customer.phone}</div>
            <div>{customer.email}</div>
          </div>

          <div className="payable-to box">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Payable To</div>
            <div>VedAarna Studio</div>
            {hasValidCustomerGST && <div>GSTIN: {customer.gstin}</div>}
          </div>
        </div>

        {/* INVOICE TABLE */}
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
                  onMouseEnter={() => setHoveredItem(it.id)}
                  onMouseLeave={() => {
                    if (confirmItem !== it.id) setHoveredItem(null);
                  }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Remove button */}
                  <div style={{ position: "relative", textAlign: "center" }}>
                    <button
                      className="remove-btn always-visible"
                      onClick={() =>
                        setConfirmItem(confirmItem === it.id ? null : it.id)
                      }
                    >
                      −
                    </button>

                    <AnimatePresence>
                      {confirmItem === it.id && (
                        <motion.div
                          className="remove-tooltip"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <span>Remove this item?</span>
                          <div className="tooltip-actions">
                            <button
                              className="confirm-btn"
                              onClick={() => handleDeleteItem(it.id)}
                            >
                              Yes
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={() => setConfirmItem(null)}
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

        {/* TOTALS */}
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <div>
            Subtotal: <strong>{currency(subtotal)}</strong>
          </div>
          <div>
            Discount: <strong>- {currency(totalDiscount)}</strong>
          </div>
          <div>
            Tax: <strong>{currency(totalTax)}</strong>
          </div>

          {advanceAmount > 0 && (
            <div style={{ color: "#b91c1c" }}>
              Advance Payment: <strong>- {currency(advanceAmount)}</strong>
            </div>
          )}

          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 8,
              color: "#7b2a2a",
            }}
          >
            Grand Total: {currency(finalTotal)}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 40, color: "#6b3b3b", textAlign: "center" }}>
          Thank you for shopping at VedAarna Studio.
          <br />
          For custom fittings allow 7–10 days.
        </div>

        {/* BOTTOM BANNER */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <img
            src={`${import.meta.env.BASE_URL}Bottom_Banner.jpg`}
            alt="VedAarna Studio Banner"
            style={{
              width: "100%",
              marginTop: 16,
              borderRadius: 8,
              objectFit: "cover",
            }}
          />
        </div>
      </section>
    </div>
  );
}
