const MetricTrend = require("../models/metricTrend");

exports.getGraphData = async (req, res) => {
  try {
    const userId = req?.user?.id;
    const { metricType, context, timeRange } = req?.query;

    if (!metricType || !context || !timeRange) {
      return res.status(400).json({
        success: false,
        message: "metricType, context and timeRange are required",
      });
    }

    const trend = await MetricTrend.findOne({
      user: userId,
      metricType,
      context,
      timeRange,
    });

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error("Graph data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load graph data",
    });
  }
};
