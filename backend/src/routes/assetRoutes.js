const express = require("express");
const router = express.Router();

const authGuard = require("../middleware/authGaurd");
const roleCheck = require("../middleware/rolecheck");

const { bulkUploadAssets } = require("../controllers/assetController");

router.post("/bulk", authGuard, roleCheck("HOD"), bulkUploadAssets);

module.exports = router;