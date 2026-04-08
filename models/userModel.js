const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
/*
    userName: {
      type: String,
      unique: true,
    },
*/
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false, 
    },

    profilePicture: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: [
        "student",
        "developer",
        "designer",
        "entrepreneur",
        "professional",
        "other",
      ],
      default: "other",
    },

    bio: {
      type: String,
      maxlength: 200,
    },

    WitnessCount: {
      type: Number,
      default: 0,
    },

    
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);