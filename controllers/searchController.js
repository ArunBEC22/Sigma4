const Listing = require("../models/listing");

module.exports.searchListings = async (req, res) => {
    try {
        let { searchList } = req.body;
        let list = await Listing.find({
            country: { $regex: searchList, $options: "i" }
        });
        res.render("listings/search", { list });
    } catch (err) {
        res.status(500).send({ message: err.message || "Error Occurred" });
    }
};
