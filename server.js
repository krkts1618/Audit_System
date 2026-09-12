require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();

connectDB();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.post("/users", async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});