const express = require("express");
const router = express.Router();
const metricController = require("../controllers/metricController");
const { auth } = require("../middlewares/authMiddleware");

router.get("/gethistory", auth, metricController.getMetricHistory);
router.post("/checkin", auth, metricController.dailyCheckIn);

module.exports = router;