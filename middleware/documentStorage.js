const fs = require("fs");
require("dotenv").config();
const driveService = require('../config/googledrive')

// Fungsi untuk mengunggah file ke Google Drive
const uploadToGoogleDrive = async (filePath, fileName) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // ID folder Google Drive

    const fileMetaData = {
      name: fileName,
      parents: [folderId], // File akan disimpan dalam folder ini
    };

    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(filePath),
    };

    const response = await driveService.files.create({
      resource: fileMetaData,
      media: media,
      fields: "id",
    });

    return `https://drive.google.com/file/d/${response.data.id}/view`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Upload failed");
  }
};

const deleteFromGoogleDrive= async(fileId) => {
  
  try {
      await driveService.files.delete({ fileId });
      console.log(`File ${fileId} deleted from Google Drive`);
  } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error.message);
  }
}

module.exports = uploadToGoogleDrive, deleteFromGoogleDrive;
