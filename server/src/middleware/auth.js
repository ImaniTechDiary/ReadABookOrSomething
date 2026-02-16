import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  verifyToken
} from "../utils/jwt.js";

export const requireAuth = (req, _res, next) => {
  try {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];

    if (!token) {
      const error = new Error("Missing access token");
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyToken(token, process.env.JWT_ACCESS_SECRET);
    req.auth = { userId: payload.sub };
    next();
  } catch {
    const error = new Error("Invalid or expired access token");
    error.statusCode = 401;
    next(error);
  }
};

export const clearAuthCookies = (res, isProd) => {
  const config = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/"
  };

  res.clearCookie(ACCESS_COOKIE_NAME, config);
  res.clearCookie(REFRESH_COOKIE_NAME, config);
};
