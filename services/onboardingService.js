const User = require("../models/userModel");
const Performance = require("../models/performanceModel");
const { default: mongoose } = require("mongoose");

class OnboardingService {
  static async saveOnboarding(userId, answers) {
    const {
      primaryGoal,
      feedbackStyle,
      missBehavior,
      sleepBaseline,
      chaosLevel,
    } = answers;
    
    if (!primaryGoal || !feedbackStyle || !missBehavior) {
      throw new Error("Incomplete onboarding data");
    }

    const scoreWeights = this._calculateScoreWeights(
      feedbackStyle,
      missBehavior,
      chaosLevel
    );

    const object = await User.findByIdAndUpdate(userId , {
        type: "habit",
        key: "onboarding",
        date: new Date().setHours(0,0,0,0),
        primaryGoal,
        feedbackStyle,
        missBehavior,
        sleepBaseline,
        chaosLevel,
        completed: true, 
    });

    await Performance.create({
      user: userId,
      score: 0,
      momentum: 0,
      streak: 0,
      weights: scoreWeights,
    });
    return { success: true };
  }

  static _calculateScoreWeights(feedbackStyle, missBehavior, chaosLevel) {
    let effort = 0.5;
    let result = 0.5;

    if (feedbackStyle === "gentle") effort = 0.7;
    if (feedbackStyle === "strict") result = 0.7;

    let penaltyMultiplier = 1;

    if (missBehavior === "drop") penaltyMultiplier += 0.2;
    if (chaosLevel === "high") penaltyMultiplier -= 0.2;

    return {
      effortWeight: effort,
      resultWeight: result,
      penaltyMultiplier,
    };
  }
}

module.exports = OnboardingService;
