import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_MAX_AGE_MS,
  cookieConfig,
  signAccessToken,
  signRefreshToken,
  verifyToken
} from "../utils/jwt.js";
import { clearAuthCookies } from "../middleware/auth.js";

const isProd = process.env.NODE_ENV === "production";

const setAuthCookies = (res, accessToken, refreshToken) => {
  const config = cookieConfig(isProd);

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...config,
    maxAge: ACCESS_MAX_AGE_MS
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...config,
    maxAge: REFRESH_MAX_AGE_MS
  });
};

const sanitizeUser = (userDoc) => ({
  id: userDoc._id,
  name: userDoc.name,
  email: userDoc.email
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash
    });

    const accessToken = signAccessToken(user._id.toString(), process.env.JWT_ACCESS_SECRET);
    const refreshToken = signRefreshToken(user._id.toString(), process.env.JWT_REFRESH_SECRET);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const accessToken = signAccessToken(user._id.toString(), process.env.JWT_ACCESS_SECRET);
    const refreshToken = signRefreshToken(user._id.toString(), process.env.JWT_REFRESH_SECRET);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ message: "missing refresh token" });
    }

    const payload = verifyToken(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || user.refreshToken !== token) {
      clearAuthCookies(res, isProd);
      return res.status(401).json({ message: "invalid refresh token" });
    }

    const accessToken = signAccessToken(user._id.toString(), process.env.JWT_ACCESS_SECRET);
    const refreshToken = signRefreshToken(user._id.toString(), process.env.JWT_REFRESH_SECRET);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    clearAuthCookies(res, isProd);
    return res.status(401).json({ message: "invalid or expired refresh token" });
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (token) {
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    }

    clearAuthCookies(res, isProd);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId).select("name email");

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
};
