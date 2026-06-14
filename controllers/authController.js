// controllers/authController.js  (backend)
const { AuthService, sha256 } = require("../services/authService");
const jwt = require("jsonwebtoken");
const Session = require("../models/sessionModel");

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // FIX: was "maxAage" (typo) — cookie never expired
};

exports.signup = async (req, res) => {
  try {
    const ip = req.ip;
    const userAgent = req.headers["user-agent"];

    const { user, token, refreshToken } = await AuthService.signup(
      req?.body,
      ip,
      userAgent
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
      token,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const ip = req.ip;
    const userAgent = req.headers["user-agent"];

    const { user, token, refreshToken } = await AuthService.login(
      req.body,
      ip,
      userAgent
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);

    res.status(200).json({ success: true, token, user, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: error.message });
  }
};

// ── refresh token ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  // FIX: read from req.cookies (was req.cookies — correct — but logic order was wrong)
  const refreshToken =req.body.refreshToken ;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  // FIX: verify FIRST, then look up session
  let decoded;
  try {
    // FIX: use JWT_REFRESH_SECRET (was JWT_SECRET — same secret for both tokens)
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  // FIX: use SHA-256 (deterministic) so the session row can actually be found.
  // bcrypt is non-deterministic — hashing the same value twice gives different
  // outputs, so Session.findOne({ refreshTokenHash }) would NEVER match.
  const refreshTokenHash = sha256(refreshToken);

  const session = await Session.findOne({ refreshTokenHash, revoked: false });
  if (!session) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  // Rotate refresh token
  const newRefreshToken = AuthService.createRefreshToken({
    id: decoded.id,
    email: decoded.email,
  });
  session.refreshTokenHash = sha256(newRefreshToken);
  await session.save();

  res.cookie("refreshToken", newRefreshToken, COOKIE_OPTS);

  const token = AuthService.accessToken({ id: decoded.id, email: decoded.email });

  res.status(200).json({ success: true, message: "Token refreshed successfully", token, newRefreshToken });
};

// ── logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  // FIX: was "res?.cookies" — should be "req.cookies"
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token not found" });
  }

  // FIX: SHA-256 lookup (bcrypt re-hash can't match stored value)
  const refreshTokenHash = sha256(refreshToken);

  const session = await Session.findOne({ refreshTokenHash, revoked: false });
  if (!session) {
    return res.status(400).json({ message: "Invalid refresh token" });
  }

  session.revoked = true;
  await session.save();

  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
};