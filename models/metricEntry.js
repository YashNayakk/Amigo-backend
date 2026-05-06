const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema({
  metricType: {
    type: String,
    required: true,
    enum: ["sleep", "study", "water", "mood", "focus"]
  },

  value: {
    type: Number,
    required: true
  },

  unit: {
    type: String,
    //required: true
  },

  normalized: {
    type: String,
    //required: true
  }
}, { _id: false });

const metricEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  context: {
    type: String,
    enum: ["daily", "project", "future_arc"],
    default: "daily"
  },

  metrics: {
    type: [metricSchema],
    required: true
  },

  score: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

metricEntrySchema.index(
  { user: 1, date: 1, context: 1 },
  { unique: true }
);

module.exports = mongoose.model("MetricEntry", metricEntrySchema);
