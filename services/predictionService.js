const MetricEntry = require("../models/metricEntryModel");

class PredictionService {
  
  static async predictDailyMetric(userId, metricType, days = 30) {
    const entries = await MetricEntry.find({
      user: userId,
      [`normalized.${metricType}`]: { $exists: true },
    })
      .sort({ date: -1 })
      .limit(30);

    if (entries.length < 5) {
      return this._lowConfidence();
    }

    const values = entries.map((e) =>
      this._chunkToValue(e.normalized[metricType])
    );

    const avg = this._average(values);
    const consistency = this._consistency(values);

    return {
      metric: metricType,
      projection: this._valueToChunk(avg),
      confidence: this._confidence(consistency),
      narrative: this._dailyNarrative(metricType, avg, consistency),
    };
  }

  
  static async predictProjectArc(userId) {
    const entries = await MetricEntry.find({ user: userId })
      .sort({ date: -1 })
      .limit(21);

    if (entries.length < 7) {
      return this._lowConfidence();
    }

    const activeDays = entries.length;
    const engagementRate = activeDays / 21;

    return {
      direction:
        engagementRate > 0.7
          ? "strong"
          : engagementRate > 0.4
          ? "moderate"
          : "fragile",
      confidence: engagementRate,
      narrative: this._projectNarrative(engagementRate),
    };
  }

  
  static async predictFutureArc(userId) {
    const entries = await MetricEntry.find({ user: userId })
      .sort({ date: -1 })
      .limit(60);

    if (entries.length < 15) {
      return this._lowConfidence();
    }

    const activeDays = entries.length;
    const rate = activeDays / 60;

    return {
      trajectory:
        rate > 0.65 ? "upward" : rate > 0.35 ? "stable" : "uncertain",
      confidence: Math.min(rate, 0.8),
      narrative: this._futureNarrative(rate),
    };
  }

  

  static _chunkToValue(chunk) {
    const map = {
      low: 1,
      below_avg: 2,
      avg: 3,
      above_avg: 4,
      high: 5,
    };
    return map[chunk] || 3;
  }

  static _valueToChunk(value) {
    if (value < 1.5) return "low";
    if (value < 2.5) return "below_avg";
    if (value < 3.5) return "avg";
    if (value < 4.5) return "above_avg";
    return "high";
  }

  static _average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  static _consistency(values) {
    const mean = this._average(values);
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.max(0, 1 - Math.sqrt(variance) / 2);
  }

  static _confidence(consistency) {
    if (consistency > 0.75) return "high";
    if (consistency > 0.45) return "medium";
    return "low";
  }

  static _lowConfidence() {
    return {
      confidence: "low",
      narrative: "Not enough data yet. Keep checking in.",
    };
  }

 
  static _dailyNarrative(metric, avg, consistency) {
    if (consistency < 0.4) {
      return `Your ${metric} is irregular. Small consistency improvements will matter more than intensity.`;
    }

    if (avg >= 4) {
      return `Your ${metric} is strong. Maintain your current rhythm.`;
    }

    if (avg >= 3) {
      return `Your ${metric} is steady. Minor adjustments could elevate it.`;
    }

    return `Your ${metric} is below your potential. Focus on stability first.`;
  }

  static _projectNarrative(rate) {
    if (rate > 0.7)
      return "Your project rhythm is strong. Momentum is building.";
    if (rate > 0.4)
      return "Your project is progressing, but consistency is fragile.";
    return "Your project needs structural consistency to move forward.";
  }

  static _futureNarrative(rate) {
    if (rate > 0.6)
      return "If maintained, your current trajectory compounds positively.";
    if (rate > 0.35)
      return "Your future direction depends heavily on short-term consistency.";
    return "Your long-term direction is currently undefined.";
  }
}

module.exports = PredictionService;