const express = require("express");
const router = express.Router();
const DocumentController = require("../controllers/documentController")
const upload = require("../middleware/multer")

router.post('/new', upload.single("file"), DocumentController.createDocument);
router.get('/all', DocumentController.getAllDocument);
router.get(`/:id`, DocumentController.getByIdDocument);
router.delete(`/:id`, DocumentController.deleteDocument);

module.exports = router;