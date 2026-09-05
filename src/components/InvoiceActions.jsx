import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";
import "./InvoiceActions.css";

// ─── EmailJS configuration ────────────────────────────────────────────────────
// Sign up free at https://emailjs.com, connect vedaarnastudio@gmail.com as a
// Gmail service, create a template, then paste your IDs here.
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";   // e.g. "service_xxxxxxx"
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";  // e.g. "template_xxxxxxx"
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";   // e.g. "abcXXXXXXXXXXXXXX"
// ─────────────────────────────────────────────────────────────────────────────

// A4 page dimensions
const A4_W_MM    = 210;
const A4_H_MM    = 297;
const A4_PX_WIDTH = 794; // 210mm at 96dpi

// Items per page: ~14 rows fit comfortably on A4 at 13px font
const A4_ITEMS_PER_PAGE = 14;

/** Render an off-screen DOM node to a canvas via html2canvas */
async function nodeToCanvas(node, pxWidth) {
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: pxWidth || node.scrollWidth,
    height: node.scrollHeight,
    windowWidth: pxWidth || node.scrollWidth,
    windowHeight: node.scrollHeight,
  });
}

/**
 * Build a clone of the invoice node sized for a specific px width,
 * showing only the given item rows plus optional sections.
 *
 * showBillTo   — show Bill To box (first page only)
 * showTotals   — show totals + amount-in-words + GST section (last page only)
 * showDecl     — show declaration+bank row (last page only)
 * showFooter   — show footer banner (last page only)
 */
function buildPageNode(originalNode, rowEls, pxWidth, {
  showBillTo, showTotals, showDecl, showFooter,
}) {
  const clone = originalNode.cloneNode(true);

  clone.style.width        = `${pxWidth}px`;
  clone.style.boxSizing    = "border-box";
  clone.style.position     = "absolute";
  clone.style.left         = "-9999px";
  clone.style.top          = "0";
  clone.style.background   = "#fff";
  clone.style.fontSize     = "12px";
  clone.style.lineHeight   = "1.4";
  clone.style.padding      = "16px 20px";
  clone.style.borderRadius = "0";
  clone.style.boxShadow    = "none";
  clone.style.height       = "auto";
  clone.style.minHeight    = "0";
  clone.style.overflow     = "visible";
  clone.style.display      = "block"; // block so height = natural content height

  // Strip interactive elements
  clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());

  // Bill To
  const billToSection = clone.querySelector(".invoice-bill-to-section");
  if (billToSection) billToSection.style.display = showBillTo ? "" : "none";

  // Force table header visible (media query may hide it at small widths)
  const tableHeader = clone.querySelector(".invoice-table-header");
  if (tableHeader) {
    tableHeader.style.display = "grid";
    tableHeader.style.gridTemplateColumns = "0.6fr 2fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr";
  }

  // Replace item rows with only the slice for this page
  clone.querySelectorAll(".invoice-table-row").forEach(r => r.remove());
  const tableEl = clone.querySelector(".invoice-table");
  if (tableEl) rowEls.forEach(row => tableEl.appendChild(row.cloneNode(true)));

  // Totals block + amount-in-words + GST section (hidden on non-last pages)
  const totalsEl = clone.querySelector(".invoice-totals");
  if (totalsEl) totalsEl.style.display = showTotals ? "" : "none";

  const aiwEl = clone.querySelector(".amount-in-words-block");
  if (aiwEl) aiwEl.style.display = showTotals ? "" : "none";

  const gstEl = clone.querySelector(".gst-section");
  if (gstEl) gstEl.style.display = showTotals ? "" : "none";

  // Declaration + bank row
  const declEl = clone.querySelector(".invoice-declaration-row");
  if (declEl) declEl.style.display = showDecl ? "" : "none";

  // Footer
  const footerEl = clone.querySelector(".invoice-print-footer");
  if (footerEl) footerEl.style.display = showFooter ? "" : "none";

  return clone;
}

export default function InvoiceActions({ invoiceRef, customer, totals, invoiceMeta, onInvoiceSent, downloadFnRef }) {
  const [loading, setLoading] = useState(false);

  // Register download functions into the shared ref so InvoiceAgent can call them
  useEffect(() => {
    if (downloadFnRef) {
      downloadFnRef.current = {
        generatePDF,
        downloadBillImage,
        downloadInvoiceMultiPage,
        whatsappShare,
      };
    }
  });

  /**
   * Shared sectioned A4 PDF renderer.
   * Splits item rows across pages (A4_ITEMS_PER_PAGE per page).
   * Header is repeated on every page. Bill To only on page 1.
   * Totals, amount-in-words, GST breakdown, declaration, footer only on last page.
   */
  async function renderSectionedPDF(pageFormat = "a4") {
    const originalNode = invoiceRef.current;
    const allRowEls = Array.from(originalNode.querySelectorAll(".invoice-table-row"));

    if (allRowEls.length === 0) {
      toast.warn("No items to include in the invoice.");
      return null;
    }

    const PX_WIDTH = A4_PX_WIDTH;
    const W_MM     = A4_W_MM;
    const H_MM     = A4_H_MM;
    const PER_PAGE = A4_ITEMS_PER_PAGE;

    // Chunk rows
    const pages = [];
    for (let i = 0; i < allRowEls.length; i += PER_PAGE) {
      pages.push(allRowEls.slice(i, i + PER_PAGE));
    }
    const totalPages = pages.length;
    const pdf = new jsPDF("p", "mm", pageFormat);

    for (let idx = 0; idx < totalPages; idx++) {
      const isFirst = idx === 0;
      const isLast  = idx === totalPages - 1;

      const pageNode = buildPageNode(originalNode, pages[idx], PX_WIDTH, {
        showBillTo: isFirst,
        showTotals: isLast,
        showDecl:   isLast,
        showFooter: isLast,
      });

      document.body.appendChild(pageNode);
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await nodeToCanvas(pageNode, PX_WIDTH);
      document.body.removeChild(pageNode);

      const imgData    = canvas.toDataURL("image/png");
      const canvasH_mm = (canvas.height / canvas.width) * W_MM;

      if (idx > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, W_MM, canvasH_mm, undefined, "FAST");
    }

    return pdf;
  }

  /** Download A4 PDF */
  async function generatePDF(saveLocally = true) {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }
    try {
      setLoading(true);
      const pdf = await renderSectionedPDF("a4");
      if (!pdf) { setLoading(false); return; }

      const filename = `VedAarna_${customer.name || "Invoice"}.pdf`;
      if (saveLocally) {
        pdf.save(filename);
        if (onInvoiceSent) onInvoiceSent();
      }
      setLoading(false);
      return { pdf, filename, blob: pdf.output("blob") };
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF.");
      setLoading(false);
    }
  }

  /** Download Bill Image (PNG) */
  async function downloadBillImage() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      const node = invoiceRef.current;

      const clone = node.cloneNode(true);
      clone.style.width     = "900px";
      clone.style.position  = "absolute";
      clone.style.left      = "-9999px";
      clone.style.top       = "0";
      clone.style.background = "#fff";
      clone.style.height    = "auto";
      clone.style.overflow  = "visible";
      clone.style.boxSizing = "border-box";
      clone.style.display   = "block"; // block so scrollHeight = natural content height
      clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());
      document.body.appendChild(clone);

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r)); // extra frame for banner bg paint

      // Use scrollHeight — fully reliable regardless of scroll position
      const naturalH = clone.scrollHeight;

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: naturalH,
        windowWidth: clone.scrollWidth,
        windowHeight: naturalH,
      });

      document.body.removeChild(clone);

      // No crop needed — scrollHeight already matches exact content height
      const cropped = canvas;

      const image = cropped.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `VedAarna_${customer.name || "Invoice"}.png`;
      link.click();

      setLoading(false);
    } catch (err) {
      console.error("Image download failed:", err);
      toast.error("Failed to generate image.");
      setLoading(false);
    }
  }

  /** Send invoice details via EmailJS to vedaarnastudio@gmail.com */
  async function uploadAndSend() {
    if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID") {
      toast.warn("EmailJS is not configured yet. Please set Service ID, Template ID, and Public Key in InvoiceActions.jsx.");
      return;
    }

    try {
      setLoading(true);

      const invoiceDate = invoiceMeta?.date || new Date().toLocaleDateString("en-IN");
      const invoiceNumber = invoiceMeta?.number || "VA#1001";
      const customerName = customer.name || "Customer";

      const templateParams = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_name: customerName,
        customer_phone: customer.phone || "—",
        customer_email: customer.email || "—",
        customer_gstin: customer.gstin || "Not applicable",
        invoice_subtotal: (totals.subtotal || 0).toFixed(2),
        invoice_discount: (totals.totalDiscount || 0).toFixed(2),
        invoice_tax: (totals.totalTax || 0).toFixed(2),
        invoice_total: (totals.grandTotal || 0).toFixed(2),
        // subject line tokens used by EmailJS template
        subject: `VedAarna Invoice — ${customerName} | ${invoiceDate}`,
        to_email: "vedaarnastudio@gmail.com",
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      toast.success(`Invoice emailed to vedaarnastudio@gmail.com ✓`);
    } catch (err) {
      console.error("Email failed:", err);
      toast.error("Failed to send email. Check EmailJS configuration.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Share on WhatsApp with invoice image attached.
   *
   * Strategy:
   *  1. Render the invoice to a PNG canvas (same pipeline as downloadBillImage).
   *  2. Try the Web Share API (navigator.share with files) — works on Android
   *     Chrome / Safari iOS and opens WhatsApp directly with the image.
   *  3. If Web Share API is unavailable (desktop / unsupported browser):
   *     - Auto-download the PNG so the user has it in hand.
   *     - Open wa.me with the pre-filled text message.
   *     - Show a toast guiding them to manually attach the saved image.
   *
   * WhatsApp does NOT accept file attachments via the wa.me URL scheme —
   * this two-step approach is the standard solution used by all invoicing apps.
   */
  async function whatsappShare() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    const invoiceNumber = invoiceMeta?.number || "VA#1001";
    const invoiceDate   = invoiceMeta?.date   || "";
    const customerName  = customer.name       || "—";
    const text = [
      `🧵 *VedAarna Studio — Invoice*`,
      `Invoice #: ${invoiceNumber}`,
      `Date: ${invoiceDate}`,
      `Customer: ${customerName}`,
      `Total: ₹${(totals.grandTotal || 0).toFixed(2)}`,
      ``,
      `Thank you for shopping at VedAarna Studio! 🙏`,
    ].join("\n");

    try {
      setLoading(true);

      // ── Step 1: render invoice to PNG canvas ──────────────────────────
      const node  = invoiceRef.current;
      const clone = node.cloneNode(true);
      clone.style.width         = "900px";
      clone.style.position      = "absolute";
      clone.style.left          = "-9999px";
      clone.style.top           = "0";
      clone.style.background    = "#fff";
      clone.style.height        = "auto";
      clone.style.overflow      = "visible";
      clone.style.boxSizing     = "border-box";
      clone.style.display = "block";
      clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());
      document.body.appendChild(clone);

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const naturalH = clone.scrollHeight;

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: naturalH,
        windowWidth: clone.scrollWidth,
        windowHeight: naturalH,
      });
      document.body.removeChild(clone);

      const cropped = canvas;

      const filename = `VedAarna_${customerName}.png`;

      // ── Step 2: try Web Share API (mobile browsers) ───────────────────
      const canShareFiles =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function";

      if (canShareFiles) {
        // Convert cropped canvas → Blob → File
        const blob = await new Promise(resolve => cropped.toBlob(resolve, "image/png"));
        const file = new File([blob], filename, { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `VedAarna Invoice — ${customerName}`,
            text,
            files: [file],
          });
          setLoading(false);
          return; // share sheet opened — done
        }
      }

      // ── Step 3: fallback — download PNG + open wa.me with text ────────
      // Auto-save the image so the user can attach it manually
      const dataUrl = cropped.toDataURL("image/png");
      const link    = document.createElement("a");
      link.href     = dataUrl;
      link.download = filename;
      link.click();

      // Open WhatsApp with the pre-filled text
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");

      toast.info(
        "Invoice image saved! Tap the 📎 attachment icon in WhatsApp and select the downloaded image.",
        { autoClose: 7000 }
      );
    } catch (err) {
      // User cancelled the share sheet — not an error
      if (err?.name === "AbortError") {
        /* silent */
      } else {
        console.error("WhatsApp share failed:", err);
        toast.error("Could not share invoice. Try downloading it manually.");
      }
    } finally {
      setLoading(false);
    }
  }

  /** Download multi-page A4 PDF (14 items per page) — same engine as generatePDF */
  async function downloadInvoiceMultiPage() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }
    try {
      setLoading(true);
      const pdf = await renderSectionedPDF("a4");
      if (!pdf) { setLoading(false); return; }
      const filename = `VedAarna_${customer.name || "Invoice"}_multipage.pdf`;
      pdf.save(filename);
      toast.success("Multi-page PDF downloaded!");
    } catch (err) {
      console.error("Multi-page PDF error:", err);
      toast.error("Failed to generate multi-page PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="invoice-actions">
      <button
        className="btn-primary"
        onClick={() => generatePDF(true)}
        disabled={loading}
      >
        {loading ? "Generating..." : "Download PDF"}
      </button>

      <button
        className="btn-image"
        onClick={downloadBillImage}
        disabled={loading}
      >
        {loading ? "Processing..." : "Download Bill Image"}
      </button>

      <button
        className="btn-secondary"
        onClick={uploadAndSend}
        disabled={loading}
      >
        {loading ? "Sending..." : "Email + Upload"}
      </button>

      <button
        className="btn-whatsapp"
        onClick={whatsappShare}
        disabled={loading}
      >
        {loading ? "Preparing..." : "Share on WhatsApp"}
      </button>

      <button
        className="btn-a5"
        onClick={downloadInvoiceMultiPage}
        disabled={loading}
      >
        {loading ? "Processing..." : "Download Multi-page PDF"}
      </button>
    </div>
  );
}
