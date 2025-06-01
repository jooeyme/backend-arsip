const express = require("express");
const router = express.Router();
const DocumentController = require("../controllers/documentController");
const upload = require("../middleware/multer");
const auth = require("../middleware/auth");

router.post('/new', auth.authenticate ,upload.single("file"), DocumentController.createDocument);
router.get('/all', DocumentController.getAllDocument);
router.get(`/:id`, DocumentController.getByIdDocument);
router.delete(`/:id`, auth.authenticate, DocumentController.deleteDocument);
router.put(`/edit/:id`, auth.authenticate, upload.single("file"), DocumentController.editDocument);
router.get(`/stats/all`, DocumentController.getDashboardStats);

module.exports = router;