const express = require("express");
const router = express.Router();
const DisposisiController = require("../controllers/disposisiController")
const auth = require("../middleware/auth")

router.post('/new', auth.authenticate, DisposisiController.createDisposisi);
router.get('/all', DisposisiController.getAllDisposisi);
router.get(`/:id`, DisposisiController.getByIdDisposisi);
router.delete(`/:id`, DisposisiController.deleteDisposisi);
router.patch(`/edit/:id`, DisposisiController.editDisposisi);
router.patch('/:id/status', auth.authenticate, DisposisiController.updateDisposisiStatus);

module.exports = router;