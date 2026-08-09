const Listing = require("../models/listing");
const { listingSchema } = require('../schema.js');
const validateAddress = require("../utils/validateAddress");
const Review = require("../models/review");
const activityLogger = require("../utils/activityLogger");

// GET all listings
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// GET form to create a new listing
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// GET a single listing
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing1 = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing1) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  // Log view activity
  activityLogger.logView(id);
  
  // Get social proof data
  const socialProof = await activityLogger.getSocialProof(id);

  res.render("listings/show.ejs", { listing1, socialProof });
};

// POST create a new listing (with address validation)
module.exports.createListing = async (req, res, next) => {
  try {
    const { address } = req.body.listing;

    const result = await validateAddress(address);

    if (!result.valid) {
      req.flash("error", "Invalid address. Please enter a real-world location.");
      return res.redirect("/listings/new");
    }

    const url = req.file?.path || '';
    const filename = req.file?.filename || '';

    const newListing = new Listing({
      ...req.body.listing,
      owner: req.user._id,
      image: { url, filename },
      formattedAddress: result.formattedAddress,
      coordinates: result.location
    });

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};

// GET form to edit listing
module.exports.editListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url || '';
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { Listing: listing, originalImageUrl });
};

// PUT update listing (with address validation)
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const { address } = req.body.listing;

  const result = await validateAddress(address);
  if (!result.valid) {
    req.flash("error", "Invalid address. Please enter a real-world location.");
    return res.redirect(`/listings/${id}/edit`);
  }

  const updatedListing = await Listing.findByIdAndUpdate(id, {
    ...req.body.listing,
    formattedAddress: result.formattedAddress,
    coordinates: result.location
  });

  if (req.file) {
    updatedListing.image = {
      url: req.file.path,
      filename: req.file.filename
    };
    await updatedListing.save();
  }

  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
};

// DELETE a listing
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};
