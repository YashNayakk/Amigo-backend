const express = require("express");
const router = express.Router();
const predictionController = require("../controllers/predictionController");
const { auth } = require("../middlewares/authMiddleware");

router.get("/getprediction", auth, predictionController.getPrediction);

module.exports = router;
