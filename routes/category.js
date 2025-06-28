const express = require("express");
const router = express.Router();
const { listByCategory } = require("../controllers/categoryController");

router.get("/:category", listByCategory);

module.exports = router;
