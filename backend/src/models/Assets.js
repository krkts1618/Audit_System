const mongoose = require("mongoose");
const AssetSchema = new mongoose.schema(
  {
    assetTagId: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Defective", "Discarded"],
      default: "Active",
    },
    roomref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Asset", AssetSchema);
