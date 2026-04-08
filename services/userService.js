const User = require("../models/userModel");

class UserService {
  
  static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user
  }

  
  static async updateProfile(userId, updates) {
    const allowedUpdates = ["name" , "userName" ,"bio", "role", "profilePicture"];

    const safeUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      safeUpdates,
      { new: true }
    );

    if (!updatedUser) {
      throw new Error("Profile update failed");
    }

    return updatedUser;
  }
}

module.exports = UserService;