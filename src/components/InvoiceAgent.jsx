import React, { useState, useRef, useEffect } from "react";
import "./InvoiceAgent.css";

const OWNER_GSTIN = "06ABCFV1239R1ZP";

// Steps in order
// CUSTOMER: NAME → PHONE → ADDRESS → EMAIL → RECIPIENT_GST → GST → ASK_ADVANCE → ADVANCE
// DISPATCH: ASK_DISPATCH → SHIP_TO → PAYMENT_METHOD → REF_NO → BUYER_ORDER → DISPATCH_DOC → DISPATCH_THROUGH → DESTINATION → TERMS
// ITEMS:    ITEM_NAME → QTY → RATE → DISCOUNT → MORE_ITEMS
// DONE:     DOWNLOAD

function agentGreeting() {
  return [
    {
      from: "agent",
      text:
        "👋 Hi! I'm your Invoice Assistant — now updated with all the latest VedAarna invoice features.\n\nLet's build your invoice step by step.\n\nWhat's the *customer's full name*?",
    },
  ];
}

const EMPTY_CUSTOMER = {
  name: "", phone: "", email: "", address: "",
  gstin: "", recipientGstin: "", advance: 0,
};

const EMPTY_DISPATCH = {
  shipTo: "", paymentMethod: "", refNo: "", buyerOrderNo: "",
  dispatchDocNo: "", dispatchThrough: "", destination: "", termsOfDelivery: "",
};

export default function InvoiceAgent({ onComplete, onDownload }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState(agentGreeting());
  const [step, setStep]         = useState("NAME");
  const [input, setInput]       = useState("");

  const [tempCustomer, setTempCustomer]   = useState({ ...EMPTY_CUSTOMER });
  const [tempDispatch, setTempDispatch]   = useState({ ...EMPTY_DISPATCH });
  const [tempItems, setTempItems]         = useState([]);
  const [currentItem, setCurrentItem]     = useState({ name: "", qty: 1, rate: 0, discount: 0, tax: 0 });

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  function pushAgent(text) {
    setMessages(prev => [...prev, { from: "agent", text }]);
  }
  function pushUser(text) {
    setMessages(prev => [...prev, { from: "user", text }]);
  }

  function resetAgent() {
    setMessages(agentGreeting());
    setStep("NAME");
    setInput("");
    setTempCustomer({ ...EMPTY_CUSTOMER });
    setTempDispatch({ ...EMPTY_DISPATCH });
    setTempItems([]);
    setCurrentItem({ name: "", qty: 1, rate: 0, discount: 0, tax: 0 });
  }

  // Steps that accept empty input (Enter = skip)
  const SKIPPABLE = ["PHONE", "ADDRESS", "EMAIL", "RECIPIENT_GST", "DISCOUNT", "ADVANCE",
    "SHIP_TO", "PAYMENT_METHOD", "REF_NO", "BUYER_ORDER", "DISPATCH_DOC",
    "DISPATCH_THROUGH", "DESTINATION", "TERMS"];

  function handleSend() {
    const val = input.trim();
    setInput("");

    if (step === "DOWNLOAD") return;
    if (!val && !SKIPPABLE.includes(step)) return;

    pushUser(val || "(skipped)");

    switch (step) {

      // ── CUSTOMER DETAILS ──────────────────────────────────────────────────
      case "NAME": {
        const name = val || "Customer";
        setTempCustomer(c => ({ ...c, name }));
        pushAgent(`Got it! 📞 What's ${name}'s *phone number*? (Enter to skip)`);
        setStep("PHONE");
        break;
      }

      case "PHONE": {
        setTempCustomer(c => ({ ...c, phone: val }));
        pushAgent("🏠 Customer *billing address*? (Enter to skip)\n_e.g. A-22, Whitefield, Bangalore_");
        setStep("ADDRESS");
        break;
      }

      case "ADDRESS": {
        setTempCustomer(c => ({ ...c, address: val }));
        // Auto-detect state in confirmation
        const stateHint = val
          ? `\n_(State will be auto-detected from the address for GST compliance)_`
          : "";
        pushAgent(`📧 Customer *email address*? (Enter to skip)${stateHint}`);
        setStep("EMAIL");
        break;
      }

      case "EMAIL": {
        setTempCustomer(c => ({ ...c, email: val }));
        pushAgent(
          "🏷️ Does the customer have their own *GSTIN/UIN* to add to the invoice?\n(Enter their GSTIN, or press Enter to leave as N/A)"
        );
        setStep("RECIPIENT_GST");
        break;
      }

      case "RECIPIENT_GST": {
        setTempCustomer(c => ({ ...c, recipientGstin: val }));
        pushAgent(
          "🧾 Should I add *VedAarna Studio GST* (06ABCFV1239R1ZP)?\nType *yes* to add GST or *no* to skip."
        );
        setStep("GST");
        break;
      }

      case "GST": {
        const addGST = val.toLowerCase().startsWith("y");
        const gstin  = addGST ? OWNER_GSTIN : "";
        setTempCustomer(c => ({ ...c, gstin }));
        setCurrentItem(prev => ({ ...prev, tax: addGST ? 5 : 0 }));
        if (addGST) {
          pushAgent(`✅ GSTIN set. Tax will default to *5%*.\n\n💵 Any *Advance Payment* received? Type *yes* or *no*.`);
        } else {
          pushAgent("No GST added.\n\n💵 Any *Advance Payment* received? Type *yes* or *no*.");
        }
        setStep("ASK_ADVANCE");
        break;
      }

      case "ASK_ADVANCE": {
        if (val.toLowerCase().startsWith("y")) {
          pushAgent("How much Advance Payment (₹)?");
          setStep("ADVANCE");
        } else {
          pushAgent("OK! 🚚 Do you want to add *dispatch/shipping details*?\n(Reference no., payment method, destination etc.)\nType *yes* or *no*.");
          setStep("ASK_DISPATCH");
        }
        break;
      }

      case "ADVANCE": {
        const advance = Math.max(0, Number(val) || 0);
        setTempCustomer(c => ({ ...c, advance }));
        pushAgent(`✅ Advance: ₹${advance}.\n\n🚚 Do you want to add *dispatch/shipping details*?\nType *yes* or *no*.`);
        setStep("ASK_DISPATCH");
        break;
      }

      // ── DISPATCH DETAILS ──────────────────────────────────────────────────
      case "ASK_DISPATCH": {
        if (val.toLowerCase().startsWith("y")) {
          pushAgent("📦 *Consignee / Ship To* address? (Enter to skip)\n_e.g. Online  /  A-22, Whitefield, Bangalore_");
          setStep("SHIP_TO");
        } else {
          pushAgent("📦 Let's add items!\nWhat's the *first item name*?\n\n_Tip: Include keywords like 'Lux', 'Alteration' for auto SAC code detection._");
          setStep("ITEM_NAME");
        }
        break;
      }

      case "SHIP_TO": {
        setTempDispatch(d => ({ ...d, shipTo: val }));
        pushAgent("💳 *Payment method*? (Cash / Online / Card / UPI / Cheque — Enter to skip)");
        setStep("PAYMENT_METHOD");
        break;
      }

      case "PAYMENT_METHOD": {
        setTempDispatch(d => ({ ...d, paymentMethod: val }));
        pushAgent("🔖 *Reference No. & Date*? (Enter to skip)");
        setStep("REF_NO");
        break;
      }

      case "REF_NO": {
        setTempDispatch(d => ({ ...d, refNo: val }));
        pushAgent("📋 *Buyer Order No.*? (Enter to skip)");
        setStep("BUYER_ORDER");
        break;
      }

      case "BUYER_ORDER": {
        setTempDispatch(d => ({ ...d, buyerOrderNo: val }));
        pushAgent("📄 *Dispatch Doc No.*? (Enter to skip)");
        setStep("DISPATCH_DOC");
        break;
      }

      case "DISPATCH_DOC": {
        setTempDispatch(d => ({ ...d, dispatchDocNo: val }));
        pushAgent("🚛 *Dispatched through* (courier/transporter)? (Enter to skip)\n_e.g. DTDC / Self_");
        setStep("DISPATCH_THROUGH");
        break;
      }

      case "DISPATCH_THROUGH": {
        setTempDispatch(d => ({ ...d, dispatchThrough: val }));
        pushAgent("📍 *Destination*? (Enter to skip)\n_e.g. Mumbai_");
        setStep("DESTINATION");
        break;
      }

      case "DESTINATION": {
        setTempDispatch(d => ({ ...d, destination: val }));
        pushAgent("📜 *Terms of Delivery*? (Enter to skip)\n_e.g. Ex-Works_");
        setStep("TERMS");
        break;
      }

      case "TERMS": {
        setTempDispatch(d => ({ ...d, termsOfDelivery: val }));
        pushAgent("✅ Dispatch details saved!\n\n📦 Now let's add items.\nWhat's the *first item name*?\n\n_Tip: Use 'Lux' / 'Luxury' for SAC 998391 (18%), 'Alt' / 'Alteration' for SAC 998723, or any other name for SAC 998822 (5%)._");
        setStep("ITEM_NAME");
        break;
      }

      // ── ITEM DETAILS ──────────────────────────────────────────────────────
      case "ITEM_NAME": {
        setCurrentItem(i => ({ ...i, name: val }));
        // Give SAC hint based on name
        const n = val.toLowerCase();
        let sacHint = "";
        if (/\balt\b|alteration/.test(n))
          sacHint = " _(SAC 998723 — Alteration detected)_";
        else if (/special\s*design|luxury|lux\b|customized\s*designer/.test(n))
          sacHint = " _(SAC 998391 — Luxury/Designer detected, remember to set 18% tax)_";
        else
          sacHint = " _(SAC 998822 — General stitching)_";
        pushAgent(`${sacHint}\nQuantity?`);
        setStep("QTY");
        break;
      }

      case "QTY": {
        const qty = Math.max(1, Number(val) || 1);
        setCurrentItem(i => ({ ...i, qty }));
        pushAgent("Rate per item (₹)?");
        setStep("RATE");
        break;
      }

      case "RATE": {
        const rate = Math.max(0, Number(val) || 0);
        setCurrentItem(i => ({ ...i, rate }));
        pushAgent(`Tax %? (press Enter for ${currentItem.tax}%)\n_5% for standard stitching · 18% for luxury/designer · 0% if no GST_`);
        setStep("TAX");
        break;
      }

      case "TAX": {
        const tax = val !== "" ? Math.max(0, Number(val) || 0) : currentItem.tax;
        setCurrentItem(i => ({ ...i, tax }));
        pushAgent("Discount %? (Enter for 0%)");
        setStep("DISCOUNT");
        break;
      }

      case "DISCOUNT": {
        const discount  = Math.max(0, Number(val) || 0);
        const finalItem = { ...currentItem, discount, tax: currentItem.tax, id: `agent-${Date.now()}` };
        const updatedItems = [...tempItems, finalItem];
        setTempItems(updatedItems);

        const amt       = finalItem.qty * finalItem.rate;
        const discAmt   = (amt * discount) / 100;
        const taxAmt    = ((amt - discAmt) * finalItem.tax) / 100;
        const lineTotal = amt - discAmt + taxAmt;

        pushAgent(
          `✅ Added: *${finalItem.name}* × ${finalItem.qty} @ ₹${finalItem.rate}` +
          `${discount > 0 ? ` (${discount}% disc)` : ""} + ${finalItem.tax}% tax = *₹${lineTotal.toFixed(2)}*\n\nAdd another item? (*yes* / *no*)`
        );
        setCurrentItem({ name: "", qty: 1, rate: 0, discount: 0, tax: finalItem.tax });
        setStep("MORE_ITEMS");
        break;
      }

      case "MORE_ITEMS": {
        if (val.toLowerCase().startsWith("y")) {
          pushAgent("What's the next item name?\n\n_Remember: 'Lux'/'Luxury' → SAC 998391 (18%) · 'Alt'/'Alteration' → SAC 998723 · others → SAC 998822 (5%)_");
          setStep("ITEM_NAME");
        } else {
          const advance    = tempCustomer.advance || 0;
          const subtotal   = tempItems.reduce((acc, it) => acc + it.qty * it.rate, 0);
          const totalDisc  = tempItems.reduce((acc, it) => acc + it.qty * it.rate * (it.discount / 100), 0);
          const totalTax   = tempItems.reduce((acc, it) => {
            const taxable = it.qty * it.rate * (1 - it.discount / 100);
            return acc + taxable * (it.tax / 100);
          }, 0);
          const grandTotal = subtotal - totalDisc + totalTax;
          const finalTotal = grandTotal - advance;

          pushAgent(
            `🎉 Invoice ready!\n\n` +
            `*${tempItems.length} item(s)*\n` +
            `Subtotal: ₹${subtotal.toFixed(2)}\n` +
            (totalDisc > 0 ? `Discount: -₹${totalDisc.toFixed(2)}\n` : "") +
            (totalTax > 0 ? `Tax: ₹${totalTax.toFixed(2)}\n` : "") +
            (advance > 0 ? `Advance: -₹${advance}\n` : "") +
            `*Grand Total: ₹${finalTotal.toFixed(2)}*\n\nHow would you like to download it?`
          );
          setStep("DOWNLOAD");
        }
        break;
      }

      default:
        break;
    }
  }

  function handleDownload(type) {
    pushUser(type);
    pushAgent(`⏳ Generating your ${type}…`);
    // Populate form with all collected data (customer + dispatch)
    onComplete({ customer: tempCustomer, items: tempItems, dispatchMeta: tempDispatch });
    setTimeout(() => {
      if (onDownload) onDownload(type);
      setTimeout(() => {
        pushAgent("✅ Done! Want to build another invoice? Click *Reset* below.");
      }, 600);
    }, 500);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend();
  }

  const showDownloadButtons = step === "DOWNLOAD";

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`agent-fab ${open ? "agent-fab--open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="Invoice Agent"
        aria-label="Open Invoice Agent"
      >
        {open ? "✕" : "🤖"}
        <span className="agent-fab-label">{open ? "Close" : "Invoice Agent"}</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="agent-panel" role="dialog" aria-label="Invoice Agent">
          <div className="agent-panel__header">
            <span>🤖 Invoice Agent</span>
            <div className="agent-panel__header-actions">
              <button className="agent-reset-btn" onClick={resetAgent} title="Start over">Reset</button>
              <button className="agent-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          <div className="agent-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`agent-bubble agent-bubble--${msg.from}`}>
                {msg.text.split("\n").map((line, i) => (
                  <span key={i}>
                    {line
                      .split(/(\*[^*]+\*|_[^_]+_)/)
                      .map((part, j) => {
                        if (part.startsWith("*") && part.endsWith("*"))
                          return <strong key={j}>{part.slice(1, -1)}</strong>;
                        if (part.startsWith("_") && part.endsWith("_"))
                          return <em key={j} style={{ color: "#888", fontSize: "0.9em" }}>{part.slice(1, -1)}</em>;
                        return part;
                      })}
                    {i < msg.text.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}

            {/* Download buttons */}
            {showDownloadButtons && (
              <div className="agent-download-btns">
                {["PDF", "Multi-page PDF", "Image", "WhatsApp"].map(type => (
                  <button
                    key={type}
                    className="agent-dl-btn"
                    onClick={() => handleDownload(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!showDownloadButtons && (
            <div className="agent-input-row">
              <input
                ref={inputRef}
                className="agent-input"
                type="text"
                placeholder="Type your answer…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="agent-send-btn" onClick={handleSend}>➤</button>
            </div>
          )}

          <div className="agent-hint">
            Prefer manual input?{" "}
            <button className="agent-switch-link" onClick={() => setOpen(false)}>
              Use the form instead
            </button>
          </div>
        </div>
      )}
    </>
  );
}
