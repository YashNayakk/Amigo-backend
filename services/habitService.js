const Habit = require("../models/habitModel")

class HabitService {


    static async createHabit(userId, data) {
        const { name, type, unit, target, targetType, frequency, description, question } = data;

        if (!name) throw new Error('Habit name required');
        if (!type) throw new Error('Habit type required');

        const habitData = {
            user: userId,
            name,
            type,
            frequency: frequency || 'daily',
            description,
            question,
        };

        if (type === 'measurable') {
            if (!unit || target === undefined) {
                throw new Error('Unit and target required for measurable habits');
            }
            habitData.unit = unit;
            habitData.target = target;
            habitData.targetType = targetType || 'at_least';
        }

        return Habit.create(habitData);
    }


    static async logHabit(userId, habitId, date, value, completed) {
        const habit = await Habit.findOne({ _id: habitId, user: userId, active: true });
        if (!habit) throw new Error('Habit not found');

        const logDate = new Date(date);
        logDate.setHours(0, 0, 0, 0);

        habit.logs = habit.logs.filter(log => {
            const d = new Date(log.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() !== logDate.getTime();
        });

        const newLog = { date: logDate };
        if (habit.type === 'yesno') {
            newLog.completed = completed;
        } else {
            newLog.value = value;
        }
        habit.logs.push(newLog);

        if (habit.logs.length > 90) {
            habit.logs = habit.logs.slice(-90);
        }

        const today = this._today();
        if (logDate.getTime() === today.getTime()) {
            const isCompleted =
                habit.type === 'yesno' ? completed : value >= habit.target;

            if (isCompleted) {
                if (habit.lastCompletedAt && this._isYesterday(habit.lastCompletedAt, today)) {
                    habit.streak += 1;
                } else if (!habit.lastCompletedAt || !this._isSameDay(habit.lastCompletedAt, today)) {
                    habit.streak = 1;
                }
                habit.longestStreak = Math.max(habit.longestStreak || 0, habit.streak);
                habit.lastCompletedAt = today;
            }
        }

        await habit.save();

       
        try {
            const { calculatePerformance } = require('./performanceService');
            calculatePerformance(userId).catch(err =>
                console.warn('[perf] recalc failed after habit log:', err.message)
            );
        } catch (err) {
            console.warn('[perf] could not require performanceService:', err.message);
        }

        return habit;
    }


    static async getUserHabits(userId) {
        return Habit.find({ user: userId, active: true })
            .select('name type unit target targetType frequency streak longestStreak logs lastCompletedAt createdAt')
            .sort({ createdAt: -1 })
            .lean();
    }


    static async disableHabit(userId, habitId) {
        const habit = await Habit.findOneAndUpdate(
            { _id: habitId, user: userId },
            { active: false },
            { new: true }
        );
        if (!habit) throw new Error('Habit not found');
        return habit;
    }


    static _today() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    static _isSameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    static _isYesterday(date, today) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return this._isSameDay(date, yesterday);
    }
}

module.exports = HabitService;