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
  console.log("Today's date:", today);
  try {
    const userId = req?.user?.id;
    const { context, metricType } = req?.query;
    const query = { user: userId };
    if (context) query.context = context;
    if (metricType) query["metrics.metricType"] = metricType;

    const data = await Metric.find(query).sort({ date: 1 });

    const todayItems = data.some(item => {
      const d = new Date(item.date).toISOString().split('T')[0];
      console.log(d)
      return today === d
    });

    console.log(todayItems)

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


exports.getPersonalizedQuestions = async (req, res) => {

  res.status(200).json({
    questions: getDefaultQuestions(),
    isPersonalized: false,
  });

};

function getDefaultQuestions() {
  return [
    {
      id: "sleep",
      question: "How many hours did you sleep?",
      type: "number",
      unit: "hours",
      min: 0,
      max: 12,
      step: 0.5,
      metricType: "sleep",
    },
    {
      id: "mood",
      question: "How are you feeling today?",
      type: "emoji",
      options: [
        { value: 0, emoji: "😢", label: "Terrible" },
        { value: 1, emoji: "😕", label: "Bad" },
        { value: 2, emoji: "😐", label: "Okay" },
        { value: 3, emoji: "🙂", label: "Good" },
        { value: 4, emoji: "😄", label: "Great" },
      ],
      metricType: "mood",
    },
    {
      id: "study",
      question: "How many hours will you study today?",
      type: "slider",
      unit: "hours",
      min: 0,
      max: 12,
      step: 0.5,
      metricType: "study",
    },
    {
      id: "water",
      question: "How much water will you drink today?",
      type: "selection",
      options: [
        { value: 1, label: "1L", icon: "💧" },
        { value: 2, label: "2L", icon: "💧💧" },
        { value: 3, label: "3L", icon: "💧💧💧" },
        { value: 4, label: "4L+", icon: "💧💧💧💧" },
      ],
      unit: "liters",
      metricType: "water",
    },
    {
      id: "focus",
      question: "What's your main focus for today?",
      type: "text",
      placeholder: "e.g., Complete assignment, Study for exam...",
      maxLength: 150,
      metricType: "focus",
    },
  ];
}
