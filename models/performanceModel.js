const mongoose = require("mongoose");

const graphPointSchema = new mongoose.Schema({
    date:  { type: Date,   required: true },
    value: { type: Number, required: true },
}, { _id: false });

const calendarDaySchema = new mongoose.Schema({
    date:      { type: Date,    required: true },
    completed: { type: Boolean, default: false },
    intensity: { type: Number,  default: 0, min: 0, max: 1 },
}, { _id: false });

const focusSessionSchema = new mongoose.Schema({
    startedAt:   { type: Date,   required: true },
    endedAt:     { type: Date,   required: true },
    durationSecs:{ type: Number, required: true },
    points:      { type: Number, required: true },
}, { _id: false });

const focusSchema = new mongoose.Schema({
    totalSessions: { type: Number, default: 0 },
    totalSecs:     { type: Number, default: 0 },   // lifetime focused seconds
    totalPoints:   { type: Number, default: 0 },   // lifetime points from focus
    lastSessionAt: { type: Date },
    sessions:      { type: [focusSessionSchema], default: [] }, // last 100 sessions
}, { _id: false });

const performanceSchema = new mongoose.Schema({
    user: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
        unique:   true, 
    },

    score: { type: Number, default: 0 },

    metricScore: { type: Number, default: 0 },
    habitScore:  { type: Number, default: 0 },

    momentum: { type: Number, default: 0 },

    currentStreak: { type: Number, default: 0 },
    bestStreak:    { type: Number, default: 0 },

    consistency: { type: Number, default: 0, min: 0, max: 100 },

    simpleGraph:   [graphPointSchema],
    momentumGraph: [graphPointSchema],

    calendar: [calendarDaySchema],

    focus: { type: focusSchema, default: () => ({}) },

    lastCalculatedAt: { type: Date, default: Date.now },

}, { timestamps: true });

const Performance = mongoose.model("Performance", performanceSchema);

const repairIndex = async () => {
    try {
        const col     = Performance.collection;
        const indexes = await col.indexes();

        for (const idx of indexes) {
            if (idx.name === "_id_") continue;

            const fields  = Object.keys(idx.key);
            const isStale = fields.includes("key")
                         || fields.includes("userId")
                         || (fields.includes("date") && fields.length > 1);

            if (isStale) {
                await col.dropIndex(idx.name);
                console.log(`[Performance] Dropped stale index: "${idx.name}"`);
            }
        }

        await col.createIndex({ user: 1 }, { unique: true, background: true });
        console.log("[Performance] Index OK — unique on { user }.");
    } catch (err) {
        console.warn("[Performance] repairIndex warning:", err.message);
    }
};

module.exports = Performance;
module.exports.repairIndex = repairIndex;