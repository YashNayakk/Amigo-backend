const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const HabitController = require("../controllers/habitController");

router.post("/create", auth, HabitController.createHabit);
router.post("/complete", auth, HabitController.logHabit);
router.get("/get", auth, HabitController.getUserHabits);
router.post("/disable", auth, HabitController.disableHabit);

module.exports = router;