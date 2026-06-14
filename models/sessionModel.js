const mongoose = require("mongoose")

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"]
        },
        refreshTokenHash: {
            type: String,
            required: [true, "Refresh token hash is required"]
        },
        ip: {
            type: String,
            required: [true, "IP address is required"]
        },
        userAgent: {
            type: String,
            required: [true, "User agent is required"]
        },
        revoked: {
            type: Boolean,
            default: false
        },
    }, {
    timestamps: true
});

module.exports = mongoose.model("Session", sessionSchema);