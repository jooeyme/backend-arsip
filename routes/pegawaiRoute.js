const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pegawaiController');

router.get('/', ctrl.getAllPegawai);
router.post('/new', ctrl.createPegawai);
router.delete(`/delete/:id`, ctrl.deletePegawai)

module.exports = router;
