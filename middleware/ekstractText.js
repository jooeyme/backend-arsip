const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs-extra");
const pdfPoppler = require("pdf-poppler");

const extractTextFromPDF = async (filePath) => {
    try {
        const outputImagePath = path.join(__dirname, "output-1.png");

        // Konversi halaman pertama PDF ke gambar
        const opts = { format: "png", out_dir: __dirname, out_prefix: "output", page: 1 };
        await pdfPoppler.convert(filePath, opts);

        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('apa isi dari path gambar:', opts)

        // Jalankan OCR dengan bahasa Indonesia + Inggris
        const { data } = await Tesseract.recognize(outputImagePath, "ind+eng", {
            logger: (m) => console.log(m), // Log proses OCR
        });

        // Hapus gambar sementara
        await fs.remove(outputImagePath);

        return data.text;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        return "";
    }
};

module.exports = extractTextFromPDF;
