const os = require("os");
const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs-extra");
const pdfPoppler = require("pdf-poppler");
const { convert } = require("pdf-poppler");
const { v4: uuidv4 } = require("uuid");

/**
 * Extract text dari halaman pertama PDF dengan OCR
 * 
 * @param {string}  filePath   Path ke file PDF
 * @param {object}  [opts]     Opsi tambahan
 * @param {number}  [opts.dpi] DPI gambar keluaran (default 300)
 * @param {string}  [opts.lang]  Bahasa untuk OCR (default "ind+eng")
 * @param {number}  [opts.psm]   Page Segmentation Mode Tesseract (default 3)
 * @returns {Promise<string>}    Teks hasil OCR
 */

// const extractTextFromPDF = async (filePath) => {
//     try {
//         const outputImagePath = path.join(__dirname, "output-1.png");

//         // Konversi halaman pertama PDF ke gambar
//         const opts = { format: "png", out_dir: __dirname, out_prefix: "output", page: 1 };
//         await pdfPoppler.convert(filePath, opts);

//         await new Promise(resolve => setTimeout(resolve, 2000));

//         // Jalankan OCR dengan bahasa Indonesia + Inggris
//         const { data } = await Tesseract.recognize(outputImagePath, "ind+eng", {
//             logger: (m) => console.log(m), // Log proses OCR
//         });

//         // Hapus gambar sementara
//         await fs.remove(outputImagePath);

//         return data.text;
//     } catch (error) {
//         console.error("Error extracting text from PDF:", error);
//         return "";
//     }
// };

async function extractTextFromPDF(filePath, opts = {}) {
  const {
    dpi = 300,
    lang = "ind+eng",
    psm = 3,
  } = opts;

  // 1) Buat nama file sementara unik di direktori temp
  const tempDir      = os.tmpdir();
  const uuidBase     = uuidv4();
  const popplerOpts  = {
    format: "png",
    out_dir: tempDir,
    out_prefix: uuidBase,
    page: 1,
    dpi,           // DPI tinggi = teks lebih tajam untuk OCR
  };

  try {
    // 2) Konversi halaman pertama ke PNG
    await convert(filePath, popplerOpts);

    const allFiles = await fs.readdir(tempDir);
    imageFiles = allFiles
      .filter(f => f.startsWith(uuidBase) && f.toLowerCase().endsWith(".png"))
      .map(f => path.join(tempDir, f))
      .sort(); // urutkan supaya halaman 1,2,3...

    if (imageFiles.length === 0) {
      throw new Error(`Gagal menemukan file PNG hasil convert untuk prefix "${uuidBase}"`);
    }

    let fullText = "";
    for (const imgPath of imageFiles) {
      // pastikan file ada
      if (!(await fs.pathExists(imgPath))) continue;

      const { data: { text } } = await Tesseract.recognize(imgPath, lang, {
        tessedit_pageseg_mode: psm,
        tessedit_ocr_engine_mode: 1,
        logger: m => console.log(m),  // opsional
      });

      fullText += text + "\n\n";  // tambahkan newline antar halaman
    }

    return fullText.trim();
  } finally {
    // 5) Cleanup: hapus gambar sementara (apalagi bila banyak file)
    await Promise.all(
      (imageFiles.length ? imageFiles : [ `${path.join(tempDir, uuidBase)}-1.png` ])
        .map(img => fs.remove(img).catch(() => {}))
    );
  }
}

module.exports = extractTextFromPDF;
