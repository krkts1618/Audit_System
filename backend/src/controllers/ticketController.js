const Ticket = require("../models/Ticket");
const Asset = require("../models/Assets");

const createTicket = async (req, res) => {
  try {
    const { assetId, description, severity } = req.body;

    const reportedBy = req.user.id;

    const ticket = await Ticket.create({
      assetRef: assetId,
      description,
      severity,
      reportedBy,
    });

    await Asset.findByIdAndUpdate(assetId, {
      status: "Defective",
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({})
      .populate("assetRef")
      .populate("reportedBy", "-password");

    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  updateTicketStatus,
};