const Ticket = require("../models/Ticket");
const Asset = require("../models/Assets");
const sendEmail = require("../utils/mailer");

const createTicket = async (req, res) => {
  try {
    const { assetId, description, severity } = req.body;
    const reportedBy = req.user.id;

    // 1. Fetch asset details early so we can include them in the emergency email
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const initialStatus = severity === "Critical" ? "Dispatched" : "Open";

    const ticket = await Ticket.create({
      assetRef: assetId,
      description,
      severity,
      reportedBy,
      status: initialStatus,
    });

    await Asset.findByIdAndUpdate(assetId, {
      status: "Defective",
    });

    if (severity === "Critical") {
      const emailSubject = "🚨 URGENT: Critical Defect Reported";
      const emailHTML = `
        <h2>Critical Maintenance Required</h2>
        <p><strong>Asset ID:</strong> ${asset._id}</p>
        <p><strong>Issue:</strong> ${description}</p>
        <p><strong>Reported By User ID:</strong> ${reportedBy}</p>
        <br/>
        <p>This ticket has been automatically marked as Dispatched. Please attend to it immediately.</p>
      `;

      await sendEmail("krkts1618@gmail.com", emailSubject, emailHTML);
    }

    return res.status(201).json({
      success: true,
      message:
        severity === "Critical"
          ? "Critical ticket created and maintenance team notified."
          : "Ticket created successfully",
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
      { new: true },
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
