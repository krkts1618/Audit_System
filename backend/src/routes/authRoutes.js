const loginUser = require("../controllers/loginController");
const registerUser = require("../controllers/registerController");
const express = require("express");
const router = express.Router();
const authGuard = require("../middleware/authGaurd");
// const roleCheck = require("../middleware/roleCheck");
router.post("/register", registerUser);
 router.post("/login", loginUser);
// router.get("/api/test-hod", authGuard, roleCheck("HOD"), (req, res) => {
//   res.json({ message: `Welcome HOD of college ${req.user.collegeCode}` });
// });

module.exports = router;
