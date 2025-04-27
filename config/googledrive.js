const fs = require("fs");
const { google } = require("googleapis");
require("dotenv").config();
const path = require("path");

// Autentikasi Google Drive API
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.env.GOOGLE_CREDENTIAL), // File credentials dari Google Cloud
  scopes: ["https://www.googleapis.com/auth/drive.file"], // Akses untuk unggah file
});

if (!fs.existsSync(process.env.GOOGLE_CREDENTIAL)) {
    console.log(`apa isi dari ${process.env.GOOGLE_CREDENTIAL}`);
    throw new Error("Google Cloud credential file not found!");
};

const driveService = google.drive({ version: "v3", auth });

module.exports = driveService;
