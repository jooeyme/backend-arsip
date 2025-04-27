const { Document, SuratMasuk, SuratKeluar, sequelize } = require('../models');
const uploadToGoogleDrive = require('../middleware/documentStorage')
const fs = require('fs')
const extractTextFromPDF = require('../middleware/ekstractText')

module.exports = {
     //KURANG VALIDASI DUPLIKAT DATA
     createDocument: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { no_agenda_masuk, no_agenda_keluar } = req.body;
            const file = req.file;

            console.log("isi id:",typeof req.body)
            console.log("isi id:", req.file)

            if (!file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            console.log('apa isi file path:', file.path)

            const fileContent = await extractTextFromPDF(file.path);

            // Validasi bahwa salah satu dari surat_masuk_id atau surat_keluar_id harus ada
            // if (!surat_masuk_id && !surat_keluar_id) {
            //     return res.status(400).json({ message: "Either surat_masuk_id or surat_keluar_id is required" });
            // }

            // // Pastikan surat masuk atau surat keluar ada sebelum menyimpan dokumen
            // if (surat_masuk_id) {
            //     const suratMasuk = await SuratMasuk.findOne({ where: { no_agenda: surat_masuk_id } });
            //     if (!suratMasuk) {
            //         return res.status(404).json({ message: "Surat Masuk not found" });
            //     }
            // }

            // if (surat_keluar_id) {
            //     const suratKeluar = await SuratKeluar.findOne({ where: { no_agenda: surat_keluar_id } });
            //     if (!suratKeluar) {
            //         return res.status(404).json({ message: "Surat Keluar not found" });
            //     }
            // }


            // Upload file ke Google Drive dan dapatkan URL
            const fileUrl = "aiudhia"
            // const fileUrl = await uploadToGoogleDrive(file.path, file.originalname);
            // fs.unlinkSync(file.path); // Hapus file lokal setelah diupload

            console.log("apakah sampe sini?", fileUrl)

            // Simpan data dokumen ke database
            const document = await Document.create({
                no_agenda_masuk: no_agenda_masuk || null,
                no_agenda_keluar: no_agenda_keluar || null,
                name_doc: file.originalname,
                type_doc: file.mimetype,
                path_doc: fileUrl
            }, { transaction: t });

            await t.commit(); // Commit transaksi jika semuanya berhasil

            res.status(201).json({
                message: "Document created successfully",
                data: document,
                extract: fileContent
            });

        } catch (error) {
            await t.rollback(); // Rollback transaksi jika terjadi error
            console.error(error.message);
            res.status(500).json({ message: "Error creating document", error: error.message });
        }
    },

    getByIdDocument: async(req, res) => {
        try {
            const { id } = req.params;
            const result = await Document.findOne({
                where: {
                    id: id,
                },
            });

            if (!result) {
                return res.status(404).json({
                    message: `Document with id ${id} not found`,
                });
            }
            res.status(200).json({
                message: `Successfully found Document with id ${id}`,
                data: result,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error finding Document with id ${id}`
            })
        }
    },

    getAllDocument: async(req, res) => {
        try {
            const result = await Document.findAll();

            if (!result) {
                return res.status(404).json({
                    message: `Document not found`,
                });
            }
            res.status(200).json({
                message: "success get all Document",
                data: result
            })
        } catch (error) {
            console.error(error.message)
            res.status(500).json({
                message: "error getting all Document"
            })
        }
    },

    //KURANG
    editDocument: async(req, res) => {
        try {
            const {id} = req.params;

        } catch (error) {
            
        }
    },

    deleteDocument: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await Document.findOne({
                where: {
                    id: id,
                }
            });

            if (result) {
                await Document.destroy({
                    where: {
                        id: id
                    }
                });
                res.status(200).json({
                    message: `Document with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `Document with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting Document with id ${id}`
            });
        }
    },
}