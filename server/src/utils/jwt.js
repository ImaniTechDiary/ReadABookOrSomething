import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const signAccessToken = (userId, secret) =>
  jwt.sign({ sub: userId, type: "access" }, secret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS
  });

export const signRefreshToken = (userId, secret) =>
  jwt.sign({ sub: userId, type: "refresh" }, secret, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS
  });

export const verifyToken = (token, secret) => jwt.verify(token, secret);

export const cookieConfig = (isProd) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/"
});

export const ACCESS_COOKIE_NAME = "accessToken";
export const REFRESH_COOKIE_NAME = "refreshToken";
export const ACCESS_MAX_AGE_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
export const REFRESH_MAX_AGE_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
