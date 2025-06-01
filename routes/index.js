const express = require("express");
const router = express.Router();
const SuratMasukRoute = require("./suratMasukRoute");
const SuratKeluarRoute = require("./suratKeluarRoute");
const DisposisiRoute = require("./disposisiRoute");
const DocumentRoute = require("./documentRoute");
const UserRoute = require("./userRoute");
const LogRoute = require("./logRoute");
const KlasifikasiRoute = require("./klasifikasiRoute");
const ReviewRoute = require('./reviewRoute');
const tujuanRoutes = require('./tujuanSuratRoute');

router.get('/health-check', (req, res) => {
    res.status(200).json({
        message: 'Connected Successfully to Server'
    })
})

router.use('/surat-masuk', SuratMasukRoute);
router.use('/surat-keluar', SuratKeluarRoute);
router.use('/disposisi', DisposisiRoute);
router.use('/document', DocumentRoute);
router.use('/user', UserRoute);
router.use('/log', LogRoute);
router.use('/klasifikasi-surat', KlasifikasiRoute);
router.use('/review', ReviewRoute);
router.use('/tujuan', tujuanRoutes);

module.exports = router;