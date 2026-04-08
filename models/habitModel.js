const mongoose = require("mongoose");

const habitLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  completed: {
    type: Boolean, 
  },
  value: {
    type: Number, 
  }
}, { _id: false });

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    type: {
      type: String,
      enum: ["yesno", "measurable"],
      required: true,
      default: "yesno"
    },

    // For measurable habits
    unit: {
      type: String, 
      trim: true,
      maxlength: 15,
    },

    target: {
      type: Number, 
      min: 0,
    },

    targetType: {
      type: String,
      enum: ["at_least", "at_most"],
      default: "at_least"
    },
    
    frequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily"
    },

    description: {
      type: String,
      maxlength: 200
    },

    question: {
      type: String,
      maxlength: 100
    },

    // Logs for last 30 days
    logs: [habitLogSchema],
    
    lastCompletedAt: {
      type: Date,
      default: null,
    },

    streak: {
      type: Number,
      default: 0
    },

    longestStreak: {
      type: Number,
      default: 0
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, active: 1 });

module.exports = mongoose.model("Habit", habitSchema);