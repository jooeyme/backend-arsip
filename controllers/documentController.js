const { Document, SuratMasuk, SuratKeluar, sequelize } = require('../models');
const {uploadToGoogleDrive, deleteFromGoogleDrive} = require('../middleware/documentStorage')
const fs = require('fs')
const esClient = require('../config/esClient');
const extractTextFromPDF = require('../middleware/ekstractText')

function extractFileId(url) {
    return url.split("/d/")[1]?.split("/")[0] || null;
}
module.exports = {
    getDashboardStats: async(req, res) => {
        try {
            const [
                totalMasuk, 
                totalKeluar, 
                totalDokumen, 
                totalDisposisi, 
                totalDitolak
            ] = await Promise.all([
                SuratMasuk.count(),
                SuratKeluar.count(),
                Document.count(),
                SuratMasuk.count({ where: { status: "dispoisi" } }),
                SuratMasuk.count({ where: { status: "ditolak" } }),
            ]);

            res.status(200).json({
                masuk: totalMasuk,
                keluar: totalKeluar,
                dokumen: totalDokumen,
                disposisi: totalDisposisi,
                ditolak: totalDitolak,
            });
        } catch (error) {
            console.error("Gagal mengambil statistik dashboard", error);
            res.status(500).json({ message: "Gagal mengambil statistik dashboard"});
        }
    },
    
     //KURANG VALIDASI DUPLIKAT DATA
     createDocument: async(req, res) => {
        const t = await sequelize.transaction();

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const fileContent = await extractTextFromPDF(file.path);

        const fileUrl = await uploadToGoogleDrive(file.path, file.originalname);
        
        const fileId = extractFileId(fileUrl);

        try {
            const { no_agenda_masuk, no_agenda_keluar } = req.body;

            // Pastikan surat masuk atau surat keluar ada sebelum menyimpan dokumen
            let no_agenda;
            let index;
            if (no_agenda_masuk) {
                no_agenda= no_agenda_masuk;
                index = "surat_masuk";
                const suratMasuk = await SuratMasuk.findOne({ where: { no_agenda_masuk: no_agenda_masuk } });
                if (!suratMasuk) {
                    return res.status(404).json({ message: "Surat Masuk not found" });
                }
            } else if (no_agenda_keluar) {
                no_agenda = no_agenda_keluar;
                index = "surat_keluar";
                const suratKeluar = await SuratKeluar.findOne({ where: { no_agenda_keluar: no_agenda_keluar } });
                if (!suratKeluar) {
                    return res.status(404).json({ message: "Surat Keluar not found" });
                }
            } else {
                return res.status(404).json({ message: "Agenda not Found"})
            }
            

            // Simpan data dokumen ke database
            const document = await Document.create({
                no_agenda_masuk: no_agenda_masuk || null,
                no_agenda_keluar: no_agenda_keluar || null,
                name_doc: file.originalname,
                type_doc: file.mimetype,
                path_doc: fileUrl
            }, {
                transaction: t,
                individualHooks: true,
                context: {
                  userId: req.userData.id
                }
            });

            await esClient.index({
                index: index,
                id: `${no_agenda}-${document.id}`,
                body: {
                    no_agenda: no_agenda,
                    name_doc: document.name_doc,
                    type_doc: document.type_doc,
                    path_doc: document.path_doc,
                    content: fileContent,
                    createdAt: document.createdAt,
                },
            });

            await t.commit(); // Commit transaksi jika semuanya berhasil
            

            res.status(201).json({
                message: "Document created successfully",
                data: document,
                extract: fileContent
            });

        } catch (error) {
            console.error(error.message);
            await t.rollback(); // Rollback transaksi jika terjadi error
            if (fileId) {
                await deleteFromGoogleDrive(fileId);
            }
            res.status(500).json({ message: "Error creating document", error: error.message });
        } finally {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
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
        const t = await sequelize.transaction();

        const id = req.params.id;
        const file = req.file;

        if (!file || !file.path) return res.status(404).send("No file uploaded");

        const fileContent = await extractTextFromPDF(file.path);
        const fileUrl = await uploadToGoogleDrive(file.path, file.originalname);
        const fileId = extractFileId(fileUrl);

        try {
            const docx = await Document.findOne({
                where: {
                    id: id
                }
            });

            if (!docx || !docx.path_doc) {
                return res.status(404).json({
                    message: "Document not found"
                });
            }
            
            const fileIdOld = await extractFileId(docx.path_doc);

            let no_agenda;
            let id_surat;
            let index;
            if (docx.no_agenda_masuk) {
                no_agenda= docx.no_agenda_masuk;
                index = "surat_masuk";
                const suratMasuk = await SuratMasuk.findOne({ where: { no_agenda_masuk: docx.no_agenda_masuk } });
                id_surat = suratMasuk.id;
                if (!suratMasuk) {
                    return res.status(404).json({ message: "Surat Masuk not found" });
                }
            } else if (docx.no_agenda_keluar) {
                no_agenda = docx.no_agenda_keluar;
                index = "surat_keluar";
                const suratKeluar = await SuratKeluar.findOne({ where: { no_agenda_keluar: docx.no_agenda_keluar } });
                id_surat = suratKeluar.id;
                if (!suratKeluar) {
                    return res.status(404).json({ message: "Surat Keluar not found" });
                }
            } else {
                return res.status(404).json({ message: "Agenda not Found"})
            }        

            
            await esClient.delete({
                index: index,
                id: `${no_agenda}-${docx.id}`,
            });   
            

            const updatedDocs = await Document.update({
                name_doc: file.originalname,
                type_doc: file.mimetype,
                path_doc: fileUrl,
            }, {
                where: { id: id },
                transaction: t,
                individualHooks: true,
                context: {
                  userId: req.userData.id
                }
            });


            await esClient.index({
                index: index,
                id: `${no_agenda}-${id}`,
                body: {
                    no_agenda: no_agenda,
                    name_doc: file.originalname,
                    type_doc: file.mimetype,
                    path_doc: fileUrl,
                    content: fileContent,
                    createdAt: new Date(), // Bisa diganti ke updatedAt jika mau
                },
            });

            await t.commit();

            console.log("apa isi path:", docx.path_doc)
            if (fileIdOld) {
                await deleteFromGoogleDrive(fileIdOld);
            }

            res.status(201).json({
                message: "Document is edited successfully",
                data: updatedDocs,
            })

        } catch (error) {
            console.error(error.message);
            await t.rollback();
            if (fileId) {
                await deleteFromGoogleDrive(fileId);
            }
            res.status(500).json({
                message: "error editing Document"
            })
        } finally {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
    },

    deleteDocument: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const id = decodeURIComponent(req.params.id);
            const result = await Document.findOne({
                where: {
                    id: id,
                }
            });

            if (!result) {
                return res.status(404).json({ message: "Dokumen tidak ditemukan" });
            }

            let no_agenda;
            let index;
            if (result.no_agenda_masuk) {
                no_agenda= result.no_agenda_masuk;
                index = "surat_masuk";
                const suratMasuk = await SuratMasuk.findOne({ where: { no_agenda_masuk: result.no_agenda_masuk } });
                if (!suratMasuk) {
                    return res.status(404).json({ message: "Surat Masuk not found" });
                }

            } else if (result.no_agenda_keluar) {
                no_agenda = result.no_agenda_keluar;
                index = "surat_keluar"
                const suratKeluar = await SuratKeluar.findOne({ where: { no_agenda_keluar: result.no_agenda_keluar } });
                if (!suratKeluar) {
                    return res.status(404).json({ message: "Surat Keluar not found" });
                }

            } else {
                return res.status(404).json({ message: "Agenda not Found"})
            }
            
            await esClient.delete({
                index: index,
                id: `${no_agenda}-${result.id}`,
            });   
            

            await Document.destroy({
                where: {
                    id: id
                },
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }
            });

            await t.commit();

            res.status(200).json({
                message: `Document with id ${id} deleted successfully`
                })
        } catch (error) {
            console.error(error);
            await t.rollback();
            res.status(500).json({
                message: `error deleting Document with id ${id}`
            });
        }
    },
}