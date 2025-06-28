const express = require("express");
const router = express.Router();
const { searchListings } = require("../controllers/searchController");

router.post("/", searchListings);

module.exports = router;
