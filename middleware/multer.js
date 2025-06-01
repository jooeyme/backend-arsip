const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");          // folder sementara
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${Date.now()}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024    // batasi 10 MB per file
    },
    fileFilter: (req, file, cb) => {
      // Contoh: hanya terima PDF
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Hanya file PDF yang diizinkan"), false);
    }
  });

// Konfigurasi penyimpanan file sementara di folder "uploads/"

module.exports = upload;
