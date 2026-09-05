import React, { useState } from "react";
import "./InvoicePreview.css";
import { motion, AnimatePresence } from "framer-motion";
import { numberToWords } from "../utils";
import { formatDateForDisplay } from "../App";

// ── Currency formatter ────────────────────────────────────────────────────────
function currency(n) {
  return "₹ " + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const OWNER_GSTIN = "06ABCFV1239R1ZP";

// ── Indian GST State Code lookup ──────────────────────────────────────────────
// Maps lowercase state name keywords → { name, code }
const STATE_MAP = [
  { code: "01", name: "Jammu and Kashmir",       keys: ["jammu", "kashmir"] },
  { code: "02", name: "Himachal Pradesh",         keys: ["himachal"] },
  { code: "03", name: "Punjab",                   keys: ["punjab"] },
  { code: "04", name: "Chandigarh",               keys: ["chandigarh"] },
  { code: "05", name: "Uttarakhand",              keys: ["uttarakhand", "uttaranchal"] },
  { code: "06", name: "Haryana",                  keys: ["haryana"] },
  { code: "07", name: "Delhi",                    keys: ["delhi"] },
  { code: "08", name: "Rajasthan",                keys: ["rajasthan"] },
  { code: "09", name: "Uttar Pradesh",            keys: ["uttar pradesh", "up "] },
  { code: "10", name: "Bihar",                    keys: ["bihar"] },
  { code: "11", name: "Sikkim",                   keys: ["sikkim"] },
  { code: "12", name: "Arunachal Pradesh",        keys: ["arunachal"] },
  { code: "13", name: "Nagaland",                 keys: ["nagaland"] },
  { code: "14", name: "Manipur",                  keys: ["manipur"] },
  { code: "15", name: "Mizoram",                  keys: ["mizoram"] },
  { code: "16", name: "Tripura",                  keys: ["tripura"] },
  { code: "17", name: "Meghalaya",                keys: ["meghalaya"] },
  { code: "18", name: "Assam",                    keys: ["assam"] },
  { code: "19", name: "West Bengal",              keys: ["west bengal"] },
  { code: "20", name: "Jharkhand",                keys: ["jharkhand"] },
  { code: "21", name: "Odisha",                   keys: ["odisha", "orissa"] },
  { code: "22", name: "Chhattisgarh",             keys: ["chhattisgarh"] },
  { code: "23", name: "Madhya Pradesh",           keys: ["madhya pradesh"] },
  { code: "24", name: "Gujarat",                  keys: ["gujarat"] },
  { code: "25", name: "Daman and Diu",            keys: ["daman", "diu"] },
  { code: "26", name: "Dadra and Nagar Haveli",   keys: ["dadra", "nagar haveli"] },
  { code: "27", name: "Maharashtra",              keys: ["maharashtra", "mumbai", "pune", "nagpur", "nashik"] },
  { code: "29", name: "Karnataka",                keys: ["karnataka", "bangalore", "bengaluru"] },
  { code: "30", name: "Goa",                      keys: ["goa"] },
  { code: "31", name: "Lakshadweep",              keys: ["lakshadweep"] },
  { code: "32", name: "Kerala",                   keys: ["kerala"] },
  { code: "33", name: "Tamil Nadu",               keys: ["tamil", "chennai"] },
  { code: "34", name: "Puducherry",               keys: ["puducherry", "pondicherry"] },
  { code: "35", name: "Andaman and Nicobar",      keys: ["andaman", "nicobar"] },
  { code: "36", name: "Telangana",                keys: ["telangana", "hyderabad"] },
  { code: "37", name: "Andhra Pradesh",           keys: ["andhra"] },
  { code: "38", name: "Ladakh",                   keys: ["ladakh"] },
];

// Default when no state detected
const DEFAULT_STATE = { code: "06", name: "Haryana" };

function detectState(addressText) {
  if (!addressText) return DEFAULT_STATE;
  const lower = addressText.toLowerCase();
  for (const s of STATE_MAP) {
    if (s.keys.some(k => lower.includes(k))) {
      return { code: s.code, name: s.name };
    }
  }
  return DEFAULT_STATE;
}

// ── SAC code resolver ─────────────────────────────────────────────────────────
function getSAC(itemName) {
  const n = (itemName || "").toLowerCase();
  if (/\balt\b|alteration/.test(n)) return "998723";
  if (/special\s*design|luxury|lux\b|customized\s*designer/.test(n)) return "998391";
  return "998822";
}

export default function InvoicePreview({
  customer,
  invoiceMeta,
  dispatchMeta = {},
  items,
  setItems,
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
  invoiceRef,
}) {
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [confirmItemId, setConfirmItemId] = useState(null);

  const hasOwnerGST =
    customer?.gstin &&
    customer.gstin.trim() !== "" &&
    customer.gstin.trim().toUpperCase() !== "NA";

  const advanceAmount = Number(customer?.advance || 0);
  const finalTotal    = (grandTotal || 0) - advanceAmount;
  const taxableAmount = (subtotal || 0) - (totalDiscount || 0);

  const recipientGstin =
    customer?.recipientGstin && customer.recipientGstin.trim() !== ""
      ? customer.recipientGstin.trim()
      : "N/A";

  // Detect states from addresses
  const billState     = detectState(customer?.address || customer?.name || "");
  const shipState     = dispatchMeta?.shipTo ? detectState(dispatchMeta.shipTo) : billState;

  const handleDeleteConfirmed = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConfirmItemId(null);
    if (hoveredItemId === id) setHoveredItemId(null);
  };

  // GST breakdown grouped by SAC + tax rate
  const gstGroups = hasOwnerGST && items.length > 0
    ? Object.entries(
        items.reduce((acc, it) => {
          const rate = it.tax || 0;
          const sac  = getSAC(it.name);
          const key  = `${sac}__${rate}`;
          if (!acc[key]) acc[key] = { sac, rate, taxable: 0, tax: 0 };
          const amt     = (it.qty || 0) * (it.rate || 0);
          const disc    = (amt * (it.discount || 0)) / 100;
          const taxable = amt - disc;
          acc[key].taxable += taxable;
          acc[key].tax     += (taxable * rate) / 100;
          return acc;
        }, {})
      )
    : [];

  const hasDispatchCol = !!(dispatchMeta?.paymentMethod || dispatchMeta?.refNo ||
    dispatchMeta?.buyerOrderNo || dispatchMeta?.dispatchDocNo ||
    dispatchMeta?.dispatchThrough || dispatchMeta?.destination ||
    dispatchMeta?.termsOfDelivery);

  return (
    <div ref={invoiceRef} className="invoice-print-root">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="invoice-print-header">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <img
            src={`${import.meta.env.BASE_URL}logo_new.jpg`}
            alt="logo"
            style={{ height: 72, borderRadius: 4 }}
          />
          <div className="header-address-block">
            <div className="header-company-name">VedAarna Studio</div>
            <div className="header-address-line">525, Lower Ground Floor, Sector - 27</div>
            <div className="header-address-line">Gurugram, Haryana - 122009</div>
            {hasOwnerGST && <div className="header-gstin">GSTIN: {OWNER_GSTIN}</div>}
            <div className="header-address-line">State Name: Haryana, Code: 06</div>
            <div className="header-address-line">Contact: 9910201612, 7428621373</div>
            <div className="header-address-line">Email: vedaarnastudio@gmail.com</div>
            <div className="header-address-line">www.vedaarnastudio.com</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h3 style={{ color: "#7b2a2a", margin: 0, fontSize: 15 }}>TAX INVOICE</h3>
          <div style={{ marginTop: 5, fontSize: 12 }}>
            <div>Invoice #: <strong>{invoiceMeta?.number}</strong></div>
            <div>Date: <strong>{formatDateForDisplay(invoiceMeta?.date)}</strong></div>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <section className="invoice-print-body">

        {/* ── Consignee / Bill To / Dispatch meta ──────────────── */}
        <div className="invoice-bill-to-section">
          <div className="bill-to-col">
            {/* Consignee (Ship to) — only if filled */}
            {dispatchMeta?.shipTo && (
              <div className="consignee-box">
                <div className="box-label">Consignee (Ship to)</div>
                {dispatchMeta.paymentMethod && (
                  <div className="consignee-payment">{dispatchMeta.paymentMethod}</div>
                )}
                <div className="consignee-detail">{dispatchMeta.shipTo}</div>
                <div className="consignee-detail">
                  State Name: {shipState.name}, Code: {shipState.code}
                </div>
              </div>
            )}
            {/* Bill To */}
            <div className={`bill-to box${dispatchMeta?.shipTo ? " bill-to-below" : ""}`}>
              <div className="box-title">Bill To</div>
              <div className="bill-to-name">{customer?.name || "—"}</div>
              {customer?.phone && <div className="bill-to-detail">{customer.phone}</div>}
              {customer?.email && <div className="bill-to-detail">{customer.email}</div>}
              {customer?.address && <div className="bill-to-detail">{customer.address}</div>}
              <div className="bill-to-detail">
                State Name: {billState.name}, Code: {billState.code}
              </div>
              <div className="bill-to-detail">
                GSTIN/UIN: <strong>{recipientGstin}</strong>
              </div>
            </div>
          </div>

          {/* RIGHT: dispatch meta grid */}
          {hasDispatchCol && (
            <div className="dispatch-meta-col">
              <div className="dispatch-meta-grid">
                <div className="dm-cell dm-label">Mode/Terms of Payment</div>
                <div className="dm-cell dm-value">{dispatchMeta.paymentMethod || ""}</div>
                <div className="dm-cell dm-label">Reference No. &amp; Date</div>
                <div className="dm-cell dm-value">{dispatchMeta.refNo || ""}</div>
                <div className="dm-cell dm-label">Buyer Order No.</div>
                <div className="dm-cell dm-value">{dispatchMeta.buyerOrderNo || ""}</div>
                <div className="dm-cell dm-label">Dispatch Doc No.</div>
                <div className="dm-cell dm-value">{dispatchMeta.dispatchDocNo || ""}</div>
                <div className="dm-cell dm-label">Dispatched through</div>
                <div className="dm-cell dm-value">{dispatchMeta.dispatchThrough || ""}</div>
                <div className="dm-cell dm-label">Destination</div>
                <div className="dm-cell dm-value">{dispatchMeta.destination || ""}</div>
                <div className="dm-cell dm-label dm-full">Terms of Delivery</div>
                <div className="dm-cell dm-value dm-full">{dispatchMeta.termsOfDelivery || ""}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Items table ──────────────────────────────────────── */}
        <div className="invoice-table" style={{ marginTop: 10 }}>
          <div className="invoice-table-header">
            <div></div>
            <div>Item</div>
            <div>HSN/SAC</div>
            <div>Qty</div>
            <div>Rate</div>
            <div>Disc</div>
            <div>Tax</div>
            <div>Amount</div>
          </div>

          <AnimatePresence>
            {items.map((it) => {
              const amount    = (it.qty || 0) * (it.rate || 0);
              const disc      = (amount * (it.discount || 0)) / 100;
              const taxable   = amount - disc;
              const tax       = (taxable * (it.tax || 0)) / 100;
              const lineTotal = taxable + tax;

              return (
                <motion.div
                  key={it.id}
                  className="invoice-table-row item-row"
                  layout
                  onMouseEnter={() => setHoveredItemId(it.id)}
                  onMouseLeave={() => { if (confirmItemId !== it.id) setHoveredItemId(null); }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.6fr 2fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <div style={{ position: "relative", textAlign: "center" }}>
                    {hoveredItemId === it.id && (
                      <button
                        className="remove-btn"
                        onClick={(e) => { e.stopPropagation(); setConfirmItemId((cur) => (cur === it.id ? null : it.id)); }}
                        title="Remove item"
                      >−</button>
                    )}
                    <AnimatePresence>
                      {confirmItemId === it.id && (
                        <motion.div
                          className="remove-tooltip"
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
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
                  <div className="col-item">{it.name}</div>
                  <div className="col-sac">{getSAC(it.name)}</div>
                  <div className="col-num">{it.qty}</div>
                  <div className="col-num">{currency(it.rate)}</div>
                  <div className="col-num">{it.discount}%</div>
                  <div className="col-num">{it.tax}%</div>
                  <div className="col-num">{currency(lineTotal)}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Totals ───────────────────────────────────────────── */}
        <div className="invoice-totals">
          <div>Subtotal: <strong>{currency(subtotal)}</strong></div>
          <div>Discount: <strong>- {currency(totalDiscount)}</strong></div>
          {!hasOwnerGST && totalTax > 0 && (
            <div>Tax: <strong>{currency(totalTax)}</strong></div>
          )}
          {advanceAmount > 0 && (
            <div style={{ color: "#b91c1c" }}>
              Advance Payment: <strong>- {currency(advanceAmount)}</strong>
            </div>
          )}
          <div className="invoice-grand-total">
            Grand Total: {currency(finalTotal)}
          </div>
        </div>

        {/* ── Amount in words ──────────────────────────────────── */}
        {items.length > 0 && (
          <div className="amount-in-words-block">
            <span className="aiw-label">Amount Chargeable (in words): </span>
            <span className="aiw-value">INR {numberToWords(finalTotal)}</span>
          </div>
        )}

        {/* ── GST breakdown + Tax in words ─────────────────────── */}
        {hasOwnerGST && items.length > 0 && (
          <div className="gst-section">
            <div className="gst-breakdown-table">
              <div className="gst-breakdown-header">
                <div>HSN/SAC</div>
                <div>Taxable Value</div>
                <div>CGST Rate</div>
                <div>CGST Amt</div>
                <div>SGST Rate</div>
                <div>SGST Amt</div>
                <div>Total Tax</div>
              </div>
              {gstGroups.map(([key, vals]) => (
                <div className="gst-breakdown-row" key={key}>
                  <div>{vals.sac}</div>
                  <div className="col-num">{currency(vals.taxable)}</div>
                  <div className="col-num">{vals.rate / 2}%</div>
                  <div className="col-num">{currency(vals.tax / 2)}</div>
                  <div className="col-num">{vals.rate / 2}%</div>
                  <div className="col-num">{currency(vals.tax / 2)}</div>
                  <div className="col-num">{currency(vals.tax)}</div>
                </div>
              ))}
              <div className="gst-breakdown-total">
                <div><strong>Total</strong></div>
                <div className="col-num"><strong>{currency(taxableAmount)}</strong></div>
                <div></div>
                <div className="col-num"><strong>{currency(totalTax / 2)}</strong></div>
                <div></div>
                <div className="col-num"><strong>{currency(totalTax / 2)}</strong></div>
                <div className="col-num"><strong>{currency(totalTax)}</strong></div>
              </div>
            </div>
            {totalTax > 0 && (
              <div className="tax-in-words-block">
                <span className="aiw-label">Tax Amount (in words): </span>
                <span className="aiw-value">INR {numberToWords(totalTax)}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Declaration + Bank Details ──────────────────────────── */}
      <div className="invoice-declaration-row">
        <div className="invoice-bank-details">
          <div className="bank-title">Company's Bank Details</div>
          <div className="bank-row"><span className="bank-label">Name:</span> Vedaarna Studio</div>
          <div className="bank-row"><span className="bank-label">A/c No.:</span> 926020029896591</div>
          <div className="bank-row"><span className="bank-label">IFS Code:</span> UTIB0000131</div>
          <div className="bank-row"><span className="bank-label">Branch:</span> DLF City Gurgaon</div>
        </div>
        <div className="invoice-declaration">
          <div className="decl-title">Declaration</div>
          <div className="decl-text">
            We declare that this invoice shows the actual price of the goods/services
            described and that all particulars are true and correct.
          </div>
          <div className="decl-signatory">
            <div>for <strong>VedAarna Studio</strong></div>
            <div className="decl-sign-space"></div>
            <div>Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="invoice-print-footer">
        <div className="invoice-footer-jurisdiction">SUBJECT TO HARYANA JURISDICTION</div>
        <div className="invoice-footer-computer">This is a Computer Generated Invoice</div>
        <div className="invoice-footer-banner-text">
          <div className="ifbt-brand-name">VEDAARNA STUDIO</div>
          <div className="ifbt-tagline">A Legacy in Every Stitch</div>
          <div className="ifbt-headline">
            Bridal Blouse, Anarkali &amp; Lehenga, Gowns, Churidars, Western Wear
          </div>
          <div className="ifbt-email">
            <span className="ifbt-icon">✉</span> vedaarnastudio@gmail.com
          </div>
          <div className="ifbt-follow">Follow Us</div>
          <div className="ifbt-social">
            <span className="ifbt-ig-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ verticalAlign: "middle", marginRight: 3 }}>
                <defs>
                  <radialGradient id="ig-grad" cx="30%" cy="107%" r="130%">
                    <stop offset="0%"  stopColor="#fdf497" />
                    <stop offset="20%" stopColor="#fd5949" />
                    <stop offset="45%" stopColor="#d6249f" />
                    <stop offset="75%" stopColor="#285AEB" />
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" fill="url(#ig-grad)" />
                <circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.1" fill="#fff" />
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
