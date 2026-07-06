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

// A5 page dimensions in mm
const A5_W_MM = 148;
// Pixel width for DOM rendering (148mm at ~96dpi ≈ 559px)
const A5_PX_WIDTH = 560;
const ITEMS_PER_PAGE = 7;

/** Render an off-screen DOM node to a canvas via html2canvas */
async function nodeToCanvas(node) {
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });
}

/** Add a canvas image to a jsPDF page, fitting to A5 page width */
function addCanvasToPage(pdf, canvas, isFirstPage) {
  const imgData = canvas.toDataURL("image/png");
  const canvasAspect = canvas.height / canvas.width;
  const imgH = A5_W_MM * canvasAspect;
  if (!isFirstPage) pdf.addPage();
  pdf.addImage(imgData, "PNG", 0, 0, A5_W_MM, imgH);
}

/** Build a styled A5-sized clone of the invoice node showing only the given rows */
function buildA5PageNode(originalNode, rowEls, { showBillTo, showTotals, showFooter }) {
  const clone = originalNode.cloneNode(true);

  // Size the clone for A5
  clone.style.width = `${A5_PX_WIDTH}px`;
  clone.style.boxSizing = "border-box";
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.background = "#fff";
  clone.style.fontSize = "11px";
  clone.style.lineHeight = "1.35";
  clone.style.padding = "14px 16px";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  // flex column must be kept so footer stays at bottom
  clone.style.display = "flex";
  clone.style.flexDirection = "column";

  // Remove interactive elements
  clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());

  // Bill To / Payable To section
  const billToSection = clone.querySelector(".invoice-header-section");
  if (billToSection) billToSection.style.display = showBillTo ? "" : "none";

  // FORCE the table header row to show — the @media (max-width:700px) rule
  // hides it when the clone width is 560px, so override it explicitly here
  const tableHeader = clone.querySelector(".invoice-table-header");
  if (tableHeader) {
    tableHeader.style.display = "grid";
    tableHeader.style.gridTemplateColumns = "0.6fr 2fr 1fr 1fr 1fr 1fr 1fr";
  }

  // Item rows: clear all then insert only the slice for this page
  clone.querySelectorAll(".invoice-table-row").forEach(r => r.remove());
  const tableEl = clone.querySelector(".invoice-table");
  if (tableEl) rowEls.forEach(row => tableEl.appendChild(row.cloneNode(true)));

  // Totals — use the new class name .invoice-totals
  const totalsEl = clone.querySelector(".invoice-totals");
  if (totalsEl) totalsEl.style.display = showTotals ? "" : "none";

  // Footer — use the new .invoice-print-footer class
  const footerEl = clone.querySelector(".invoice-print-footer");
  if (footerEl) {
    footerEl.style.display = showFooter ? "" : "none";
  }

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
        downloadInvoiceA5,
        whatsappShare,
      };
    }
  });

  /** Generate A4 PDF */
  async function generatePDF(saveLocally = true) {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      const node = invoiceRef.current;

      const clone = node.cloneNode(true);
      clone.style.width = "794px";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.background = "#fff";
      clone.style.overflow = "visible";
      clone.style.boxSizing = "border-box";
      // A4 at 96dpi = 297mm × 3.7795px/mm ≈ 1123px.
      // min-height forces the flex layout to fill one full page so the
      // footer is pushed to the page bottom and there is no white gap.
      clone.style.minHeight = "1123px";
      clone.style.height = "auto";
      clone.style.display = "flex";
      clone.style.flexDirection = "column";
      clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());
      document.body.appendChild(clone);

      // Wait for layout + image decode
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      // Each A4 page is 297mm tall.  pdfHeight is the mm-height of the full canvas.
      // If content fits in one page (≤297mm) it renders cleanly on one page.
      // Multi-page invoices slice the canvas into 297mm segments.
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeightMm = 297;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeightMm;

      // Use a 1mm tolerance to prevent a spurious blank page when content
      // fills almost exactly one page (floating-point near-zero remainder).
      while (heightLeft > 1) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeightMm;
      }

      const filename = `VedAarna_${customer.name || "Invoice"}.pdf`;
      if (saveLocally) {
        pdf.save(filename);
        // Auto-increment invoice number after successful save
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
      clone.style.width         = "900px";
      clone.style.position      = "absolute";
      clone.style.left          = "-9999px";
      clone.style.top           = "0";
      clone.style.background    = "#fff";
      clone.style.height        = "auto";
      clone.style.overflow      = "visible";
      clone.style.boxSizing     = "border-box";
      // For images we do NOT use flex/minHeight — that inflates scrollHeight
      // and creates blank space below the footer.  Instead we render at natural
      // height then crop the canvas to the footer's actual bottom edge.
      clone.style.display       = "block";
      clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());
      document.body.appendChild(clone);

      // Wait for layout
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      // Measure the footer's bottom edge in the clone's coordinate space
      const footerEl   = clone.querySelector(".invoice-print-footer");
      const cloneRect  = clone.getBoundingClientRect();
      const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;
      // Natural content height = footer bottom relative to clone top (+ clone padding)
      const naturalH   = footerRect
        ? Math.ceil(footerRect.bottom - cloneRect.top)
        : clone.scrollHeight;

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

      // Crop the canvas to naturalH * scale so no blank rows leak through
      const scale      = 2;
      const cropHeight = naturalH * scale;
      const cropped    = document.createElement("canvas");
      cropped.width    = canvas.width;
      cropped.height   = Math.min(cropHeight, canvas.height);
      cropped.getContext("2d").drawImage(canvas, 0, 0);

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
      // For images we do NOT use flex/minHeight — that inflates scrollHeight
      // and creates blank space below the footer.  Instead we render at natural
      // height then crop the canvas to the footer's actual bottom edge.
      clone.style.display       = "block";
      clone.querySelectorAll(".remove-btn, .remove-tooltip").forEach(el => el.remove());
      document.body.appendChild(clone);

      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      // Measure the footer's bottom edge in the clone's coordinate space
      const footerEl   = clone.querySelector(".invoice-print-footer");
      const cloneRect  = clone.getBoundingClientRect();
      const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;
      const naturalH   = footerRect
        ? Math.ceil(footerRect.bottom - cloneRect.top)
        : clone.scrollHeight;

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

      // Crop canvas to exact footer bottom — eliminates any sub-pixel overrun
      const scale      = 2;
      const cropHeight = naturalH * scale;
      const cropped    = document.createElement("canvas");
      cropped.width    = canvas.width;
      cropped.height   = Math.min(cropHeight, canvas.height);
      cropped.getContext("2d").drawImage(canvas, 0, 0);

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

  /** Download A5 multi-page PDF (7 items per page, single PDF file) */
  async function downloadInvoiceA5() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);

      const originalNode = invoiceRef.current;
      const allRowEls = Array.from(originalNode.querySelectorAll(".invoice-table-row"));

      if (allRowEls.length === 0) {
        toast.warn("No items to include in the invoice.");
        setLoading(false);
        return;
      }

      // Split rows into pages of ITEMS_PER_PAGE
      const pages = [];
      for (let i = 0; i < allRowEls.length; i += ITEMS_PER_PAGE) {
        pages.push(allRowEls.slice(i, i + ITEMS_PER_PAGE));
      }

      const totalPages = pages.length;
      const pdf = new jsPDF("p", "mm", "a5");

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const isFirst = pageIndex === 0;
        const isLast  = pageIndex === totalPages - 1;

        const pageNode = buildA5PageNode(originalNode, pages[pageIndex], {
          showBillTo: isFirst,
          showTotals: isLast,
          showFooter: isLast,
        });

        document.body.appendChild(pageNode);
        // Two frames: first for layout, second to ensure images are painted
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));

        const canvas = await html2canvas(pageNode, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          // Use scrollWidth/scrollHeight so nothing is clipped
          width: pageNode.scrollWidth,
          height: pageNode.scrollHeight,
          windowWidth: pageNode.scrollWidth,
          windowHeight: pageNode.scrollHeight,
        });
        document.body.removeChild(pageNode);

        addCanvasToPage(pdf, canvas, pageIndex === 0);
      }

      const filename = `VedAarna_${customer.name || "Invoice"}_A5.pdf`;
      pdf.save(filename);
      toast.success("A5 PDF downloaded!");
    } catch (err) {
      console.error("A5 PDF generation error:", err);
      toast.error("Failed to generate A5 PDF.");
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
        onClick={downloadInvoiceA5}
        disabled={loading}
      >
        {loading ? "Processing..." : "Download A5 PDF"}
      </button>
    </div>
  );
}
