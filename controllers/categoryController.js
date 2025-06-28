const Listing = require("../models/listing");

module.exports.listByCategory = async (req, res) => {
    const { category } = req.params;
    try {
        const listings = await Listing.find({
            category: { $regex: new RegExp(`${category}$`, "i") }
        });
        res.render("listings/index", { allListings: listings });
    } catch (err) {
        req.flash("error", "Unable to fetch listings for this category.");
        res.redirect("/");
    }
};
