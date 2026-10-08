const cron = require("node-cron");
const Ticket = require("../models/Ticket");
const sendEmail = require("../utils/mailer");

cron.schedule("*/1 * * * *", async () => {
  try {
    const openTickets = await Ticket.find({
      severity: "Routine",
      status: "Open",
    }).populate("assetRef", "name assetTagId");

    if (openTickets.length === 0) {
      return;
    }

    let emailHTML = `
      <h3>Hello Maintenance Team,</h3>
      <p>Here are the routine fixes for today:</p>
      <ul>
    `;

    openTickets.forEach((ticket) => {
      const assetName = ticket.assetRef?.name || "Unknown Asset";
      const assetTag = ticket.assetRef?.assetTagId || "N/A";

      emailHTML += `<li><strong>${assetName} (${assetTag}):</strong> ${ticket.description}</li>`;
    });

    emailHTML += `</ul>`;

    await sendEmail(
      "ravikumar.kocherla24@sasi.ac.in",
      `Routine Maintenance Batch - ${openTickets.length} Items`,
      emailHTML,
    );

    const ticketIds = openTickets.map((ticket) => ticket._id);
    await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { $set: { status: "Dispatched" } },
    );

    console.log(
      `[Cron] Batch email sent and ${openTickets.length} tickets marked as Dispatched.`,
    );
  } catch (error) {
    console.error("[Cron Error]:", error.message);
  }
});
