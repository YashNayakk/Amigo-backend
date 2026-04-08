const Performance = require("../models/performanceModel");
const MetricEntry = require("../models/metricEntryModel");
const Habit = require("../models/habitModel");


class ScoreService {
  
  static async processDailyScore(userId, date = new Date()) {
    const performance = await Performance.findOne({ user: userId });
    if (!performance) throw new Error("Performance not found");

    const metricEntry = await MetricEntry.findOne({ user: userId, date });
    if (!metricEntry) {
      return this._applyMissPenalty(performance);
    }

    let delta = 0;

    delta += this._metricScore(metricEntry.normalized);

    delta += this._checkInStreakBonus(performance.streak);

    delta += await this._habitStreakBonus(userId, performance.streak);

    delta += this._momentumBonus(performance.momentum);

    delta -= this._guardrailPenalty(metricEntry);

    delta = this._capDailyDelta(delta);

    performance.score = Math.max(0, performance.score + delta);
    performance.streak += 1;
    performance.momentum = this._updateMomentum(performance.momentum, delta);
    performance.lastCheckIn = date;

    await performance.save();

    return {
      delta,
      score: performance.score,
      streak: performance.streak,
      momentum: performance.momentum,
    };
  }

  

  static _metricScore(normalizedMetrics) {
    let score = 0;

    for (const key in normalizedMetrics) {
      const value = normalizedMetrics[key];

      switch (value) {
        case "low":
          score += 0;
          break;
        case "below_avg":
          score += 1;
          break;
        case "avg":
          score += 2;
          break;
        case "above_avg":
          score += 3;
          break;
        case "high":
          score += 4;
          break;
        default:
          score += 0;
      }
    }

    return Math.min(score, 10);
  }

  

  static _checkInStreakBonus(streak) {
    if (streak >= 30) return 3;
    if (streak >= 14) return 2;
    if (streak >= 7) return 1;
    return 0;
  }

  

  static async _habitStreakBonus(userId, checkInStreak) {
    if (checkInStreak < 3) return 0;

    const habits = await Habit.find({
      user: userId,
      active: true,
    });

    if (!habits.length) return 0;

    let maxStreak = 0;
    for (const habit of habits) {
      maxStreak = Math.max(maxStreak, habit.streak || 0);
    }

    let bonus = 0;
    if (maxStreak >= 30) bonus = 2;
    else if (maxStreak >= 14) bonus = 1.5;
    else if (maxStreak >= 7) bonus = 1;
    else if (maxStreak >= 3) bonus = 0.5;

    return Math.min(bonus, this._checkInStreakBonus(checkInStreak));
  }

  

  static _momentumBonus(momentum) {
    if (momentum >= 7) return 2;
    if (momentum >= 3) return 1;
    return 0;
  }

  static _updateMomentum(currentMomentum, delta) {
    if (delta > 0) return Math.min(currentMomentum + 1, 14);
    return Math.max(currentMomentum - 1, 0);
  }

  

  static _guardrailPenalty(metricEntry) {
    let penalty = 0;

    if (metricEntry.raw?.studyHours >= 16) penalty += 2;

    if (
      metricEntry.normalized.sleep === "low" &&
      metricEntry.normalized.focus === "high"
    ) {
      penalty += 1;
    }

    return penalty;
  }

 

  static async _applyMissPenalty(performance) {
    const daysMissed = this._daysSince(performance.lastCheckIn);

    let penalty = 0;

    if (daysMissed <= 2) penalty = 1;
    else if (daysMissed <= 5) penalty = 2;
    else penalty = 4;

    performance.score = Math.max(0, performance.score - penalty);
    performance.streak = 0;
    performance.momentum = Math.max(0, performance.momentum - 2);

    await performance.save();

    return {
      delta: -penalty,
      score: performance.score,
      streak: 0,
      momentum: performance.momentum,
    };
  }

 

  static _capDailyDelta(delta) {
    if (delta > 12) return 12;
    if (delta < -8) return -8;
    return delta;
  }

  static _daysSince(date) {
    if (!date) return 999;
    const diff = Date.now() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

module.exports = ScoreService;