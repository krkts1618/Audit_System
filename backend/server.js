const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const cors = require("cors");
const app = express();
const connectDB = require("./src/config/db");

app.use(cors());
app.use(express.json());

connectDB();
const port = process.env.PORT | 5000;
app.listen(port, () => {
  console.log(`server running successfully on port ${port}`);
});
