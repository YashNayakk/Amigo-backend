const MetricService = require("../services/metricService");
const Metric = require("../models/metricEntry");
const ALLOWED_CONTEXT = ["daily", "project", "future_arc"];

exports.dailyCheckIn = async (req, res) => {
  try {
    const userId = req?.user?.id;
    const { date, context, metrics } = req?.body;

    if (!date || !metrics) {
      return res.status(400).json({
        success: false,
        message: "Date and metrics are required"
      });
    }

    if (!ALLOWED_CONTEXT.includes(context)) {
      return res.status(400).json({
        success: false,
        message: "Invalid context"
      });
    }


    const entry = await MetricService.createDailyCheckIn(
      userId,
      date,
      context,
      metrics
    );
    res.status(201).json({
      success: true,
      data: entry,
      message: "Daily check-in completed"
    });

  } catch (error) {
    console.error("Daily check-in error:", error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMetricHistory = async (req, res) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  try {
    const userId = req?.user?.id;
    const { context, metricType } = req?.query;
    const query = { user: userId };
    if (context) query.context = context;
    if (metricType) query["metrics.metricType"] = metricType;

    const data = await Metric.find(query).sort({ date: 1 });

    const todayItems = data.some(item => {
      const d = new Date(item.date).toISOString().split('T')[0];
      return today === d
    });


    if (!todayItems) {
      res.status(200).json({
        success: true,
        data,
        done:false
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Check-in already done",
        done: true
      })
    }

  } catch (error) {
    console.error("Error fetching metric history:", error);
    res.status(500).json({
      success: false,
      message: "failed to fetch metric history",
      done: false
    });
  }
};
