const nodemailer = require("nodemailer");
const generateReceiptPDF = require("./pdfReceipt"); // ✅ Import your new PDF generator

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendBookingConfirmation = async (email, username, listing, checkInDate, stayDays, totalPrice) => {
  try {
    const receiptId = `RCT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const date = new Date().toLocaleDateString("en-IN");

    const pdfBuffer = await generateReceiptPDF({
      receiptId,
      date,
      username,
      listing,
      checkInDate,
      stayDays,
      totalPrice,
    });

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Your Booking Confirmation - Wanderlust",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Hi ${username},</h2>
          <p>Thank you for booking with <strong>Wanderlust</strong>!</p>
          <p>Your booking is confirmed. Please find the receipt attached.</p>
          <p><strong>Listing:</strong> ${listing.title}</p>
          <p><strong>Check-in:</strong> ${checkInDate}</p>
          <p><strong>Total:</strong> ₹${totalPrice.toLocaleString("en-IN")}</p>
          <br>
          <p>Cheers,<br/>The Wanderlust Team 🌍</p>
        </div>
      `,
      attachments: [
        {
          filename: "booking-receipt.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Confirmation email with receipt sent to:", email);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
};

module.exports = sendBookingConfirmation;
