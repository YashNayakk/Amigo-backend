const mongoose = require("mongoose");

const witnessRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    

    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "cancelled"],
        default: "pending",
        index: true,
    }, 

    respondedAt: {
        type: Date,
    }

}, { timestamps: true });

witnessRequestSchema.index(
    {
    requesterId: 1,
    targetId:1,
    status:1
    }, {
    unique: true,
    partialFilterExpression:{status: "pending"

    },
})

module.exports = mongoose.model("WitnessRequest", witnessRequestSchema);