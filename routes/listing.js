const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const listingController = require("../controllers/listings.js");
const { isLoggedIn, isAdmin, validateListing } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");

const upload = multer({ storage });

// Index & Create (Create restricted to admin only)
router.route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    isAdmin,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New Listing Form (Admin only)
router.get("/new", isLoggedIn, isAdmin, listingController.renderNewForm);

// Show, Update, Delete (Update and Delete restricted to admin only)
router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isAdmin,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isAdmin, wrapAsync(listingController.destroyListing));

// Edit Form (Admin only)
router.get("/:id/edit", isLoggedIn, isAdmin, wrapAsync(listingController.editListing));

module.exports = router;
