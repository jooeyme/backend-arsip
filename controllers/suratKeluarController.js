const { SuratKeluar, Document, sequelize } = require('../models');
const uploadToGoogleDrive = require('../middleware/documentStorage');
const deleteFromGoogleDrive = require('../middleware/documentStorage');
const fs = require('fs');
const esClient = require('../config/esClient');
const extractTextFromPDF = require('../middleware/ekstractText');

function extractFileId(url) {
    return url.split("/d/")[1]?.split("/")[0] || null;
}

module.exports = {
    searchSuratKeluar: async (req, res) => {
        try {
            const { query } = req.query;

            if(!query) {
                return res.status(400).json({
                    message: "query parameter is required"
                });
            }
    
            const result = await esClient.search({
                index: "surat_keluar",
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
    //KURANG VALIDASI DUPLIKAT DATA
    createSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();

        const file = req.file;
        if (!file) return res.status(404).send("No file uploaded");

        const fileContent = await extractTextFromPDF(file.path);

        const fileUrl = await uploadToGoogleDrive(file.path, file.originalname);

        const fileId = extractFileId(fileUrl);

        try {
            const {
                no_agenda_keluar,
                no_surat,
                tgl_surat,
                perihal,
                ditujukan,
                keterangan,
            } = req.body
            const status = 'draft'

            fs.unlinkSync(file.path);

            const result = await SuratKeluar.create({
                no_agenda_keluar: no_agenda_keluar,
                no_surat: no_surat,
                tgl_surat: tgl_surat,
                perihal: perihal,
                ditujukan: ditujukan,
                keterangan: keterangan,
                status: status
            }, { transaction: t });

            const document = await Document.create({
                no_agenda_keluar: no_agenda_keluar,
                name_doc: file.originalname,
                type_doc: file.mimetype,
                path_doc: fileUrl,
            }, { transaction: t });

            await esClient.index({
                index: "surat_keluar",
                id: result.id,
                body: {
                    no_agenda: result.no_agenda_keluar,
                    name_doc: document.name_doc,
                    type_doc: document.type_doc,
                    path_doc: document.path_doc,
                    content: fileContent,
                    createdAt: result.createdAt,
                },
            });

            await t.commit();

            res.status(201).json({
                message: "Surat Keluar is created successfully",
                data: result,
                data2: document
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            if (fileId) {
                await deleteFromGoogleDrive(fileId);
            }
            res.status(500).json({
                message: "error creating SuratKeluar"
            });
        }
    },

    getByIdSuratKeluar: async(req, res) => {
        try {
            const { id } = req.params;
            console.log("req params:", req.params)
            const result = await SuratKeluar.findOne({
                where: {
                    id: id,
                },
                include: [Document]
            });

            if (!result) {
                return res.status(404).json({
                    message: `SuratKeluar with id ${id} not found`,
                });
            }

            res.status(200).json({
                message: `Successfully found SuratKeluar with id ${id}`,
                data: result,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error finding SuratKeluar with id ${id}`
            })
        }
    },

    getAllSuratKeluar: async(req, res) => {
        try {
            const result = await SuratKeluar.findAll();

            if (!result) {
                return res.status(404).json({
                    message: `SuratKeluar not found`,
                });
            }

            res.status(200).json({
                message: "success get all SuratKeluar",
                data: result
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error getting all SuratKeluar"
            })
        }
    },

    editSuratKeluar: async(req, res) => {
        try {
            const { id } = req.params;
            const {
                no_agenda,
                no_surat,
                tgl_surat,
                perihal,
                ditujukan,
                keterangan,
            } = req.body;

            const result = await SuratKeluar.findOne({
                where: {
                    id: id,
                },
            });

            if (!result) {
                return res.status(404).json({
                    message: `Surat with id ${id} not found`,
                });
            };

            console.log("apa isi status:", req.body)

            const updateSurat = await SuratKeluar.update({
                no_agenda: no_agenda,
                no_surat: no_surat,
                tgl_surat: tgl_surat,
                perihal: perihal,
                ditujukan: ditujukan,
                keterangan: keterangan,
            },{
                where: {
                    id: id,
                },
            });

            res.status(200).json({
                message: `success updated surat with id ${id}`,
                data: updateSurat,
            });

        } catch (error) {
            res.status(500).json({
                message: "internal server error"
            });
        }
    },

    updateStatusSuratKeluar: async(req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            console.log("apa isi status:", req.body);

            const allowedStatus = ['draft', 'disetujui', 'dikirim', 'selesai'];

            if (!allowedStatus.includes(status)) {
                return res.status(400).json({
                    message: 'Status tidak valid'
                });
            }

            const surat = await SuratKeluar.findOne({
                where: {
                    id: id
                }
            });
            if (!surat) {
                return res.status(404).json({
                    message: 'Surat masuk tidak ditemukan'
                });
            }

            const newSurat = await SuratKeluar.update({ 
                status: status 
            },{
                where: {
                    id: id
                }
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

    deleteSuratKeluar: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await SuratKeluar.findOne({
                where: {
                    id: id,
                },
                include: [Document]
            });

            const fileId = extractFileId(result.Document.path_doc);

            if (result) {
                await SuratKeluar.destroy({
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
                    message: `SuratKeluar with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting SuratKeluar with id ${id}`
            });
        }
    },

    getSuratKeluarByUser: async(req, res) => {
        try {
            const { name } = req.userData;

            const result = await SuratKeluar.findAll({
                where: {
                    ditujukan: name
                },
                
            })

            res.status(200).json({
                message: `Successfully get all SuratKeluar by user ${name}`, 
                data: result
            })
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error getting SuratKeluar by user ${name}`,
            })
        }
    },
}