const HabitService = require("../services/habitService");

exports.createHabit = async (req, res) => {
  try {
    
    const habit = await HabitService.createHabit(req?.user?.id, req?.body);
    res.status(201).json(habit);
    
    
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.logHabit = async (req, res) => {
  try {
    const { habitId, date, value, completed } = req?.body;
    const habit = await HabitService.logHabit(
      req.user.id,
      habitId,
      date,
      value,
      completed
    );
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getUserHabits = async (req, res) => {
  try {
    const habits = await HabitService.getUserHabits(req?.user?.id);
    res.json(habits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.disableHabit = async (req, res) => {
  try {
    const habit = await HabitService.disableHabit(req?.user?.id, req?.params?.id);
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};