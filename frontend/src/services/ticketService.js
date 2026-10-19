import api from "./api";

/**
 * Create a new maintenance ticket
 * @param {Object} data - Ticket payload ({ assetId, description, severity })
 * @returns {Promise<any>} Response data from server
 */
export const createTicket = async (data) => {
  if (!data) {
    throw new Error("Ticket data is required");
  }

  const response = await api.post("/api/tickets", data);
  return response.data;
};

/**
 * Fetch all tickets
 * @returns {Promise<any>} Response data from server
 */
export const getTickets = async () => {
  try {
    const response = await api.get("/api/tickets");
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const fallbackResponse = await api.get("/api/infra/tickets");
      return fallbackResponse.data;
    }
    throw err;
  }
};

/**
 * Update the status of an existing ticket
 * @param {string} id - Ticket identifier
 * @param {string} status - New ticket status
 * @returns {Promise<any>} Response data from server
 */
export const updateTicketStatus = async (id, status) => {
  if (!id || (typeof id === "string" && !id.trim())) {
    throw new Error("Ticket ID is required");
  }

  if (!status || (typeof status === "string" && !status.trim())) {
    throw new Error("Status is required");
  }

  const encodedId = encodeURIComponent(id);
  const response = await api.patch(`/api/tickets/${encodedId}/status`, {
    status,
  });

  return response.data;
};

export default {
  createTicket,
  getTickets,
  updateTicketStatus,
};
