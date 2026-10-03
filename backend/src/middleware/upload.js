const multer = require("multer");

const storage = multer.memoryStorage(); //memory storage is better for storing the files temporarily rather than using the diskStorage

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG and PNG are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
}); // Limit file size to 5MB

module.exports = upload;
