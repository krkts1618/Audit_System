const multer = require("multer");

const storage = multer.memoryStorage(); //memoryStorage stores the files in temporary ram , so it was better rather than the diskStorage
// checking the uploaded file is csv or not
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only csv files are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, //setting the file size to 5MB
});
module.exports = upload;
