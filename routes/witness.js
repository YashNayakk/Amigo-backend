const express = require("express");
const router = express.Router();
const witnessController = require("../controllers/witnessController");
const { auth } = require("../middlewares/authMiddleware");

router.post("/request", auth, witnessController.requestWitness);
router.get("/requests", auth, witnessController.showWitnessRequests);
router.post("/respond", auth, witnessController.respondWitness);
router.get('/connections', auth, witnessController.getUserConnections);

module.exports = router;