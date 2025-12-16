import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./InvoiceActions.css";
import "../toast-theme.css";

export default function InvoiceActions({ invoiceRef, customer, totals }) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  /* ---------------------------
     Utility: Blob → base64
  ---------------------------- */
  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  /* ---------------------------
     A4 PDF GENERATION
  ---------------------------- */
  async function generatePDF(saveLocally = true) {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      toast.info("Generating PDF...");

      const node = invoiceRef.current;
      const clone = node.cloneNode(true);

      clone.style.width = "794px"; // A4 width @96dpi
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

      toast.success("PDF ready!");
      setLoading(false);

      return { pdf, filename, blob: pdf.output("blob") };
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
      setLoading(false);
    }
  }

  /* ---------------------------
     DOWNLOAD BILL IMAGE (PNG)
  ---------------------------- */
  async function downloadBillImage() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      toast.info("Preparing image...");

      const clone = invoiceRef.current.cloneNode(true);
      clone.style.width = "900px";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.background = "#fff";

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      document.body.removeChild(clone);

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `VedAarna_${customer.name || "Invoice"}.png`;
      link.click();

      toast.success("Bill image downloaded!");
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image.");
      setLoading(false);
    }
  }

  /* ---------------------------
     A5 PRINT INVOICE (JPG)
     148 × 210 mm @300dpi
  ---------------------------- */
  async function downloadA5Invoice() {
    if (!invoiceRef.current) {
      toast.error("Invoice not ready yet!");
      return;
    }

    try {
      setLoading(true);
      toast.info("Preparing A5 invoice for print...");

      const clone = invoiceRef.current.cloneNode(true);
      clone.style.width = "1748px";     // A5 width @300dpi
      clone.style.minHeight = "2480px"; // A5 height @300dpi
      clone.style.padding = "40px";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.background = "#fff";
      clone.style.boxSizing = "border-box";
      clone.style.transform = "scale(0.95)";
      clone.style.transformOrigin = "top left";

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 1, // IMPORTANT for print accuracy
        useCORS: true,
        backgroundColor: "#fff",
        width: 1748,
        height: 2480,
      });

      document.body.removeChild(clone);

      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `VedAarna_${customer.name || "Invoice"}_A5.jpg`;
      link.click();

      toast.success("A5 invoice ready for print!");
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate A5 invoice.");
      setLoading(false);
    }
  }

  /* ---------------------------
     EMAIL + UPLOAD (OPTIONAL)
  ---------------------------- */
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

      try {
        const res = await axios.post("/.netlify/functions/sendInvoice", payload);
        setPdfUrl(res.data.url || "");
        toast.success("Invoice uploaded successfully!");
      } catch {
        const tempUrl = URL.createObjectURL(blob);
        setPdfUrl(tempUrl);
        toast.info("Using temporary invoice link");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------
     WHATSAPP SHARE
     (Link only – WhatsApp limitation)
  ---------------------------- */
  async function whatsappShare() {
    if (!customer.phone) {
      toast.warning("Please enter customer phone number.");
      return;
    }

    try {
      setLoading(true);
      toast.info("Preparing WhatsApp message...");

      const { blob } = await generatePDF(false);
      const tempUrl = URL.createObjectURL(blob);

      let phone = customer.phone.replace(/\D/g, "");
      if (phone.length === 10) phone = "91" + phone;

      const text = `🧾 *VedAarna Studio Invoice*

👤 Name: ${customer.name}
💰 Total: ₹${totals.grandTotal.toFixed(2)}

📎 Download your invoice:
${tempUrl}

Thank you for shopping with us! 💫`;

      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        "_blank"
      );

      toast.success("WhatsApp message ready!");
    } catch (err) {
      console.error(err);
      toast.error("WhatsApp share failed.");
    } finally {
      setLoading(false);
    }
  }

  const canShareWhatsApp = customer.phone && customer.phone.trim() !== "";

  return (
    <>
      <div className="invoice-actions">
        <button className="btn-primary" onClick={() => generatePDF(true)} disabled={loading}>
          {loading ? "Generating..." : "Download PDF"}
        </button>

        <button className="btn-image" onClick={downloadBillImage} disabled={loading}>
          {loading ? "Processing..." : "Download Bill Image"}
        </button>

        <button className="btn-secondary" onClick={uploadAndSend} disabled={loading}>
          {loading ? "Uploading..." : "Email + Upload"}
        </button>

        <button
          className="btn-whatsapp"
          onClick={whatsappShare}
          disabled={!canShareWhatsApp || loading}
        >
          {loading
            ? "Preparing..."
            : canShareWhatsApp
            ? "Share on WhatsApp"
            : "Enter phone to enable WhatsApp"}
        </button>

        {/* ✅ A5 PRINT BUTTON */}
        <button className="btn-a5" onClick={downloadA5Invoice} disabled={loading}>
          {loading ? "Processing..." : "Invoice A5 (Print)"}
        </button>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
