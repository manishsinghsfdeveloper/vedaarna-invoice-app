import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axios from "axios";
import "./InvoiceActions.css";

export default function InvoiceActions({ invoiceRef, customer, totals }) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // Utility: convert Blob → base64
  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  /** ✅ Generate PDF */
  async function generatePDF(saveLocally = true) {
    if (!invoiceRef.current) {
      alert("Invoice not ready yet!");
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
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollY: -window.scrollY,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= 297;
      }

      const filename = `VedAarna_${customer.name || "Invoice"}.pdf`;
      if (saveLocally) pdf.save(filename);

      setLoading(false);
      return { pdf, filename, blob: pdf.output("blob") };
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF.");
      setLoading(false);
    }
  }

  /** ✅ NEW: Generate and Download Bill Image (PNG) */
  async function downloadBillImage() {
    if (!invoiceRef.current) {
      alert("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      const node = invoiceRef.current;

      const clone = node.cloneNode(true);
      clone.style.width = "900px";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.background = "#fff";
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      document.body.removeChild(clone);

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `VedAarna_${customer.name || "Invoice"}.png`;
      link.click();

      setLoading(false);
    } catch (err) {
      console.error("Image download failed:", err);
      alert("Failed to generate image.");
      setLoading(false);
    }
  }

  /** ✅ Upload to serverless (Email + Upload placeholder) */
  async function uploadAndSend() {
    try {
      setLoading(true);
      const { blob, filename } = await generatePDF(false);
      const base64 = await blobToBase64(blob);

      const payload = {
        filename,
        base64,
        customer,
        total: totals.grandTotal,
      };

      const endpoint = "/.netlify/functions/sendInvoice";
      const res = await axios.post(endpoint, payload);
      setPdfUrl(res.data.url || "");

      alert("Invoice uploaded and shared successfully!");
    } catch (err) {
      console.error("Upload/send failed:", err);
      alert("Upload failed. Please check console.");
    } finally {
      setLoading(false);
    }
  }

  /** ✅ Share link on WhatsApp */
  function whatsappShare() {
    const text = `VedAarna Studio Invoice\nName: ${customer.name}\nTotal: ₹${totals.grandTotal.toFixed(
      2
    )}\nDownload: ${pdfUrl || "PDF will be available after upload"}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
  }

  return (
    <div className="invoice-actions">
      {/* ✅ Existing Buttons */}
      <button
        className="btn-primary"
        onClick={() => generatePDF(true)}
        disabled={loading}
      >
        {loading ? "Generating..." : "Download PDF"}
      </button>

      {/* ✅ NEW BUTTON — Download Bill Image */}
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
        {loading ? "Uploading..." : "Email + Upload"}
      </button>

      <button
        className="btn-whatsapp"
        onClick={whatsappShare}
        disabled={!pdfUrl}
      >
        Share on WhatsApp
      </button>
    </div>
  );
}
