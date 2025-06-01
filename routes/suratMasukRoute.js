const express = require("express");
const router = express.Router();
const suratMasukController = require("../controllers/suratMasukController")
const upload = require("../middleware/multer")
const auth = require("../middleware/auth")

router.post('/new', 
    auth.authenticate, 
    upload.fields([
        { name: "dokumen_utama", maxCount: 1 },
        { name: "lampiran", maxCount: 5 }
    ]), 
    suratMasukController.createSuratMasuk);
router.get('/:id/track', suratMasukController.getTrackSuratMasuk);
router.get('/all', auth.authenticate, suratMasukController.getAllSuratMasuk);
router.get('/dashboard', auth.authenticate, suratMasukController.getDashboardSuratMasuk);
router.get('/dashboard/admin', suratMasukController.getAdminArchive);
router.get('/dashboard/kadep', suratMasukController.getKadepList);
router.get('/dashboard/disposisi', auth.authenticate, suratMasukController.getDisposisiList);
router.get('/archived', suratMasukController.getArchivedSuratMasuk)
router.get('/download', suratMasukController.downloadArchivedSuratMasuk);
router.get(`/:id`, suratMasukController.getByIdSuratMasuk);
router.delete(`/:id`, auth.authenticate, suratMasukController.deleteSuratMasuk);
router.get('/', suratMasukController.searchSuratMasuk);
router.put('/edit/:id', auth.authenticate, suratMasukController.editSuratMasuk);
router.put('/edit/status/:id', auth.authenticate, suratMasukController.updateStatusSuratMasuk);
router.put('/:id/arsip', auth.authenticate, suratMasukController.archiveSuratMasuk)
router.get('/recipient/user', auth.authenticate, suratMasukController.getSuratMasukforUser);
router.get(`/recent/all`, suratMasukController.getRecentLetters);

module.exports = router;