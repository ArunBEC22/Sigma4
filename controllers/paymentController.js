const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/bookings");
const Listing = require("../models/listing");
const sendBookingConfirmation = require("../utils/mailer");
const PDFDocument = require("pdfkit");
const activityLogger = require("../utils/activityLogger");

// Create Stripe Checkout Session
module.exports.createCheckoutSession = async (req, res) => {
  const { amount, listingId, checkInDate, stayDays } = req.body;
  const userId = req.user._id;

  try {
    if (!listingId || !checkInDate || !stayDays || !amount) {
      return res.status(400).send("Missing required fields");
    }

    const parsedStayDays = parseInt(stayDays, 10);
    const parsedAmount = parseFloat(amount);
    const totalAmount = parsedAmount * parsedStayDays;

    const checkin = new Date(checkInDate);
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + parsedStayDays);

    const booking = new Booking({
      user: userId,
      listing: listingId,
      checkinDate: checkin,
      checkoutDate: checkout,
      stayDays: parsedStayDays,
      amount: totalAmount,
    });

    await booking.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Listing Payment" },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${req.protocol}://${req.get("host")}/payment/success?bookingId=${booking._id}`,
      cancel_url: `${req.protocol}://${req.get("host")}/payment/cancel`,
    });

    res.redirect(303, session.url);
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    res.status(500).send("Payment session failed");
  }
};

// Handle successful payment
module.exports.paymentSuccess = async (req, res) => {
  const bookingId = req.query.bookingId;

  if (!bookingId) {
    req.flash("error", "Booking ID missing in success URL.");
    return res.redirect("/listings");
  }

  try {
    const booking = await Booking.findById(bookingId)
      .populate("listing")
      .populate("user");

    if (!booking) {
      req.flash("error", "Booking not found.");
      return res.redirect("/listings");
    }

    const pdfBuffer = await generateReceiptPDF({
      username: booking.user.username,
      listing: booking.listing,
      checkInDate: booking.checkinDate.toDateString(),
      stayDays: booking.stayDays,
      totalPrice: booking.amount,
    });

    await sendBookingConfirmation(
      booking.user.email,
      booking.user.username,
      booking.listing,
      booking.checkinDate.toDateString(),
      booking.stayDays,
      booking.amount,
      pdfBuffer
    );

    // Log booking activity for social proof
    await activityLogger.logBooking(booking, booking.listing);
    
    // Calculate and update trust score
    await activityLogger.calculateTrustScore(booking.listing._id);

    req.flash("success", "Payment successful! Confirmation email with receipt sent.");
    res.redirect(`/listings/${booking.listing._id}`);
  } catch (err) {
    console.error("Error in paymentSuccess:", err);
    req.flash("error", "Error completing booking.");
    res.redirect("/listings");
  }
};

// Handle cancelled payment
module.exports.paymentCancel = (req, res) => {
  req.flash("error", "Payment was cancelled.");
  res.redirect("/listings");
};

// PDF Generator Function
function generateReceiptPDF({ username, listing, checkInDate, stayDays, totalPrice }) {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", (chunk) => buffers.push(chunk));
  doc.on("end", () => {});

  doc.fontSize(22).text("Wanderlust Booking Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(14);
  doc.text(`Name: ${username}`);
  doc.text(`Listing: ${listing.title}`);
  doc.text(`Location: ${listing.location}, ${listing.country}`);
  doc.text(`Check-in: ${checkInDate}`);
  doc.text(`Duration: ${stayDays} day(s)`);
  doc.text(`Total Price: ₹${totalPrice.toLocaleString("en-IN")}`);
  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on("error", reject);
  });
}
