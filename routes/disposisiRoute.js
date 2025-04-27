const express = require("express");
const router = express.Router();
const DisposisiController = require("../controllers/disposisiController")

router.post('/new', DisposisiController.createDisposisi);
router.get('/all', DisposisiController.getAllDisposisi);
router.get(`/:id`, DisposisiController.getByIdDisposisi);
router.delete(`/:id`, DisposisiController.deleteDisposisi);
router.patch(`/edit/:id`, DisposisiController.editDisposisi);

module.exports = router;