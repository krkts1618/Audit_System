const bcrypt = require("bcrypt");
const User = require("../models/User");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      department,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = registerUser;