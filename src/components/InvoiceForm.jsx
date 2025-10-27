import React, { useState } from 'react';
import './InvoiceForm.css';
import InvoiceActions from "./InvoiceActions";

export default function InvoiceForm({
  invoiceMeta,
  setInvoiceMeta,
  customer,
  setCustomer,
  addItem,
  invoiceRef,       // ✅ Add this prop
  grandTotal,       // ✅ Add this prop (from App.jsx)
}) {
  const [newItem, setNewItem] = useState({
    name: '',
    qty: 1,
    rate: 0,
    discount: 0,
    tax: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    addItem(newItem);
    setNewItem({ name: '', qty: 1, rate: 0, discount: 0, tax: 0 });
  };

  return (
    <div className="form-container">
      <h2 className="form-title">VedAarna Invoice Builder</h2>

      {/* Invoice Info */}
      <div className="form-section">
        <label>Invoice #</label>
        <input
          type="text"
          value={invoiceMeta.number}
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

      {/* Customer Info */}
      <div className="form-section">
        <h4>Customer</h4>

        <label>Name</label>
        <input
          type="text"
          value={customer.name}
          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
        />

        <label>Phone</label>
        <input
          type="text"
          value={customer.phone}
          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
        />

        <label>Email</label>
        <input
          type="email"
          value={customer.email}
          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
        />
      </div>

      {/* Add Item */}
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

      {/* ---- Invoice Actions Section ---- */}
      <div className="form-section">
        <InvoiceActions
          invoiceRef={invoiceRef}
          customer={customer}
          totals={{ grandTotal }}
        />
      </div>
    </div>
  );
}
