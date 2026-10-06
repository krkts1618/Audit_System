const Asset = require("../models/Assets");

const bulkUploadAssets = async (req, res) => {
  try {
    const assets = req.body;

    const insertedAssets = await Asset.insertMany(assets);

    return res.status(201).json({
      message: "Assets uploaded successfully",
      totalAssets: insertedAssets.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  bulkUploadAssets,
};