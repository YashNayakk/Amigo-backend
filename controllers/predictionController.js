const Prediction = require("../models/predictionModel");

exports.getPrediction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricType, context } = req.query;

    if (!metricType || !context) {
      return res.status(400).json({
        success: false,
        message: "metricType and context are required",
      });
    }

    const prediction = await Prediction.findOne({
      user: userId,
      metricType,
      context,
    });

    res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({
      success: false,
      message: "Prediction failed",
    });
  }
};
