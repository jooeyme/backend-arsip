const express = require("express");
const router = express.Router();
const suratKeluarController = require("../controllers/suratKeluarController")
const auth = require("../middleware/auth")
const upload = require("../middleware/multer")

router.post('/new', upload.single("file"), suratKeluarController.createSuratKeluar);
router.get('/all', suratKeluarController.getAllSuratKeluar);
router.get(`/:id`, suratKeluarController.getByIdSuratKeluar);
router.delete(`/:id`, suratKeluarController.deleteSuratKeluar);
router.get(`/by-user/dosen`,auth.authenticate, auth.authorize(['Dosen']), suratKeluarController.getSuratKeluarByUser);
router.patch(`/edit/:id`, suratKeluarController.editSuratKeluar);
router.get('/', suratKeluarController.searchSuratKeluar);

module.exports = router;