const mongoose = require("mongoose");
const TicketSchema = new mongoose.schema(
  {
    description: { type: String, required: true },
    severity: { type: String, enum: ["Routine", "Critical"], required: true },
    status: {
      type: String,
      enum: ["Open", "Dispatched", "Pending Verification", "Closed"],
      default: "Open",
    },
    assetRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fixedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ticket", TicketSchema);
