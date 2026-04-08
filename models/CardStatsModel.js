import mongoose from 'mongoose';

const cardStatsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    podId: { type: mongoose.Schema.Types.ObjectId, ref: "CommitmentPod", default: null },
    dailyCards: {
        date: { type: String },
        count: { type: Number, default: 0 }
    },
    totalCardsSent: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCardDate: { type: String }
}, { timestamps: true });

cardStatsSchema.index({ userId: 1, chatId: 1 }, { unique: true });
cardStatsSchema.index({ podId: 1 });
cardStatsSchema.index({ userId: 1 });

export default mongoose.model('CardStats', cardStatsSchema);