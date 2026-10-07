const express = require("express");
const router = express.Router();

const authGuard = require("../middleware/authGaurd");
const rolecheck = require("../middleware/rolecheck");

const {
  createTicket,
  getTickets,
  updateTicketStatus,
} = require("../controllers/ticketController");

router.post(
  "/",
  authGuard,
  rolecheck("Care Taker"),
  createTicket
);

router.get(
  "/",
  authGuard,
  getTickets
);

router.patch(
  "/:id/status",
  authGuard,
  rolecheck("Fixer", "Care Taker"),
  updateTicketStatus
);

module.exports = router;