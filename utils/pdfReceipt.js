const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const axios = require("axios");

async function generateReceiptPDF({ receiptId, date, username, listing, checkInDate, stayDays, totalPrice }) {
  const doc = new PDFDocument({ margin: 40 });
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // 🧾 Header
  doc.fontSize(22).text("Wanderlust Booking Receipt", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Receipt ID: ${receiptId}`, { align: "left" });
  doc.text(`Date: ${date}`, { align: "left" });

  doc.moveDown().fontSize(14).text("Booking Details", { underline: true });

  const details = [
    ["Customer Name", username],
    ["Listing Title", listing.title],
    ["Location", `${listing.location}, ${listing.country}`],
    ["Check-in Date", checkInDate],
    ["Stay Duration", `${stayDays} day(s)`],
    ["Total Price", `₹ ${totalPrice.toLocaleString("en-IN")}`]
  ];

  details.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}:`, { continued: true }).font("Helvetica").text(` ${value}`);
  });

  // ✅ Fetch and embed remote Paid Seal image
  try {
    const paidSealUrl = "https://png.pngtree.com/png-vector/20230208/ourmid/pngtree-paid-stamp-vector-illustration-png-image_6585127.png"; // replace with any direct image URL
    const response = await axios.get(paidSealUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data, "binary");

    doc.image(imageBuffer, 400, 80, { width: 100 });
  } catch (err) {
    console.warn("Failed to load remote paid seal:", err.message);
  }

  // 📲 QR Code
  const qrData = `Receipt ID: ${receiptId}\nUser: ${username}\nListing: ${listing.title}\nTotal: ₹${totalPrice}`;
  const qrImage = await QRCode.toDataURL(qrData);
  doc.moveDown(1).text("Scan for Details:", { align: "left" });
  doc.image(qrImage, { fit: [100, 100] });

  // 👋 Footer
  doc.moveDown(1).fontSize(10).text("Thank you for booking with Wanderlust!", { align: "center" });
  doc.text("This is a system-generated receipt. No signature required.", { align: "center" });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);
  });
}

module.exports = generateReceiptPDF;
