import React, { useState } from 'react'

export default function ItemInput({ onAdd }) {
  const [item, setItem] = useState({ name: '', qty: 1, rate: 0, discount: 0, tax: 0 })

  function handleAdd() {
    if (!item.name || item.rate <= 0) return alert('Please enter valid item and rate')
    onAdd(item)
    setItem({ name: '', qty: 1, rate: 0, discount: 0, tax: 0 })
  }

  const inputStyle = {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    borderRadius: '6px',
    border: '1px solid #ccc',
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Add Item</h3>

      <label>Item Name</label>
      <input
        placeholder="e.g. Custom Dress"
        style={inputStyle}
        value={item.name}
        onChange={e => setItem({ ...item, name: e.target.value })}
      />

      <label>Quantity</label>
      <input
        type="number"
        style={inputStyle}
        value={item.qty}
        onChange={e => setItem({ ...item, qty: Number(e.target.value) })}
      />

      <label>Rate (₹)</label>
      <input
        type="number"
        style={inputStyle}
        value={item.rate}
        onChange={e => setItem({ ...item, rate: Number(e.target.value) })}
      />

      <label>Discount (%)</label>
      <input
        type="number"
        style={inputStyle}
        value={item.discount}
        onChange={e => setItem({ ...item, discount: Number(e.target.value) })}
      />

      <label>Tax (%)</label>
      <input
        type="number"
        style={inputStyle}
        value={item.tax}
        onChange={e => setItem({ ...item, tax: Number(e.target.value) })}
      />

      <button
        onClick={handleAdd}
        style={{
          width: '100%',
          background: '#7b2a2a',
          color: '#fff',
          padding: 10,
          borderRadius: 6,
          fontWeight: 600,
        }}
      >
        + Add Item
      </button>
    </div>
  )
}
