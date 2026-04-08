import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    activityName: {
        type: String,
        required: true,
        trim: true,
    },
    satisfactionLevel: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    customMessage: {
        type: String,
        trim: true,
        default: '',
    },
}, { timestamps: true });

cardSchema.index({ chatId: 1, createdAt: -1 });
cardSchema.index({ sender: 1, createdAt: 1 });

export default mongoose.model("Card", cardSchema);