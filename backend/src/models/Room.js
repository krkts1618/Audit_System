const mongoose = require("mongoose");
const RoomSchema = new mongoose.schema(
  {
    roomNumber: { type: String, required: true },
    floor: { type: String, required: true },
    department: { type: String, required: true },
    block: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Room", RoomSchema);
