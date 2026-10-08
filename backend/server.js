const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const roomRoutes = require("./src/routes/roomRoutes");
const assetRoutes = require("./src/routes/assetRoutes");
const ticketRoutes = require("./src/routes/ticketRoutes");

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/tickets", ticketRoutes);

require("./src/workers/emailCronJob");

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running successfully on port ${port}`);
});
