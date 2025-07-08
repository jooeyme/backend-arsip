const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tujuanSuratController');

router.get('/', ctrl.getAllTujuan);
router.post('/new', ctrl.createTujuan);
router.delete(`/delete/:id`, ctrl.deleteTujuan);

module.exports = router;
