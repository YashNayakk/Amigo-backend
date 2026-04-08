const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    metricType: {
        type: String,
        required: true
    },

    context: {
        type: String,
        enum: ["daily", "project", "future_arc"],
        required: true
    },

    predictedValues: [
        {
            date: Date,
            value: Number
        }
    ],

    momentum: {
        type: Number,
        default: 0,
    },

    confidenceScore: {
        type: Number
    },

    generatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

module.exports = mongoose.model("Prediction", predictionSchema);