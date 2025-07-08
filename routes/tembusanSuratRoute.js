const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tembusanSuratController');

router.get('/', ctrl.getAllTembusan);
router.post('/new', ctrl.createTembusan);
router.delete(`/delete/:id`, ctrl.deleteTembusan);

module.exports = router;
