const Follow = require("../models/followModel");
const User = require("../models/userModel");

exports.followUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const alreadyFollowing = await Follow.findOne({
      follower: userId,
      following: targetUserId,
    });

    if (alreadyFollowing) {
      return res.status(400).json({
        success: false,
        message: "Already following",
      });
    }

    await Follow.create({
      follower: userId,
      following: targetUserId,
    });

    await User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: 1 } });

    res.status(200).json({
      success: true,
      message: "User followed successfully",
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({
      success: false,
      message: "Follow failed",
    });
  }
};
