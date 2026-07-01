import React, { useState, useEffect } from 'react';
import './InvoiceForm.css';
import InvoiceActions from "./InvoiceActions";

const OWNER_GSTIN = '06ABCFV1239R1ZP';

export default function InvoiceForm({
  invoiceMeta,
  setInvoiceMeta,
  customer,
  setCustomer,
  addItem,
  invoiceRef,
  totals,
  onReset,
  onInvoiceSent,
  downloadFnRef,
}) {
  const [useOwnerGST, setUseOwnerGST] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    qty: 1,
    rate: 0,
    discount: 0,
    tax: 0,
  });

  // Auto-set tax to 5% when a valid GSTIN is present
  const isValidGST = customer.gstin && customer.gstin.trim() !== '' && customer.gstin.trim().toUpperCase() !== 'NA';
  useEffect(() => {
    setNewItem(prev => ({ ...prev, tax: isValidGST ? 5 : 0 }));
  }, [isValidGST]);

  // Keep radio in sync if user manually clears the GSTIN field
  useEffect(() => {
    if (!customer.gstin || customer.gstin.trim() === '') {
      setUseOwnerGST(false);
    }
  }, [customer.gstin]);

  const handleOwnerGSTToggle = (e) => {
    const checked = e.target.checked;
    setUseOwnerGST(checked);
    setCustomer({ ...customer, gstin: checked ? OWNER_GSTIN : '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    addItem(newItem);
    setNewItem({ name: '', qty: 1, rate: 0, discount: 0, tax: isValidGST ? 5 : 0 });
  };

  return (
    <div className="form-container">
      <div className="form-header-row">
        <h2 className="form-title">VedAarna Invoice Builder</h2>
        <button className="new-invoice-btn" onClick={onReset} title="Clear all fields and start a new invoice">
          + New Invoice
        </button>
      </div>

      {/* -------------------------
          INVOICE META INFO
      -------------------------- */}
      <div className="form-section">
        <label>Invoice #</label>
        <input
          type="text"
          value={invoiceMeta.number || 'VA#1001'}
          onChange={(e) =>
            setInvoiceMeta({ ...invoiceMeta, number: e.target.value })
          }
        />

        <label>Date</label>
        <input
          type="date"
          value={invoiceMeta.date}
          onChange={(e) =>
            setInvoiceMeta({ ...invoiceMeta, date: e.target.value })
          }
        />
      </div>

      {/* -------------------------
          GSTIN & ADVANCE PAYMENT
      -------------------------- */}
      <div className="form-section">
        {/* Add GST radio toggle */}
        <label className="gst-radio-label">
          <input
            type="checkbox"
            className="gst-radio-input"
            checked={useOwnerGST}
            onChange={handleOwnerGSTToggle}
          />
          Add GST (VedAarna Studio)
        </label>
        {useOwnerGST && (
          <div className="gst-reference">
            GSTIN: <strong>{OWNER_GSTIN}</strong>
          </div>
        )}

        <label>GSTIN (optional)</label>
        <input
          type="text"
          value={customer.gstin || ''}
          onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
          placeholder="Enter GSTIN (leave blank or NA if not applicable)"
        />

        {/* ✅ Advance Payment Field */}
        <label>Advance Payment (₹)</label>
        <input
          type="number"
          min="0"
          value={customer.advance || ''}
          onChange={(e) =>
            setCustomer({ ...customer, advance: Number(e.target.value) })
          }
          placeholder="e.g. 1000"
        />
      </div>

      {/* -------------------------
          CUSTOMER DETAILS
      -------------------------- */}
      <div className="form-section">
        <h4>Customer</h4>

        <label>Name</label>
        <input
          type="text"
          value={customer.name}
          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          placeholder="Full Name"
        />

        <label>Phone</label>
        <input
          type="text"
          value={customer.phone}
          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          placeholder="10-digit phone number"
        />

        <label>Email</label>
        <input
          type="email"
          value={customer.email}
          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
          placeholder="Email address"
        />
      </div>

      {/* -------------------------
          ADD ITEM SECTION
      -------------------------- */}
      <div className="form-section">
        <h4>Add Item</h4>

        <label>Item Name</label>
        <input
          type="text"
          name="name"
          placeholder="e.g. Custom Dress"
          value={newItem.name}
          onChange={handleChange}
        />

        <label>Quantity</label>
        <input
          type="number"
          name="qty"
          min="1"
          value={newItem.qty}
          onChange={handleChange}
        />

        <label>Rate (₹)</label>
        <input
          type="number"
          name="rate"
          min="0"
          value={newItem.rate}
          onChange={handleChange}
        />

        <label>Discount (%)</label>
        <input
          type="number"
          name="discount"
          min="0"
          value={newItem.discount}
          onChange={handleChange}
        />

        <label>Tax (%)</label>
        <input
          type="number"
          name="tax"
          min="0"
          value={newItem.tax}
          onChange={handleChange}
        />

        <button className="add-btn" onClick={handleAddItem}>
          + Add Item
        </button>
      </div>

      {/* -------------------------
          INVOICE ACTION BUTTONS
      -------------------------- */}
      <div className="form-section">
        <InvoiceActions
          invoiceRef={invoiceRef}
          customer={customer}
          totals={totals}
          invoiceMeta={invoiceMeta}
          onInvoiceSent={onInvoiceSent}
          downloadFnRef={downloadFnRef}
        />
      </div>
    </div>
  );
}
