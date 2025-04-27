const { SuratMasuk, Document, Disposisi, sequelize } = require('../models');
const uploadToGoogleDrive = require('../middleware/documentStorage');
const deleteFromGoogleDrive = require('../middleware/documentStorage');
const fs = require('fs');
const esClient = require('../config/esClient');
const extractTextFromPDF = require('../middleware/ekstractText');
const { where } = require('sequelize');

function extractFileId(url) {
    return url.split("/d/")[1]?.split("/")[0] || null;
}

module.exports = {
    searchSuratMasuk: async (req, res) => {
        try {
            const { query } = req.query;

            if(!query) {
                return res.status(400).json({
                    message: "query parameter is required"
                });
            }
    
            const result = await esClient.search({
                index: "surat_masuk",
                body: {
                    query: {
                        bool:{
                            should: [
                                {
                                query_string: {
                                    query: query,
                                    fields: ["no_agenda", "name_doc", "type_doc", "content"],
                                    default_operator: "AND",
                                    fuzziness: "AUTO"
                                },
                            },
                            {
                                multi_match: {
                                    query: query,
                                    fields: ["no_agenda", "name_doc", "type_doc", "content"],
                                    type: "best_fields", // Autocomplete
                                    fuzziness: "AUTO",
                                },
                            },
                            {
                                wildcard: {
                                    "content.keyword": `*${query.toLowerCase()}*`, // Wildcard untuk konten
                                },
                            },
                        ],
                            minimum_should_match: 1, 
                        },
                        
                    },
                },
            });
    
            res.status(200).json({ results: result.hits.hits });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error searching surat" });
        }
    },
    
    createSuratMasuk: async(req, res) => {
        const t = await sequelize.transaction();
        
        const file = req.file;
        if (!file) return res.status(404).send("No file uploaded");

        const fileContent = await extractTextFromPDF(file.path);
        
        const fileUrl = await uploadToGoogleDrive(file.path, file.originalname);

        const fileId = extractFileId(fileUrl)
        try {
            const {
                no_agenda_masuk,
                tgl_terima,
                no_surat,
                tgl_surat,
                perihal,
                asal_surat,
                keterangan,
                type_surat
            } = req.body
            const status = 'diterima'

            fs.unlinkSync(file.path);

            const result = await SuratMasuk.create({
                no_agenda_masuk: no_agenda_masuk,
                tgl_terima: tgl_terima,
                no_surat: no_surat,
                tgl_surat: tgl_surat,
                perihal: perihal,
                asal_surat: asal_surat,
                keterangan: keterangan,
                status: status
            }, { transaction: t })

            const document = await Document.create({
                no_agenda_masuk: result.no_agenda_masuk,
                name_doc: file.originalname,
                type_doc: file.mimetype,
                path_doc: fileUrl,
            }, { transaction: t })

            const disposisi = await Disposisi.create({
                no_agenda: result.no_agenda_masuk,
                type_surat: type_surat,
            }, { transaction: t })

            await esClient.index({
                index: "surat_masuk",
                id: result.id,
                body: {
                    no_agenda: result.no_agenda_masuk,
                    name_doc: document.name_doc,
                    type_doc: document.type_doc,
                    path_doc: document.path_doc,
                    content: fileContent,
                    createdAt: result.createdAt,
                },
            });

            await t.commit()

            res.status(201).json({
                message: "Surat Masuk is created successfully",
                data: result,
                data2: disposisi,
                data3: document
            })
        } catch (error) {
            console.error(error.message);
            await t.rollback();
            if (fileId) {
                await deleteFromGoogleDrive(fileId);
            }
            res.status(500).json({
                message: "error creating SuratMasuk"
            })
        }
    },

    getByIdSuratMasuk: async(req, res) => {
        try {
            const { id } = req.params;
            console.log("req params:", req.params)
            const result = await SuratMasuk.findOne({
                where: {
                    id: id,
                },
                include: [
                    {
                      model: Document,
                    },
                  ],
            });

            if (!result) {
                return res.status(404).json({
                    message: `SuratMasuk with id ${id} not found`,
                });
            }

            res.status(200).json({
                message: `Successfully found SuratMasuk with id ${id}`,
                data: result,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error finding SuratMasuk with id ${error}`
            })
        }
    },

    getAllSuratMasuk: async(req, res) => {
        try {
            const result = await SuratMasuk.findAll();

            if (!result) {
                return res.status(404).json({
                    message: `SuratMasuk not found`,
                });
            }

            res.status(200).json({
                message: "success get all SuratMasuk",
                data: result
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error getting all SuratMasuk"
            })
        }
    },

    //KURANG
    editSuratMasuk: async(req, res) => {
        try {
            const {id} = req.params;
            const {
                no_agenda,
                tgl_terima,
                no_surat,
                tgl_surat,
                perihal,
                asal_surat,
                keterangan,
            } = req.body

            const surat = await SuratMasuk.findOne({
                where: {
                    id: id
                }
            });
            if (!surat) {
                return res.status(404).json({
                    message: "surat masuk tidak ditemukan"
                });
            }

            const newSurat = await SuratMasuk.update({
                no_agenda: no_agenda,
                tgl_terima: tgl_terima,
                no_surat: no_surat,
                tgl_surat: tgl_surat,
                perihal: perihal,
                asal_surat: asal_surat,
                keterangan: keterangan,
            }, {
                where: {
                    id: id
                }
            });

            return res.status(200).json({
                message: 'Surat masuk berhasil diperbarui',
                data: newSurat
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: 'Gagal memperbarui data surat', error
            });
        }
    },

    updateStatusSuratMasuk: async(req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            console.log("apa isi status:", req.body);

            const allowedStatus = ['diterima', 'didisposisikan', 'diproses', 'selesai'];

            if (!allowedStatus.includes(status)) {
                return res.status(400).json({
                    message: 'Status tidak valid'
                });
            }

            const surat = await SuratMasuk.findOne({
                where: {
                    id: id
                }
            });
            if (!surat) {
                return res.status(404).json({
                    message: 'Surat masuk tidak ditemukan'
                });
            }

            const newSurat = await SuratMasuk.update({ 
                status: status 
            },{
                where: {
                    id: id
                },
                individualHooks: true,
                userId: req.userData.id,
            });

            return res.status(200).json({
                message: `Status surat masuk diperbarui menjadi ${status}`,
                data: newSurat
            });
        } catch (error) {
            console.error(error)
            return res.status(500).json({
                message: 'Gagal mengubah status surat',
                error 
            });
        }
    },

    deleteSuratMasuk: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await SuratMasuk.findOne({
                where: {
                    id: id,
                },
                include: [Document]
            });

            const fileId = extractFileId(result.Document.path_doc)

            if (result) {
                await SuratMasuk.destroy({
                    where: {
                        id: id
                    }
                });
            
                if (fileId) {
                    await deleteFromGoogleDrive(fileId);
                }

                res.status(200).json({
                    message: `Room with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `SuratMasuk with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting SuratMasuk with id ${id}`
            });
        }
    },
}