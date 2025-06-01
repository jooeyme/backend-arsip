const express = require("express");
const router = express.Router();
const suratKeluarController = require("../controllers/suratKeluarController")
const auth = require("../middleware/auth")
const upload = require("../middleware/multer")

router.post('/new', auth.authenticate,
    upload.fields([
        { name: "draft", maxCount: 1 },
        { name: "lampiran", maxCount: 5 }
    ]),
    suratKeluarController.createSuratKeluar
);
router.post(
  '/:id/upload-signed', auth.authenticate,
  upload.single('file'),  // multer middleware
  suratKeluarController.uploadSigned
);

router.get('/dashboard', auth.authenticate, suratKeluarController.getDashboardSuratKeluar);
router.get('/:id/track', suratKeluarController.getTrackingSuratKeluar);
router.get('/all', suratKeluarController.getAllSuratKeluar);
router.get('/archived', suratKeluarController.getArchivedSuratKeluar)
router.get('/download', suratKeluarController.downloadArchivedSuratKeluarXlsx);
router.get(`/:id`, suratKeluarController.getByIdSuratKeluar);
router.delete(`/:id`, auth.authenticate, suratKeluarController.deleteSuratKeluar);
router.get(`/by-user/dosen`,auth.authenticate, auth.authorize(['Dosen']), suratKeluarController.getSuratKeluarByUser);
router.get('/', suratKeluarController.searchSuratKeluar);
router.put('/:id/arsip', auth.authenticate, suratKeluarController.archiveSuratKeluar);
router.put('/edit/:id', auth.authenticate, suratKeluarController.editSuratKeluar);
router.put('/generate-nomor/:id', auth.authenticate, suratKeluarController.generateNumber);
router.put('/edit/status/:id', auth.authenticate, suratKeluarController.updateStatusSuratKeluar);

module.exports = router;