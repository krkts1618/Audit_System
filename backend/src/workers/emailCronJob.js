const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Ticket = require("../models/Ticket");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

cron.schedule("*/1 * * * *", async () => {
  try {
    const openTickets = await Ticket.find({
      severity: "Routine",
      status: "Open",
    }).populate("assetRef", "name assetTagId");

    if (openTickets.length === 0) {
      return;
    }
    let emailText = `Hello Maintenance Team,\n\nHere are the routine fixes for today:\n\n`;

    openTickets.forEach((ticket, index) => {
      emailText += `${index + 1}. ${ticket.assetRef.name} (${ticket.assetRef.assetTagId})\n`;
      emailText += `   Issue: ${ticket.description}\n\n`;
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "ravikumar.kocherla24@sasi.ac.in",
      subject: `Routine Maintenance Batch - ${openTickets.length} Items`,
      text: emailText,
    });
    const ticketIds = openTickets.map((ticket) => ticket._id);

    await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { $set: { status: "Dispatched" } },
    );
    console.log("[Cron] Database updated: Tickets marked as Dispatched.");
  } catch (error) {
    console.error("[Cron Error]:", error.message);
  }
});
