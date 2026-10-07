const express = require("express");
const router = express.Router();

const authGuard = require("../middleware/authGaurd");
const roleCheck = require("../middleware/rolecheck");
const upload = require("../middleware/upload");
const { bulkUploadAssets } = require("../controllers/assetController");

router.use(authGuard);
router.post(
  "/bulk",
  roleCheck("HOD"),
  upload.single("csvFile"),
  bulkUploadAssets,
);

module.exports = router;
