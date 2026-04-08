const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AuthService {
  static createToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });
  }

  static async signup({ name, email, password }) {
    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    user.password = undefined;
    return user;
  }

  static async login({ email, password }) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = this.createToken({
      id: user._id,
      email: user.email,
    });

    user.password = undefined;

    return { user, token };
  }
}

module.exports = AuthService;