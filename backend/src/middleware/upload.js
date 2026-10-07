const multer = require("multer");

const storage = multer.memoryStorage(); //memory storage is better for storing the files temporarily rather than using the diskStorage

const fileFilter = (req, file, cb) => {
  // Check if it is a CSV by mimetype OR file extension
  if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Invalid file type. Only CSV files are allowed."), false); // Reject it
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
}); // Limit file size to 5MB

module.exports = upload;
