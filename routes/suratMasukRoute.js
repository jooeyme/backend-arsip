const express = require("express");
const router = express.Router();
const suratMasukController = require("../controllers/suratMasukController")
const upload = require("../middleware/multer")
const auth = require("../middleware/auth")

router.post('/new', upload.single("file"), suratMasukController.createSuratMasuk);
router.get('/all', suratMasukController.getAllSuratMasuk);
router.get(`/:id`, suratMasukController.getByIdSuratMasuk);
router.delete(`/:id`, suratMasukController.deleteSuratMasuk);
router.get('/', suratMasukController.searchSuratMasuk);
router.put('/edit/:id', suratMasukController.editSuratMasuk);
router.put('/edit/status/:id', auth.authenticate, suratMasukController.updateStatusSuratMasuk);

module.exports = router;