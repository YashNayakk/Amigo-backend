// services/authService.js  (backend)
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../models/sessionModel");

// ---------------------------------------------------------------------------
// Deterministic helper – bcrypt is non-deterministic so we can NEVER re-hash
// a token and find the stored row.  Use SHA-256 for session lookup instead.
// ---------------------------------------------------------------------------
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

class AuthService {
  // ── token helpers ──────────────────────────────────────────────────────────

  static accessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
  }

  // FIX: use a separate secret for refresh tokens
  static createRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  // ── signup ─────────────────────────────────────────────────────────────────

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

    // FIX: use SHA-256 so we can deterministically look up the session later
    const refreshTokenHash = sha256(refreshToken);

    const session = await Session.create({
      user: user._id,
      refreshTokenHash,
      ip,
      userAgent,
    });
    console.log("Session created:", session._id);

    const token = this.accessToken({ id: user._id, email: user.email });

    // FIX: strip password before returning
    user.password = undefined;
    return { user, token, refreshToken };
  }

  // ── login ──────────────────────────────────────────────────────────────────

  static async login({ email, password }, ip, userAgent) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    // FIX: was calling this.createToken which didn't exist
    const token = this.accessToken({ id: user._id, email: user.email });

    const refreshToken = this.createRefreshToken({
      id: user._id,
      email: user.email,
    });

    // FIX: SHA-256 hash
    const refreshTokenHash = sha256(refreshToken);
    await Session.create({ user: user._id, refreshTokenHash, ip, userAgent });

    user.password = undefined;
    return { user, token, refreshToken };
  }
}

module.exports = { AuthService, sha256 };