const loginUser = require("../controllers/loginController");
const registerUser = require("../controllers/registerController");
const express = require("express");
const router = express.Router();
const authGuard = require("../middleware/authGaurd");
router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
