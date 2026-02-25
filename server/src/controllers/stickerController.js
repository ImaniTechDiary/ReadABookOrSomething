import { searchIconscoutStickers } from "../services/stickerSources/iconscout.js";

export const searchStickers = async (req, res, next) => {
  try {
    const query = (req.query.q || "").toString();
    const limit = Number(req.query.limit) || 24;
    const page = Number(req.query.page) || 1;

    const data = await searchIconscoutStickers({ query, limit, page });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};
