import React, { useState, useRef, useEffect } from "react";
import "./InvoiceAgent.css";

const OWNER_GSTIN = "06ABCFV1239R1ZP";

function agentGreeting() {
  return [
    {
      from: "agent",
      text: "👋 Hi! I'm your Invoice Assistant. Let's build your invoice.\n\nWhat's the customer's name?",
    },
  ];
}

export default function InvoiceAgent({ onComplete, onDownload }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(agentGreeting());
  const [step, setStep] = useState("NAME");
  const [input, setInput] = useState("");
  const [tempCustomer, setTempCustomer] = useState({ name: "", phone: "", email: "", gstin: "", advance: 0 });
  const [tempItems, setTempItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ name: "", qty: 1, rate: 0, discount: 0, tax: 0 });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
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
    setTempCustomer({ name: "", phone: "", email: "", gstin: "", advance: 0 });
    setTempItems([]);
    setCurrentItem({ name: "", qty: 1, rate: 0, discount: 0, tax: 0 });
  }

  function handleSend() {
    const val = input.trim();
    setInput("");

    if (step === "DOWNLOAD") return; // handled by buttons
    // Steps that allow empty input (skip)
    const skippable = ["EMAIL", "DISCOUNT", "ADVANCE"];
    if (!val && !skippable.includes(step)) return;

    pushUser(val || "(skipped)");

    switch (step) {
      case "NAME": {
        const name = val || "Customer";
        setTempCustomer(c => ({ ...c, name }));
        pushAgent(`Got it! 📞 What's ${name}'s phone number? (press Enter to skip)`);
        setStep("PHONE");
        break;
      }

      case "PHONE": {
        setTempCustomer(c => ({ ...c, phone: val }));
        pushAgent("📧 Customer email address? (press Enter to skip)");
        setStep("EMAIL");
        break;
      }

      case "EMAIL": {
        setTempCustomer(c => ({ ...c, email: val }));
        pushAgent(
          "🧾 Should I add GST (GSTIN: 06ABCFV1239R1ZP)?\nType *yes* to add GST or *no* to skip."
        );
        setStep("GST");
        break;
      }

      case "GST": {
        const addGST = val.toLowerCase().startsWith("y");
        const gstin = addGST ? OWNER_GSTIN : "";
        setTempCustomer(c => ({ ...c, gstin }));
        if (addGST) {
          pushAgent(`✅ GSTIN set to ${OWNER_GSTIN}. Tax will default to 5%.\n\n💵 Do you want to add an Advance Payment for this customer?\nType *yes* or *no*.`);
        } else {
          pushAgent("No GST added.\n\n💵 Do you want to add an Advance Payment for this customer?\nType *yes* or *no*.");
        }
        setCurrentItem(prev => ({ ...prev, tax: addGST ? 5 : 0 }));
        setStep("ASK_ADVANCE");
        break;
      }

      case "ASK_ADVANCE": {
        if (val.toLowerCase().startsWith("y")) {
          pushAgent("How much Advance Payment (₹)?");
          setStep("ADVANCE");
        } else {
          pushAgent("No advance payment. Let's add items! 📦\nWhat's the first item name?");
          setStep("ITEM_NAME");
        }
        break;
      }

      case "ADVANCE": {
        const advance = Math.max(0, Number(val) || 0);
        setTempCustomer(c => ({ ...c, advance }));
        pushAgent(`✅ Advance Payment: ₹${advance}.\n\nNow let's add items! 📦\nWhat's the first item name?`);
        setStep("ITEM_NAME");
        break;
      }

      case "ITEM_NAME": {
        setCurrentItem(i => ({ ...i, name: val }));
        pushAgent("How many? (Quantity)");
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
        pushAgent("Discount %? (press Enter for 0)");
        setStep("DISCOUNT");
        break;
      }

      case "DISCOUNT": {
        const discount = Math.max(0, Number(val) || 0);
        const finalItem = { ...currentItem, discount, id: `agent-${Date.now()}` };
        const updatedItems = [...tempItems, finalItem];
        setTempItems(updatedItems);

        const amt = finalItem.qty * finalItem.rate;
        const discAmt = (amt * discount) / 100;
        const taxAmt = ((amt - discAmt) * finalItem.tax) / 100;
        const lineTotal = amt - discAmt + taxAmt;

        pushAgent(
          `✅ Added: *${finalItem.name}* × ${finalItem.qty} @ ₹${finalItem.rate} = ₹${lineTotal.toFixed(2)}\n\nAdd another item? (*yes* / *no*)`
        );
        setCurrentItem({ name: "", qty: 1, rate: 0, discount: 0, tax: finalItem.tax });
        setStep("MORE_ITEMS");
        break;
      }

      case "MORE_ITEMS": {
        if (val.toLowerCase().startsWith("y")) {
          pushAgent("What's the next item name?");
          setStep("ITEM_NAME");
        } else {
          // Calculate estimated total including advance deduction
          const advance = tempCustomer.advance || 0;
          const total = tempItems.reduce((acc, it) => {
            const a = it.qty * it.rate;
            const d = (a * it.discount) / 100;
            return acc + (a - d) * (1 + it.tax / 100);
          }, 0);
          const finalTotal = total - advance;
          pushAgent(
            `🎉 Invoice ready!\n\n*${tempItems.length} item(s)*\nSubtotal: ₹${total.toFixed(2)}${advance > 0 ? `\nAdvance: -₹${advance}` : ""}\nEst. Total: ₹${finalTotal.toFixed(2)}\n\nHow would you like to download it?`
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
    pushAgent(`⏳ Generating your ${type}... Invoice has been filled in the form.`);
    // 1. Populate the form with agent-collected data
    onComplete({ customer: tempCustomer, items: tempItems });
    // 2. Trigger the actual download after a short delay
    //    (delay gives React time to update state + invoiceRef DOM)
    setTimeout(() => {
      if (onDownload) onDownload(type);
      setTimeout(() => {
        pushAgent("✅ Done! Want to build another invoice? Click *Reset* below.");
      }, 600);
    }, 400);
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
          {/* Header */}
          <div className="agent-panel__header">
            <span>🤖 Invoice Agent</span>
            <div className="agent-panel__header-actions">
              <button className="agent-reset-btn" onClick={resetAgent} title="Start over">
                Reset
              </button>
              <button className="agent-close-btn" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="agent-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`agent-bubble agent-bubble--${msg.from}`}
              >
                {msg.text.split("\n").map((line, i) => (
                  <span key={i}>
                    {line
                      .split(/(\*[^*]+\*)/)
                      .map((part, j) =>
                        part.startsWith("*") && part.endsWith("*") ? (
                          <strong key={j}>{part.slice(1, -1)}</strong>
                        ) : (
                          part
                        )
                      )}
                    {i < msg.text.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}

            {/* Download action buttons */}
            {showDownloadButtons && (
              <div className="agent-download-btns">
                {["PDF", "A5 PDF", "Image", "WhatsApp"].map(type => (
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

          {/* Input */}
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
              <button className="agent-send-btn" onClick={handleSend}>
                ➤
              </button>
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
