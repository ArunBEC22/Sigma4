const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const wrapAsync = require("../utils/wrapAsync");

// Get recent activities for activity feed widget
router.get("/recent", wrapAsync(activityController.getRecentActivities));

// Get social proof data for a specific listing
router.get("/listing/:id/social-proof", wrapAsync(activityController.getListingSocialProof));

// Get activity statistics (for admin dashboard)
router.get("/stats", wrapAsync(activityController.getActivityStats));

module.exports = router;

// Made with Bob