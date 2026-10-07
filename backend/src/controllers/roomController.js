const Room = require("../models/Room");

const createRoom = async (req, res) => {
  try {
    const { block, department, floor, roomNumber } = req.body;

    const room = await Room.create({
      block,
      department,
      floor,
      roomNumber,
    });

    return res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find({});

    return res.status(200).json({
      rooms,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
};