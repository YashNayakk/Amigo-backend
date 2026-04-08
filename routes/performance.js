const express = require("express");
const router = express.Router();
const performanceController = require("../controllers/performanceController");
const { auth } = require("../middlewares/authMiddleware");

router.get("/get", auth, performanceController.getPerformance);
router.put("/updateReward", auth, performanceController.updateReward);

module.exports = router;
