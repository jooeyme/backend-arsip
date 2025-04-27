const express = require("express");
const router = express.Router();
const logPerubahan = require(`../controllers/logPerubahanController`)
const upload = require("../middleware/multer")
const auth = require("../middleware/auth")


router.get(`/all`, logPerubahan.getAllLog);


module.exports = router;