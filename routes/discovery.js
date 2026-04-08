const express = require("express");
const router = express.Router();
const discoveryController = require("../controllers/discoveryController");
const { auth } = require("../middlewares/authMiddleware");

router.get("/get", auth, discoveryController.getDiscovery);
module.exports = router;