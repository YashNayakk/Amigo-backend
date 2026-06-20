const Performance = require('../models/performanceModel');
const MetricEntry = require('../models/metricEntry');
const Habit = require('../models/habitModel');


const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const daysBetween = (a, b) => {
    Math.round(Math.abs(startOfDay(a) - startOfDay(b)) / 86400000);
};

const scoreFromNormalized = (normalized) => {
    const map = {
        low: 1, poor: 1,
        below_avg: 2, ok: 2,
        avg: 3,
        good: 4, above_avg: 4,
        high: 5, great: 5, deep: 5,
    };
    return map[normalized] || 0;
};

const resolveEntryScore = (entry) => {
    if (entry.score) return entry.score;
    if (entry.metrics?.length) {
        return entry.metrics.reduce((s, m) => s + scoreFromNormalized(m.normalized), 0);
    }
    return 0;
};


const scoreHabit = (habit) => {
    const logs = habit.logs || [];
    const streak = habit.streak || 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentLogs = logs.filter(l => new Date(l.date || l.createdAt) >= cutoff);

    const freqMap = { daily: 30, weekly: 4, monthly: 1 };
    const expected = freqMap[habit.frequency] || 30;

    const completionRate = Math.min(recentLogs.length / expected, 1);
    const streakBonus = Math.min(streak / 30, 1);
    const raw = (completionRate * 5 + streakBonus * 2) * 5;

    return parseFloat(raw.toFixed(2));
};

const calcStreaks = (dayTimestamps) => {
    if (!dayTimestamps.length) return { currentStreak: 0, bestStreak: 0 };

    const sorted = [...new Set(dayTimestamps)].sort((a, b) => a - b);
    const todayTs = startOfDay(new Date()).getTime();

    let best = 1;
    let current = 1;

    for (let i = 1; i < sorted.length; i++) {
        const diff = Math.round((sorted[i] - sorted[i - 1]) / 86400000);
        if (diff === 1) {
            current++;
            best = Math.max(best, current);
        } else {
            current = 1;
        }
    }

    const lastDay = sorted[sorted.length - 1];
    const gap = Math.round((todayTs - lastDay) / 86400000);
    const aliveStreak = gap <= 1 ? current : 0;

    return { currentStreak: aliveStreak, bestStreak: best };
};

exports.calculateReward = async (userId, startedAt, endedAt) => {
    const durationMs = endedAt - startedAt;
    const durationSecs = Math.floor(durationMs / 1000);
    const durationMins = durationSecs / 60;

    if (durationMins < 1) return { points: 0, durationSecs, reason: 'too_short' };
    if (durationMins > 180) return { points: 0, durationSecs, reason: 'too_long' };

    const clampedMins = Math.min(Math.floor(durationMins), 90);
    let points = 0;

    if (clampedMins < 5) points = 5;
    else if (clampedMins < 15) points = clampedMins * 5;
    else if (clampedMins < 30) points = clampedMins * 10;
    else if (clampedMins < 60) points = clampedMins * 15;
    else points = clampedMins * 20;

    await Performance.findOneAndUpdate(
        { user: userId },
        {
            $inc: {
                'focus.totalSessions': 1,
                'focus.totalSecs': durationSecs,
                'focus.totalPoints': points,
            },
            $push: {
                'focus.sessions': {
                    $each: [{ startedAt, endedAt, durationSecs, points }],
                    $slice: -100,
                },
            },
            $set: { 'focus.lastSessionAt': new Date(endedAt) },
        },
        { upsert: true, new: true }
    );

    return { points, durationSecs };
};


exports.calculatePerformance = async (userId) => {
    const [entries, habits] = await Promise.all([
        MetricEntry.find({ user: userId }).sort({ date: 1 }),
        Habit.find({ user: userId, active: true })
            .select('name type unit target frequency streak longestStreak logs'),
    ]);


    const dailyMap = {};

    entries.forEach(entry => {
        const day = startOfDay(entry.date).toISOString();
        if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
        dailyMap[day].total += resolveEntryScore(entry);
        dailyMap[day].count += 1;
    });

    const dates = Object.keys(dailyMap).sort();

    const simpleGraph = [];
    const momentumGraph = [];
    const calendar = [];

    let previousAvg = null;
    let totalMetric = 0;
    let totalMomentum = 0;
    let minAvg = Infinity;
    let maxAvg = -Infinity;
    const avgByDate = {};

    dates.forEach(dateStr => {
        const { total, count } = dailyMap[dateStr];
        const avg = count > 0 ? total / count : 0;
        avgByDate[dateStr] = avg;
        if (avg < minAvg) minAvg = avg;
        if (avg > maxAvg) maxAvg = avg;
        totalMetric += avg;

        const date = new Date(dateStr);
        simpleGraph.push({ date, value: parseFloat(avg.toFixed(2)) });

        if (previousAvg !== null) {
            const delta = avg - previousAvg;
            momentumGraph.push({ date, value: parseFloat(delta.toFixed(2)) });
            totalMomentum += delta;
        }
        previousAvg = avg;
    });


    const range = maxAvg - minAvg || 1;
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayStr = startOfDay(d).toISOString();
        const avg = avgByDate[dayStr];
        const hasEntry = avg !== undefined;

        calendar.push({
            date: d,
            completed: hasEntry,
            intensity: hasEntry ? parseFloat(((avg - minAvg) / range).toFixed(2)) : 0,
        });
    }


    const metricScore = dates.length > 0
        ? parseFloat((totalMetric / dates.length).toFixed(2))
        : 0;

    const habitScores = habits.map(scoreHabit);
    const habitScore = habitScores.length > 0
        ? parseFloat((habitScores.reduce((s, v) => s + v, 0) / habitScores.length).toFixed(2))
        : 0;

    const finalScore = habits.length > 0
        ? parseFloat(((metricScore * 0.5) + (habitScore * 0.5)).toFixed(2))
        : metricScore;

    const momentum = momentumGraph.length > 0
        ? parseFloat((totalMomentum / momentumGraph.length).toFixed(2))
        : 0;

    const metricDayTs = dates.map(d => startOfDay(new Date(d)).getTime());
    const { currentStreak, bestStreak } = calcStreaks(metricDayTs);

    const bestHabitStreak = habits.length > 0
        ? Math.max(...habits.map(h => h.streak || 0))
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDays = dates.filter(d => new Date(d) >= thirtyDaysAgo).length;
    const consistency = Math.round(Math.min((recentDays / 30) * 100, 100));


    const performance = await Performance.findOneAndUpdate(
        { user: userId },
        {
            score: finalScore,
            metricScore,
            habitScore,
            simpleGraph,
            momentumGraph,
            calendar,
            momentum,
            currentStreak,
            bestStreak: Math.max(bestStreak, bestHabitStreak),
            consistency,
            lastCalculatedAt: new Date(),
        },
        { upsert: true, new: true }
    );

    return performance;
};


exports.getPerformance = async (userId) => {
    const performance = await exports.calculatePerformance(userId);

    const habits = await Habit.find({ user: userId, active: true })
        .select('name type unit target frequency streak longestStreak logs')
        .lean();

    return { ...performance.toObject(), habits };
};


exports.generateProxyData = async (userId) => {
    const existing = await MetricEntry.countDocuments({ user: userId });
    if (existing > 0) return { skipped: true, reason: 'user already has data' };

    const levels = ['low', 'poor', 'below_avg', 'ok', 'avg', 'good', 'above_avg', 'high', 'great', 'deep'];
    const metricTypes = ['mood', 'energy', 'focus', 'sleep', 'exercise'];
    const docs = [];
    const today = new Date();

    for (let i = 59; i >= 0; i--) {
        if (Math.random() < 0.15) continue;

        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const metrics = metricTypes.map(type => ({
            metricType: type,
            normalized: levels[Math.floor(Math.random() * levels.length)],
        }));

        docs.push({ user: userId, date, metrics, score: 0 });
    }

    await MetricEntry.insertMany(docs);
    return { seeded: docs.length };
};


exports.scoreFromNormalized = scoreFromNormalized;
exports.resolveEntryScore = resolveEntryScore;
exports.scoreHabit = scoreHabit;