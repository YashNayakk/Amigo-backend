const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middlewares/authMiddleware");

router.get("/get", auth, userController.getProfile);
router.put("/update/:id", auth, userController.uploadMiddleware,
    userController.updateProfile);

module.exports = router;