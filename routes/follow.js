const express = require("express");
const router = express.Router();
const followController = require("../controllers/followController");
const { auth } = require("../middlewares/authMiddleware");

router.post("/follow", auth, followController.followUser);

module.exports = router;
