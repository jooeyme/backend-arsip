const express = require("express");
const router = express.Router();
const klasifikasiSuratController = require("../controllers/klasifikasiSuratController");

router.post('/new', klasifikasiSuratController.createKlasifikasi);
router.get('/all', klasifikasiSuratController.getAllKlasifikasi);

module.exports = router;