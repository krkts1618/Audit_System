import api from "./api";

const registerUser = async (userData) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};

const loginUser = async (credentials) => {
  try {
    const response = await api.post("/api/auth/login", credentials);
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export { registerUser, loginUser };
