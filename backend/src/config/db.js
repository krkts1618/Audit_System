const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDb connected successfully");
  } catch (e) {
    console.log(e);
  }
};
module.exports = connectDB;
