const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minLength: 3 },
    email: { type: String, required: true, email: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["HOD", "Care Taker", "Fixer"],
      required: true,
    },
    department: { type: String, required: true },
  },
  { timestamps: true },
);
module.exports = mongoose.model("User", UserSchema);
