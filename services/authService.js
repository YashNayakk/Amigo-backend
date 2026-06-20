const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../models/sessionModel");

 
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

class AuthService {

  static accessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
  }

  static createRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }


  static async signup(body, ip, userAgent) {
    const { name, email, password } = body;

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const refreshToken = this.createRefreshToken({
      id: user._id,
      email: user.email,
    });

    const refreshTokenHash = sha256(refreshToken);

    const session = await Session.create({
      user: user._id,
      refreshTokenHash,
      ip,
      userAgent,
    });

    const token = this.accessToken({ id: user._id, email: user.email });

    user.password = undefined;
    return { user, token, refreshToken };
  }


  static async login({ email, password }, ip, userAgent) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = this.accessToken({ id: user._id, email: user.email });

    const refreshToken = this.createRefreshToken({
      id: user._id,
      email: user.email,
    });

    const refreshTokenHash = sha256(refreshToken);
    await Session.create({ user: user._id, refreshTokenHash, ip, userAgent });

    user.password = undefined;
    return { user, token, refreshToken };
  }
}

module.exports = { AuthService, sha256 };