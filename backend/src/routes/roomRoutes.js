const express = require("express");
const router = express.Router();

const authGuard = require("../middleware/authGaurd");
const roleCheck = require("../middleware/rolecheck");

const {
  createRoom,
  getAllRooms,
} = require("../controllers/roomController");

router.post("/", authGuard, roleCheck("HOD"), createRoom);

router.get("/", authGuard, getAllRooms);

module.exports = router;