const { AuthService, sha256 } = require("../services/authService");
const jwt = require("jsonwebtoken");
const Session = require("../models/sessionModel");

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};

exports.signup = async (req, res) => {
  try {
    const ip = req?.ip;
    const userAgent = req?.headers["user-agent"];

    const { user, token, refreshToken } = await AuthService.signup(
      req?.body,
      ip,
      userAgent
    );


    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
      token,
      refreshToken
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const ip = req?.ip;
    const userAgent = req?.headers["user-agent"];

    const { user, token, refreshToken } = await AuthService.login(
      req.body,
      ip,
      userAgent
    );


    res.status(200).json({ success: true, token, user, message: "Login successful", refreshToken });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ success: false, message: error.message });
  }
};


exports.refreshToken = async (req, res) => {
  const refreshToken = req?.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const refreshTokenHash = sha256(refreshToken);

  const session = await Session.findOne({ refreshTokenHash, revoked: false });
  if (!session) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  const newRefreshToken = AuthService.createRefreshToken({
    id: decoded.id,
    email: decoded.email,
  });
  session.refreshTokenHash = sha256(newRefreshToken);
  await session.save();


  const token = AuthService.accessToken({ id: decoded.id, email: decoded.email });

  res.status(200).json({ success: true, message: "Token refreshed successfully", token, refreshToken: newRefreshToken });
};

exports.logout = async (req, res) => {
  const refreshToken = req?.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token not found" });
  }

  const refreshTokenHash = sha256(refreshToken);

  const session = await Session.findOne({ refreshTokenHash, revoked: false });
  if (!session) {
    return res.status(400).json({ message: "Invalid refresh token" });
  }

  session.revoked = true;
  await session.save();

  res.status(200).json({ message: "Logged out successfully" });
};