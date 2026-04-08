const performanceService = require("../services/performanceService");

exports.getPerformance = async (req, res) => {
    try {
        const userId = req?.user?.id;

        let performance = await performanceService.calculatePerformance(userId);
        return res.status(200).json({
            success: true,
            data: performance
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateReward = async (req, res) => {
    try {
        const { startedAt, endedAt } = req?.body;
        const userId = req?.user?.id;

        if (!startedAt || !endedAt) {
            return res.status(400).json({
                success: false,
                message: "startedAt and endedAt are required",
            });
        }

        const result = await performanceService.calculateReward(userId, startedAt, endedAt);
        return res.status(200).json({
            success: true,
            data: result,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};