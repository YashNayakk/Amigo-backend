const MetricEntry = require("../models/metricEntry");

class MetricService {

  static async createDailyCheckIn(userId, date, context, metrics) {
    if (!Array.isArray(metrics) || metrics.length === 0) {
      throw new Error("Metrics array is required");
    }

    let score = 0;

    const processedMetrics = metrics.map((m) => {
      const numericValue = parseFloat(m?.value);
      if (isNaN(numericValue)) {
        throw new Error(`Invalid value for ${m.metricType}: ${m.value}`);
      }

      const normalized = this.normalizeMetric(m?.metricType, numericValue);
      score += this.scoreMetric(normalized);
      
      return {
        metricType: m.metricType,
        value: numericValue,
        unit: m.unit || "",
        normalized
      };
    });

    const entry = await MetricEntry.create({
      user: userId,
      date,
      context,
      metrics: processedMetrics,
      score: score  
    });

    console.log("Entry created with score:", score);
    return entry;
  }

  static normalizeMetric(type, value) {
    switch (type) {
      case "sleep":
        if (value < 5) return "low";
        if (value < 6.5) return "below_avg";
        if (value < 7.5) return "avg";
        if (value < 9) return "above_avg";
        return "high";

      case "study":
        if (value < 1) return "low";
        if (value < 3) return "avg";
        return "high";

      case "water":
        if (value < 2) return "low";
        if (value < 3) return "avg";
        return "high";

      case "mood":
        return this._chunk(value, ["low", "ok", "good", "great"]);

      case "focus":
        return this._chunk(value, ["poor", "avg", "good", "deep"]);

      default:
        return "unknown";
    }
  }

  static scoreMetric(normalized) {
    const map = {
      low: 1,
      poor: 1,
      below_avg: 2,
      ok: 2,
      avg: 3,
      good: 4,
      above_avg: 4,
      high: 5,
      great: 5,
      deep: 5
    };

    return map[normalized] || 0;
  }

  static _chunk(value, scale) {
    if (typeof value !== "number") return scale[0];
    const clampedValue = Math.max(0, Math.min(scale.length - 1, Math.floor(value)));
    return scale[clampedValue];
  }
}

module.exports = MetricService;