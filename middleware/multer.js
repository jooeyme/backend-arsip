const multer = require("multer");

// Konfigurasi penyimpanan file sementara di folder "uploads/"
const upload = multer({ dest: "uploads/" });

module.exports = upload;
