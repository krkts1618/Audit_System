import api from "./api";

/**
 * Upload assets CSV file for bulk insertion
 * @param {File|Blob} file - CSV file to upload
 * @returns {Promise<any>} Response data from server
 */
export const uploadCsv = async (file) => {
  if (!file) {
    throw new Error("CSV file is required");
  }

  if (file.name && !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Invalid file type. Only CSV files are allowed.");
  }

  const formData = new FormData();
  formData.append("csvFile", file);

  try {
    const response = await api.post("/api/assets/bulk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (err) {
    // If backend mounts asset routes at /api/infra/assets/bulk instead of /api/assets/bulk, fall back cleanly
    if (err.response?.status === 404) {
      const fallbackResponse = await api.post("/api/infra/assets/bulk", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return fallbackResponse.data;
    }
    throw err;
  }
};

/**
 * Fetch all rooms
 * @returns {Promise<any>} Response data from server
 */
export const getRooms = async () => {
  try {
    const response = await api.get("/api/rooms");
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const fallbackResponse = await api.get("/api/infra/rooms");
      return fallbackResponse.data;
    }
    throw err;
  }
};

export default {
  uploadCsv,
  getRooms,
};
