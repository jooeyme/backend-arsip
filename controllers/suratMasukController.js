const { SuratMasuk, Document, Disposisi, sequelize, SuratKeluar, User, Recipient } = require('../models');
const {uploadToGoogleDrive, deleteFromGoogleDrive} = require('../middleware/documentStorage');
const fs = require('fs');
const { Op } = require('sequelize');
const esClient = require('../config/esClient');
const extractTextFromPDF = require('../middleware/ekstractText');
const { Parser } = require('json2csv');
const { buildWorksheet } = require('../helpers/buildWorkSheet')
const ExcelJS = require('exceljs');

function extractFileId(url) {
    return url.split("/d/")[1]?.split("/")[0] || null;
};

const STATUS_TRANSITIONS = {
  diterima: ['didisposisikan', 'waiting_to_archive'],
  didisposisikan: ['diproses'],
  diproses: ['selesai'],
  selesai: ['waiting_to_archive'],
  waiting_to_archive: ['diarsipkan'],
  diarsipkan: []
};

function fmt(date) {
  return date ? date.toISOString().slice(0,10) : '';
}


module.exports = {
    getRecentLetters: async (req, res) => {
        try {
            const [suratMasuk, suratKeluar] = await Promise.all([
                SuratMasuk.findAll({
                    limit: 5,
                    order: [["createdAt", "DESC"]],
                    attributes: [
                        "id", "no_agenda_masuk", "no_surat", "tgl_terima", "keterangan", "status"
                    ]
                }),
                SuratKeluar.findAll({
                    limit: 5,
                    order: [["createdAt", "DESC"]],
                    attributes: [
                        "id", "no_agenda_keluar", "no_surat", "tgl_surat", "keterangan", "status"
                    ]
                })
            ]);

            const result = [
                ...suratMasuk.map(item => ({
                    id: item.id,
                    no_agenda: item.no_agenda_masuk,
                    nomor: item.no_surat,
                    jenis: "masuk",
                    tanggal: item.tgl_terima,
                    keterangan: item.keterangan,
                    status: item.status
                })),
                ...suratKeluar.map(item => ({
                    id: item.id,
                    no_agenda: item.no_agenda_keluar,
                    nomor: item.no_surat,
                    jenis: "keluar",
                    tanggal: item.tgl_surat,
                    keterangan: item.keterangan,
                    status: item.status
                }))
            ];

            result.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

            res.status(200).json({
                message: "successfully get recentLetters!",
                data: result
            })
        } catch (error) {
            console.error("Gagal mengambil surat terbaru:", error);
            res.status(500).json({
                message: "Gagal mengambil surat terbaru"
            })
        }
    },

    getTrackSuratMasuk: async (req, res) => {
        try {
            const id = req.params.id;
            // 1) Ambil data surat
            const surat = await SuratMasuk.findByPk(id, {
                attributes: ['id','no_agenda_masuk','status','createdAt','updatedAt']
            });
            if (!surat) {
                return res.status(404).json({ message: 'SuratMasuk tidak ditemukan' });
            }

            // 2) Ambil semua disposisi terkait, urutkan by urutan
            const disposisiList = await Disposisi.findAll({
                where: { no_agenda: surat.no_agenda_masuk },
                order: [['urutan','ASC']],
                attributes: [
                'id','urutan','status','tindakan','diteruskan', 'dibuat',
                'ket_disposisi','createdAt','waktu_selesai','catatan_tindak_lanjut'
                ]
            });
        
            const track = [];

            track.push({ 
                event: 'Surat Diterima',
                timestamp: surat.createdAt,
                aktor: "Administrasi",
                details: `No Agenda: ${surat.no_agenda_masuk}`,
            });
            

            disposisiList.forEach(d => {
                track.push({
                event:   `Disposisi ${d.urutan} Dibuat`,
                aktor: d.dibuat,
                timestamp: d.createdAt,
                details: `Tindakan: ${d.tindakan}`
                });

                if (d.waktu_dibaca) {
                track.push({
                    event:     `Disposisi ${d.urutan} Dibaca`,
                    aktor: d.diteruskan,
                    timestamp: d.waktu_dibaca,
                    details:   `Diteruskan ke: ${d.diteruskan}`
                });
                }

                if (d.waktu_diproses) {
                track.push({
                    event:     `Disposisi ${d.urutan} Diproses`,
                    aktor: d.diteruskan,
                    timestamp: d.waktu_diproses,
                    details:   `Dalam proses oleh: ${d.diteruskan}`
                });
                }

                if (d.waktu_selesai) {
                track.push({
                    event:     `Disposisi ${d.urutan} Selesai`,
                    aktor: d.diteruskan,
                    timestamp: d.waktu_selesai,
                    details:   `Catatan: ${d.catatan_tindak_lanjut}`
                });
                }
            });
        // Event status suratMasuk berubah menjadi 'diarsipkan'
            if (surat.status === 'diarsipkan') {
                track.push({
                event: 'Surat Diarsipkan',
                aktor: "Kepala Departemen", 
                timestamp: surat.updatedAt,
                details: `Surat masuk berstatus diarsipkan`
                });
            }
     // Sort ascending by timestamp (just in case)
            track.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return res.status(200).json({ message: 'Track fetched', data: track });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Gagal mengambil track perjalanan surat' });
        }
    },

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
                    size: 20,
                    from: 0,
                    query: {
                        bool:{
                            should: [
                                {
                                    multi_match: {
                                        query: query,
                                        fields: ["no_agenda", "name_doc", "type_doc", "content"],
                                        type: "best_fields", // Autocomplete
                                        operator: "AND",
                                        fuzziness: "AUTO",
                                        prefix_length: 2,
                                    },
                                },
                                {
                                    match_phrase_prefix: { // untuk autocomplete prefix
                                    content: {
                                        query,
                                        slop: 2,           // agak longgar
                                        max_expansions: 50
                                    }
                                    }
                                }                         
                            ],
                                minimum_should_match: 1, 
                        }, 
                    },
                    highlight: {                 // tambahkan highlight untuk UI
                        pre_tags: ["<mark>"],
                        post_tags: ["</mark>"],
                        fields: {
                            content: { fragment_size: 150, number_of_fragments: 1 },
                            name_doc: {}
                        }
                    }
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
        
        const files = req.files;
        const uploadedFileIds = [];
        const dokumenUtama = files?.dokumen_utama?.[0];
        const allLampiran = files?.lampiran || [];
        try {

            const lampiranNames = (files.lampiran || []).map(f => f.originalname);

            const {
                no_agenda_masuk,
                tgl_terima,
                no_surat,
                tgl_surat,
                perihal,
                asal_surat,
                keterangan,
                jenis,
                sifat,
                tembusan,
                
            } = req.body;
            let { penerimaIds } = req.body;
            const status = 'diterima'; 
            const penerima = 'user'
            
            console.log(req.body)

            const surat = await SuratMasuk.create({
                no_agenda_masuk: no_agenda_masuk,
                tgl_terima: tgl_terima,
                no_surat: no_surat,
                tgl_surat: tgl_surat,
                perihal: perihal,
                asal_surat: asal_surat,
                keterangan: keterangan,
                status: status,
                jenis: jenis,
                sifat: sifat,
                lampiran: lampiranNames,
                penerima: penerima,
                tembusan: tembusan
            }, { 
                transaction: t,
                individualHooks: true,
                context: {
                  userId: req.userData.id
                }
            });

            if (!Array.isArray(penerimaIds)) {
                penerimaIds = [penerimaIds];
            }

            if (penerimaIds.length > 0) {
                await surat.setPenerimaUsers(penerimaIds, { transaction: t });
            }

            if (dokumenUtama) {
                const content = await extractTextFromPDF(dokumenUtama.path);
                const fileUrl = await uploadToGoogleDrive(dokumenUtama.path, dokumenUtama.originalname);
                const fileId = extractFileId(fileUrl);
                uploadedFileIds.push(fileId);
                try {
                    const doc = await Document.create({
                        documentType: "SuratMasuk",
                        documentId: surat.id,
                        name_doc: dokumenUtama.originalname,
                        type_doc: 'berkas surat',
                        path_doc: fileUrl
                      }, {
                        transaction: t,
                        individualHooks: true,
                        context: { userId: req.userData.id }
                      });
                
                      await esClient.index({
                        index: "surat_masuk",
                        id: `${surat.no_agenda_masuk}-${doc.id}`,
                        body: {
                            id:         surat.id,
                            no_agenda_masuk: surat.no_agenda_masuk,
                            tgl_terima: surat.tgl_terima,
                            no_surat:   surat.no_surat,
                            tgl_surat:  surat.tgl_surat,
                            perihal:    surat.perihal,
                            asal_surat:  surat.asal_surat,
                            keterangan: surat.keterangan,
                            status:     surat.status,
                            sifat:      surat.sifat,
                            lampiran:   surat.lampiran || [],
                            jenis:      surat.jenis,
                            penerima: surat.penerima,
                            tembusan:   surat.tembusan,
                            no_folder:  surat.no_folder,
                            createdAt:  surat.createdAt,
                            content: content,
                        },
                      });
                } catch (error) {
                    console.error(`Gagal proses dokumen ${dokumenUtama.originalname}:`, error);
                    throw error;
                }
              };

              for (const lampiran of allLampiran) {
                try {
                    console.log("apa sampe sini?", lampiran.path)
                    const lampiranUrl = await uploadToGoogleDrive(lampiran.path, lampiran.originalname);
                    const lampId = extractFileId(lampiranUrl);
                    uploadedFileIds.push(lampId);
                
                    await Document.create({
                        documentType: "SuratMasuk",
                        documentId: surat.id,
                        name_doc: lampiran.originalname,
                        type_doc: 'lampiran',
                        path_doc: lampiranUrl
                    }, { 
                        transaction: t, 
                        individualHooks: true, 
                        context: { userId: req.userData.id } 
                    });
                  } catch (err) {
                    console.error(`Gagal proses lampiran ${lampiran.originalname}:`, err.message);
                    throw err;  // lempar lagi supaya transaksi utama rollback
                  }
              };

            await t.commit();

            res.status(201).json({
                message: "Surat Masuk is created successfully",
                data: surat,
            });
        } catch (error) {
            console.error(error.message);
            await t.rollback();
            await Promise.all(uploadedFileIds.map(id => deleteFromGoogleDrive(id)));
            res.status(500).json({
                message: "error creating SuratMasuk"
            });
        } finally {
            [dokumenUtama, ...allLampiran].forEach(f => {
                if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
    },

    getByIdSuratMasuk: async(req, res) => {
        try {
            const id = req.params.id;
            console.log("req params:", req.params)
            const result = await SuratMasuk.findOne({
                where: {
                    id : id,
                },
                include: [
                    {
                        model: Document, as: 'documents'
                    },
                    {
                        model: Disposisi, as: 'disposisi',
                    }, 
                    {
                        model: User,
                        as: 'penerimaUsers',    
                        
                        
                    }
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

    getSuratMasukforUser: async(req, res) => {
        try {
            const userId = req.userData.id;
            const user = await User.findByPk(userId, {
                attributes: ['id', 'nama_lengkap', 'email'],
                include: [
                    {
                        model: SuratMasuk,
                        as: 'suratMasukDiTerima',
                        attributes: [
                            'id','no_agenda_masuk','tgl_terima',
                            'no_surat','perihal','status'
                        ],
                        through: { attributes: []},
                        include: [
                            { 
                                model: Document,
                                as: 'documents'
                            }
                        ]
                    }
                ]
            });
            if (!user) {
                return res.status(404).json({
                    message: `User ${userId} not found`
                });
            }

            return res.json({
                message: `Surat Masuk untuk User ${userId}`,
                data: user.suratMasukDiTerima
            })
        } catch (error) {
            
        }
    },

    getAllSuratMasuk: async(req, res) => {
        try {
            const user = req.userData;
            const { page = 1, limit = 20, status, jenis } = req.query;
            const offset = (page - 1) * limit;
            let where = { status: {[Op.ne] : 'diarsipkan'}};
            const include = [];

            const isAdmin = user.role === 'administrasi';
            const isKTU = user.role === 'ktu';

            if (status) where.status = status;
            if (jenis)  where.jenis  = jenis;

            if (isAdmin) {
                include.push({
                    model: User,
                    as: 'penerimaUsers',
                    attributes: ['id', 'nama_lengkap'],
                    through: { attributes: [] },
                    required: false
                });
                }

                // KTU → boleh lihat semua, kecuali rahasia
                else if (isKTU) {
                where = {
                    ...where,
                    sifat: { [Op.ne]: 'rahasia' }
                };

                include.push({
                    model: User,
                    as: 'penerimaUsers',
                    attributes: ['id', 'nama_lengkap'],
                    through: { attributes: [] },
                    required: false
                });
                }

                // USER BIASA → bisa lihat semua non-rahasia + surat rahasia kalau dia penerima
                else {
                where = {
                    ...where,
                    [Op.and]: [
                    status ? { status } : {},
                    jenis  ? { jenis }  : {},
                    {
                        [Op.or]: [
                        { sifat: { [Op.ne]: 'rahasia' } },
                        {
                            [Op.and]: [
                            { sifat: 'rahasia' },
                            ]
                        }
                        ]
                    }
                    ]
                };

                include.push({
                    model: User,
                    as: 'penerimaUsers',
                    attributes: ['id', 'nama_lengkap'],
                    through: { attributes: [] },
                    where: { id: user.id },
                    required: true
                });
                }

            const { count, rows } = await SuratMasuk.findAndCountAll({
                distinct: true,
                col: 'id',
                include,
                where, 
                offset, 
                limit: +limit,
                order: [['createdAt', 'DESC']],
            });

            res.status(200).json({
                message: "success get all SuratMasuk",
                total: count,
                page: +page,
                data: rows
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error getting all SuratMasuk"
            })
        }
    },

    getAdminArchive: async (req, res, next) => {
        try {
            const suratList = await SuratMasuk.findAll({
            where: { status: 'waiting_to_archive' },
            order: [['tgl_terima', 'DESC']],
            });
            res.status(200).json({ data: suratList });
        } catch (error) {
            next(error);
        }
    },

    getKadepList: async (req, res, next) => {
        try {
            const suratList = await SuratMasuk.findAll({
                where: { status: { [Op.in]: ['diterima', 'selesai'] } },
                order: [['tgl_surat', 'DESC']],
            });
            res.status(200).json({ data: suratList });
        } catch (error) {
            next(error);
        }
    },

    getDisposisiList: async (req, res, next) => {
        try {
            const userId = req.userData.id.toString();
            const suratList = await SuratMasuk.findAll({
                include: [{
                model: Disposisi,
                as: 'disposisi',
                where: { diteruskan: userId, status: 'didisposisikan' },
                required: true,
                }],
                order: [[ { model: Disposisi, as: 'disposisi' }, 'urutan', 'ASC' ]],
            });
            res.status(200).json({ data: suratList });
        } catch (error) {
            next(error);
        }
    },

    getDashboardSuratMasuk: async (req, res, next) => {
        try {
            const { role, id: userId } = req.userData;

            // mapping role → status array
            const statusMap = {
                administrasi:      ['waiting_to_archive'],
                kadep:             ['diterima', 'selesai'],
                sekretaris:        ['diterima', 'selesai'],
            };

            // build opsi query
            const options = {
                where: {},
                include: [],
                order: []
            };

            if (role === 'administrasi' || role === 'kadep' || role === 'sekretaris') {
                options.where.status = { [Op.in]: statusMap[role] };
                // ordering: admin by tgl_terima, kadep/sekr by tgl_surat
                options.order = role === 'administrasi'
                ? [['tgl_terima', 'DESC']]
                : [['tgl_surat',   'DESC']];
            } else {
                // asumsi semua role lain adalah user disposisi
                options.include.push({
                model: Disposisi,
                as: 'disposisi',
                where: {
                    diteruskan: userId.toString(),
                    status:     'didisposisikan'
                },
                required: true
                });
                options.order = [
                [ { model: Disposisi, as: 'disposisi' }, 'urutan', 'ASC' ]
                ];
            }

            const suratList = await SuratMasuk.findAll(options);
            res.status(200).json({ data: suratList });
        } catch (error) {
            next(error);
        }
    },
    
    editSuratMasuk: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const {id} = req.params;
            const { data } = req.body

            const surat = await SuratMasuk.findByPk(id);
            if (!surat) {
                return res.status(404).json({
                    message: "surat masuk tidak ditemukan"
                });
            }

            const immutableAfter = ['no_agenda_masuk', 'no_surat', 'tgl_surat', 'tgl_terima'];
            if (surat.status !== 'diterima') {
                for (const f of immutableAfter) {
                    if (data[f] && data[f] !== surat[f]) {
                        return res.status(400).json({
                            message: `${f} cannot be changed after initial state`
                        })
                    }
                }
            }
            const newSurat = await SuratMasuk.update(
                data,
            {
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

            return res.status(200).json({
                message: 'Surat masuk berhasil diperbarui',
                data: newSurat
            });

        } catch (error) {
            console.error(error);
            await t.rollback();
            return res.status(500).json({
                message: 'Gagal memperbarui data surat', error
            });
        }
    },

    updateStatusSuratMasuk: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { status: newStatus } = req.body;
            const user = req.userData;

            const surat = await SuratMasuk.findByPk(id)

            if (!surat) {
                return res.status(404).json({
                    message: 'Surat masuk tidak ditemukan'
                });
            };

            const allowed = STATUS_TRANSITIONS[surat.status] || [];
            if (!allowed.includes(newStatus)) {
                return res.status(400).json({
                    message: `Cannot ttransition from ${surat.status} to ${newStatus}`
                });
            }

            // Jika ingin proteksi siapa yang boleh mengarsipkan
            if (newStatus === 'waiting_to_archive' && user.role !== 'kadep') {
            return res.status(403).json({
                message: 'Hanya kepala departemen yang dapat menyelesaikan surat'
            });
            }

            const newSurat = await surat.update({ 
                status: newStatus 
            },{
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }
            });

            await t.commit();

            return res.status(200).json({
                message: `Status surat masuk diperbarui menjadi ${newStatus}`,
                data: newSurat
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            return res.status(500).json({
                message: 'Gagal mengubah status surat',
                error 
            });
        }
    },

    archiveSuratMasuk: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { no_folder } = req.body;
            const surat = await SuratMasuk.findByPk(id);
            if (!surat) {
                return res.status(404).json({
                     message: 'Surat masuk tidak ditemukan',
                });
            }
            if (surat.status !== 'waiting_to_archive') {
                return res.status(400).json({
                    message: 'Only finished can be archived'
                });
            }

            if (!no_folder) {
                return res.status(400).json({
                    message: `must set no folder, ${no_folder} `
                });
            }

            const updated = await surat.update({
                status: 'diarsipkan', 
                no_folder: no_folder
            },
            {
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }   
            });
            await t.commit();
            return res.status(200).json({
                message: `Surat masuk telah selesai di proses`,
                data: updated
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            return res.status(500).json({
                message: "Error Archiving SUrat Masuk"
            })
        }
    },

    deleteSuratMasuk: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const {id} = req.params;
            const result = await SuratMasuk.findOne({
                where: {
                    id: id,
                }
            });

            if (!result) {
                return res.status(404).json({ message: `SuratMasuk with id ${id} not found` });
              }

              const noAgenda = result.no_agenda_masuk;

              const documents = await Document.findAll({
                where: { documentId: noAgenda }
              });
             
              // Hapus dari Google Drive & Elasticsearch
            for (const doc of documents) {
                const fileId = extractFileId(doc.path_doc);
        
                if (fileId) {
                await deleteFromGoogleDrive(fileId);
                }
        
                try {
                await esClient.delete({
                    index: "surat_masuk",
                    id: `${noAgenda}-${doc.id}`,
                });
                } catch (err) {
                console.warn(`Elasticsearch deletion warning: ${err.message}`);
                }
            }
  
            // Hapus dokumen dari database
            await Document.destroy({
                where: { documentId: noAgenda },
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }
            });

            await SuratMasuk.destroy({
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
            message: `SuratMasuk with id ${id} deleted successfully`,
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            res.status(500).json({
                message: `error deleting SuratMasuk with id ${id}`
            });
        }
    },

    getArchivedSuratMasuk: async (req, res) => {
        try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await SuratMasuk.findAndCountAll({
            where: { status: 'diarsipkan' },
            distinct: true,
            offset: +offset,
            limit: +limit,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({
            message: 'Success fetching archived Surat Masuk',
            total: count,
            page: +page,
            data: rows
        });
        } catch (err) {
        console.error('getArchivedSuratMasuk error', err);
        return res.status(500).json({
            message: 'Error fetching archived Surat Masuk'
        });
        }
    },

    downloadArchivedSuratMasuk: async (req, res) => {
        try {
        const rows = await SuratMasuk.findAll({
            where: { status: 'diarsipkan' },
            attributes: [
            'no_agenda_masuk', 'no_surat', 'tgl_surat',
            'asal_surat', 'perihal', 'keterangan',
            'jenis', 'sifat', 'no_folder', 'createdAt'
            ],
            include: [
            {
                model: User,
                as: 'penerimaUsers',
                attributes: ['nama_lengkap'],
                through: { attributes: [] }
            },
            {
                model: Document,
                as: 'documents',
                attributes: ['type_doc', 'path_doc']  // sesuaikan field di model Document
            }
            ]
        });

        const wb = new ExcelJS.Workbook();
        await buildWorksheet(wb, 'Arsip Surat Masuk', rows, [
            { key:'no_agenda_masuk', header:'No. Agenda',           getter: r => r.no_agenda_masuk },
            { key:'no_surat',        header:'No. Surat',            getter: r => r.no_surat },
            { key:'tgl_surat',       header:'Tanggal Surat',        getter: r => fmt(r.tgl_surat) },
            { key:'jenis',           header:'Jenis',                getter: r => r.jenis },
            { key:'sifat',           header:'Sifat',                getter: r => r.sifat },
            { key:'perihal',         header:'Perihal',              getter: r => r.perihal },
            { key:'asal_surat',      header:'Asal Surat',           getter: r => r.asal_surat },
            { key:'penerima',        header:'Penerima',             getter: r => r.penerimaUsers.map(u=>u.nama_lengkap).join('; ') },
            { key:'keterangan',      header:'Keterangan',           getter: r => r.keterangan },
            { key:'no_folder',       header:'No. Folder',           getter: r => r.no_folder },
            { key:'createdAt',       header:'Tanggal Arsip',        getter: r => fmt(r.createdAt) },
        ], true);
        
        res.setHeader('Content-Disposition', `attachment; filename=arsip_surat_masuk_${Date.now()}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await wb.xlsx.write(res);
        res.end();
        } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Gagal mengunduh arsip Surat Masuk' });
        }
    },

}