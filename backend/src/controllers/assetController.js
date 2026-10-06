const Asset = require("../models/Assets");
const csvtojson = require("csvtojson");

const bulkUploadAssets = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload a valid CSV file" });
    }
    const csvString = req.file.buffer.toString("utf8");
    const jsonArray = await csvtojson().fromString(csvString);
    const assets = jsonArray.map((item) => ({
      ...item,
    }));

    const insertedAssets = await Asset.insertMany(assets);

    res.status(201).json({
      success: true,
      message: `${insertedAssets.length} assets successfully uploaded!`,
      assets: insertedAssets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  bulkUploadAssets,
};
