const { SuratKeluar, Document, sequelize, KlasifikasiSurat, Review, User } = require('../models');
const {uploadToGoogleDrive, deleteFromGoogleDrive} = require('../middleware/documentStorage');
const fs = require('fs');
const { Op, UniqueConstraintError } = require('sequelize');
const esClient = require('../config/esClient');
const extractTextFromPDF = require('../middleware/ekstractText');
const { Model } = require('sequelize');
const { content } = require('googleapis/build/src/apis/content');
const { archiveSuratMasuk } = require('./suratMasukController');
const { generateNoSuratKeluar } = require('../helpers/generateNoSurat');
const { buildWorksheet } = require('../helpers/buildWorkSheet');
const ExcelJS = require('exceljs');

function extractFileId(url) {
    return url.split("/d/")[1]?.split("/")[0] || null;
};

function toRoman(num) {
  if (num <= 0 || num >= 4000) {
    throw new Error('toRoman only supports integers 1-3999');
  }
  const romans = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  const ints   = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  let res = '';
  for (let i = 0; i < ints.length; i++) {
    while (num >= ints[i]) {
      res += romans[i];
      num -= ints[i];
    }
  }
  return res;
}

const STATUS_TRANSITIONS = {
  draft: ['KTU_Review'],
  KTU_Review: ['Dept_Review', 'KTU_Revision'],
  KTU_Revision: ['KTU_Review'],
  Dept_Review: ['Dept_Revision', 'waiting_number'],
  Dept_Revision: ['Dept_Review'],
  waiting_number: ['waiting_signature'],
  waiting_signature: ['completed'],
  completed: ['archived'],
  archived: []
};

function fmt(date) {
  return date ? date.toISOString().slice(0,10) : '';
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
                    size: 20,
                    from: 0,
                    query: {
                        bool:{
                            should: [
                                {
                                    term: {
                                        perihal: {
                                            value: query.trim(),
                                            boost: 5
                                        }
                                    }
                                },
                                {
                                    prefix: {
                                    "no_surat": {
                                        value: query.trim().toUpperCase(),  // normalisasi jika perlu
                                        boost: 3
                                    }
                                    }
                                },
                                {
                                    multi_match: {
                                        query: query,
                                        fields: [
                                            "keterangan^2", 
                                            "ditujukan", 
                                            "content^3"
                                        ],
                                        type: "best_fields", // Autocomplete
                                        operator: "AND",
                                        fuzziness: "AUTO",
                                        prefix_length: 2,
                                    },
                                },
                                {
                                    // prefix match untuk autocomplete
                                    match_phrase_prefix: {
                                        content: {
                                            query,
                                            max_expansions: 50
                                        }
                                    }
                                }
                            ],
                            minimum_should_match: 1, 
                        },
                        
                    },
                    highlight: {
                        pre_tags: ["<mark>"],
                        post_tags: ["</mark>"],
                        fields: {
                            no_surat: {},
                            perihal: {
                                fragment_size: 80,
                                number_of_fragments: 1
                            },
                            content: { 
                                fragment_size: 100, 
                                number_of_fragments: 1 
                            },
                        keterangan: {}
                        }
                    }
                },
            });

            const hits = result.hits.hits.map((hit) => ({
                id: hit._id,
                score: hit._score,
                source: hit._source,
                highlight: hit.highlight || {}
            }));
    
            res.status(200).json({ results: hits });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error searching surat" });
        }
    },
    //KURANG VALIDASI DUPLIKAT DATA
    createSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();

        const files = req.files;
        const uploadedFileIds = [];
        const draftFile = files?.draft?.[0];
        const allLampiran = files?.lampiran || [];

        try {
            const lampiranNames = (files.lampiran || []).map(f => f.originalname);

            const {
                tgl_surat,
                perihal,
                ditujukan,
                keterangan,
                sifat,
                jenis,
                tembusan,
                klasId
            } = req.body

            console.log("apa isi re body", req.body)

            const klas = await KlasifikasiSurat.findByPk(klasId);
            if (!klas) {
                return res.status(400).json({
                    message: "klasifikasi surat not found"
                });
            }

            const status = 'draft'
            const kode = 'IT3.F4.1';
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const roman = toRoman(month);
            const suffix = `/${kode}/${klas.kode}/${roman}/${year}`

            const surat = await SuratKeluar.create({
                no_surat: suffix,
                tgl_surat: tgl_surat,
                perihal: perihal,
                ditujukan: ditujukan,
                keterangan: keterangan,
                status: status,
                sifat: sifat,
                jenis: jenis,
                lampiran: lampiranNames,
                tembusan: tembusan,
            }, { 
                transaction: t,
                individualHooks: true,
                context: {
                  userId: req.userData.id
                } 
            });

            if (draftFile) {
                //const content = await extractTextFromPDF(draftFile.path);
                const fileUrl = await uploadToGoogleDrive(draftFile.path, draftFile.originalname);
                const fileId = extractFileId(fileUrl);
                uploadedFileIds.push(fileId);
                try {
                    const doc = await Document.create({
                        documentType: "SuratKeluar",
                        documentId: surat.id,
                        name_doc: draftFile.originalname,
                        type_doc: 'draft',
                        path_doc: fileUrl
                      }, {
                        transaction: t,
                        individualHooks: true,
                        context: { userId: req.userData.id }
                      });
                
                    //   await esClient.index({
                    //     index: "surat_keluar",
                    //     id: `${surat.no_surat}-${doc.id}`,
                    //     body: {
                    //       no_agenda: surat.no_agenda_keluar,
                    //       name_doc: doc.name_doc,
                    //       type_doc: doc.type_doc,
                    //       path_doc: doc.path_doc,
                    //       content: content,
                    //       createdAt: surat.createdAt,
                    //     },
                    //   });
                } catch (error) {
                    console.error(`Gagal proses dokumen ${draftFile.originalname}:`, error);
                    throw error;
                }
              };

            for (const lampiran of allLampiran) {
                try {
                    const lampiranUrl = await uploadToGoogleDrive(lampiran.path, lampiran.originalname);
                    const lampId = extractFileId(lampiranUrl);
                    uploadedFileIds.push(lampId);
                
                    await surat.createDocument({
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
                message: "Surat Keluar is created successfully",
                data: surat,
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            await Promise.all(uploadedFileIds.map(id => deleteFromGoogleDrive(id)));
            res.status(500).json({
                message: "error creating SuratKeluar"
            });
        } finally {
            [draftFile, ...allLampiran].forEach(f => {
                if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
    },

    uploadSuratKeluarArchived: async (req, res) => {
    const t = await sequelize.transaction();

    const files = req.files;
    const uploadedFileIds = [];
    const draftFile = files?.dokumen_utama?.[0];
    const allLampiran = files?.lampiran || [];

    try {
        const lampiranNames = allLampiran.map(f => f.originalname);

        const {
        no_surat, // nomor surat diinput manual
        tgl_surat,
        perihal,
        ditujukan,
        keterangan,
        sifat,
        jenis,
        tembusan,
        no_folder
        } = req.body;

        if (!no_surat) {
        return res.status(400).json({ message: "no_surat wajib diisi secara manual" });
        }

        const status = 'archived'; // langsung diarsipkan

        const prefix = typeof no_surat === "string"
      ? no_surat.split("/")[0]
      : no_surat;

    if (!prefix) {
      await t.rollback();
      return res.status(400).json({
        message: "Format no_surat tidak valid. Harus mengandung '/' sebagai pemisah.",
      });
    }

    // 3) Cek apakah sudah ada no_surat lain yang dimulai dengan prefix yang sama
    const existing = await SuratKeluar.findOne({
      where: {
        no_surat: {
          [Op.startsWith]: `${prefix}/`
        }
      },
      transaction: t,
      lock: t.LOCK.UPDATE, // optional: mengunci row selama transaksi
    });

    if (existing) {
      await t.rollback();
      return res.status(400).json({
        message: `Nomor surat "${prefix}" sudah terdaftar (contoh: "${existing.no_surat}"). ` +
                 `Silakan gunakan nomor surat yang berbeda.`,
        field: "no_surat"
      });
    }

        const surat = await SuratKeluar.create({
        no_surat,
        tgl_surat,
        perihal,
        ditujukan,
        keterangan,
        status,
        sifat,
        jenis,
        lampiran: lampiranNames,
        tembusan,
        no_folder
        }, {
        transaction: t,
        individualHooks: true,
        context: { userId: req.userData.id }
        });

        if (draftFile) {
        const fileUrl = await uploadToGoogleDrive(draftFile.path, draftFile.originalname);
        const fileId = extractFileId(fileUrl);
        uploadedFileIds.push(fileId);

        const doc = await Document.create({
            documentType: "SuratKeluar",
            documentId: surat.id,
            name_doc: draftFile.originalname,
            type_doc: 'draft',
            path_doc: fileUrl
        }, {
            transaction: t,
            individualHooks: true,
            context: { userId: req.userData.id }
        });

        const content = await extractTextFromPDF(draftFile.path);

        await esClient.index({
            index: "surat_keluar",
            id: `${surat.no_surat}-${doc.id}`,
            body: {
            id:         surat.id.toString(),
            no_surat:   surat.no_surat,
            tgl_surat:  surat.tgl_surat,
            perihal:    surat.perihal,
            ditujukan:  surat.ditujukan,
            keterangan: surat.keterangan,
            status:     surat.status,
            sifat:      surat.sifat,
            // lampiran:    surat.lampiran,
            jenis:      surat.jenis,
            tembusan:   surat.tembusan,
            no_folder:  surat.no_folder,
            createdAt:  surat.createdAt,
            content:    content,
            name_doc:   doc.name_doc,
            type_doc:   doc.type_doc,
            path_doc:   doc.path_doc
            }
        });
        }

        for (const lampiran of allLampiran) {
        const lampiranUrl = await uploadToGoogleDrive(lampiran.path, lampiran.originalname);
        const lampId = extractFileId(lampiranUrl);
        uploadedFileIds.push(lampId);

        const doc = await surat.createDocument({
            name_doc: lampiran.originalname,
            type_doc: 'lampiran',
            path_doc: lampiranUrl
        }, {
            transaction: t,
            individualHooks: true,
            context: { userId: req.userData.id }
        });

        const content = await extractTextFromPDF(lampiran.path);

        await esClient.index({
            index: "surat_keluar",
            id: `${surat.no_surat}-${doc.id}`,
            body: {
            id:         surat.id.toString(),
            no_surat:   surat.no_surat,
            tgl_surat:  surat.tgl_surat,
            perihal:    surat.perihal,
            ditujukan:  surat.ditujukan,
            keterangan: surat.keterangan,
            status:     surat.status,
            sifat:      surat.sifat,
            // lampiran:   surat.lampiran,
            jenis:      surat.jenis,
            tembusan:   surat.tembusan,
            no_folder:  surat.no_folder,
            createdAt:  surat.createdAt,
            content:    content,
            name_doc:   doc.name_doc,
            type_doc:   doc.type_doc,
            path_doc:   doc.path_doc
            }
        });
        }

        await t.commit();

        res.status(201).json({
        message: "Surat Keluar berhasil diarsipkan secara manual",
        data: surat,
        });
    } catch (error) {
        console.error(error);
        await t.rollback();
        await Promise.all(uploadedFileIds.map(id => deleteFromGoogleDrive(id)));
        if (error instanceof UniqueConstraintError) {
                const field = error.errors[0]?.path; // nama kolom yang duplikat
                const value = error.errors[0]?.value; // nilai yang menyebabkan duplikat
                return res.status(400).json({
                    message: `Nomor agenda "${value}" sudah terdaftar. Mohon gunakan no agenda yang berbeda.`,
                    field
                });
                }
        res.status(500).json({
        message: "Gagal mengarsipkan Surat Keluar secara manual"
        });
    } finally {
        [draftFile, ...allLampiran].forEach(f => {
        if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
    }
    },

    getTrackingSuratKeluar: async (req, res) => {
        try {
        const id = req.params.id;
        // 1) Ambil surat + semua review + reviewer
        const surat = await SuratKeluar.findByPk(id, {
            include: [{
            model: Review,
            as: 'reviews',
            include: [{ 
                model: User, 
                as: 'reviewer', 
                attributes: ['id', 'nama_lengkap', 'role'] 
                }],
            }]
        });
        if (!surat) {
            return res.status(404).json({ message: 'SuratKeluar tidak ditemukan.' });
        }

        // 2) Bangun langkah–langkah timeline
        const timeline = [];

        // **Draft dibuat**
        timeline.push({
            key: 'draft',
            title: 'Surat Dibuat (Draft)',
            at: surat.createdAt
        });

        // **Setiap review** (urut menurut waktu)
        surat.reviews
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .forEach((rev) => {

                 // Tentukan jenis review berdasarkan role reviewer
            const isKTU  = rev.reviewer.role === 'ktu';
            const isDept = ['kadep','sekretaris'].includes(rev.reviewer.role);

            let titlePrefix;
            if (isKTU)  titlePrefix = 'Review KTU';
            else if (isDept) titlePrefix = 'Review Dept';
            else titlePrefix = 'Review';
            
            timeline.push({
                key: `review-${rev.id}`,
                title: rev.status === 'approved' ? `${titlePrefix} Disetujui` : `${titlePrefix} - Perlu Revisi`,
                reviewer: rev.reviewer?.nama_lengkap || '-',
                komentar: rev.komentar,
                at: rev.createdAt
            });
            });

        // **Menunggu tanda tangan**  
        if (['waiting_number','waiting_signature','completed']
            .includes(surat.status)) {
            timeline.push({
            key: 'waiting_number',
            title: 'Menunggu Nomor Surat',
            at: surat.updatedAt
            });
        }

        // **Sudah Signed**  
        if (['waiting_signature','completed']
            .includes(surat.status)) {
            timeline.push({
            key: 'signed',
            title: 'Surat Ditandatangani',
            at: surat.updatedAt
            });
        }

         if (surat.status === 'completed') {
            timeline.push({
            key: 'completed',
            title: 'Surat Selesai',
            at: surat.updatedAt
            });
        }

        
         if (surat.status === 'archived') {
            timeline.push({
            key: 'archived',
            title: 'Surat Diarsipkan',
            at: surat.updatedAt
            });
        }

        return res.json({ data: timeline });
        } catch (err) {
        console.error('getTracking error', err);
        return res.status(500).json({ message: 'Gagal mengambil tracking.' });
        }
    },

    getByIdSuratKeluar: async(req, res) => {
        try {
            const  id  = req.params.id;
            console.log("req params:", id)

            const result = await SuratKeluar.findByPk(id,
            {
                include: [
                    { model: Document, as: 'documents' },
                    {
                        model: Review,
                        as: 'reviews',
                        include: [
                            {
                            model: User,
                            as: 'reviewer',
                            attributes: ['id', 'nama_lengkap']  // atau field user lain
                            }
                        ],
                        order: [['createdAt', 'ASC']]
                    }
                ]
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
            const { page = 1, limit = 20, status, jenis } = req.query;
            const offset = (page - 1) * limit;
            const where = {status: {[Op.ne] : 'archived'}};
            if (status) where.status = status;
            if (jenis) where.jenis = jenis;

            const { count, rows } = await SuratKeluar.findAndCountAll({
                where, distinct: true, offset, limit: +limit,
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                message: "success get all SuratKeluar",
                total: count,
                page: +page,
                data: rows
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error getting all SuratKeluar"
            })
        }
    },

    editSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { data } = req.body;

            const result = await SuratKeluar.findByPk(id);

            if (!result) {
                return res.status(404).json({
                    message: `Surat with id ${id} not found`,
                });
            };

            const immutable = ['no_surat', 'tgl_surat'];
            if (surat.status !== 'draft') {
                for (const f of immutable) {
                    if (data[f] && data[f] !== surat[f]) {
                        return res.status(400).json({
                            message: `${f} cannot be modified once not in draft`
                        });
                    }
                }
            }

            const updateSurat = await result.update(
                data,
            {
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }
            });

            await t.commit()

            res.status(200).json({
                message: `success updated surat with id ${id}`,
                data: updateSurat,
            });

        } catch (error) {
            console.error(error.message);
            await t.rollback();
            res.status(500).json({
                message: "internal server error"
            });
        }
    },

    updateStatusSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { status: newStatus } = req.body;

            const surat = await SuratKeluar.findByPk(id);

            if (!surat) {
                return res.status(404).json({
                    message: 'Surat masuk tidak ditemukan'
                });
            }

            const alowed = STATUS_TRANSITIONS[surat.status] || [];
            if (!alowed.includes(newStatus)) {
                return res.status(400).json({
                    message:  `Cannot transition from ${surat.status} to ${newStatus}`,
                })
            }

            // persiapkan perubahan
            const updates = { status: newStatus };

            if (newStatus === 'approved_pending_signature') {
                //const newNoSurat = await generateNoSuratKeluar(surat.id);
                surat.no_surat = newNoSurat;
            }
            
            const updatedSurat = await surat.update({ 
                status: newStatus ,
                ...(newStatus === 'approved_pending_signature' && { no_surat: surat.surat.no_surat })
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
                data: updatedSurat
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

    generateNumber: async (req, res) => {
        const t = await sequelize.transaction();
        try {
        const { id: suratId } = req.params;
        const userId = req.userData.id;

        const surat = await SuratKeluar.findByPk(suratId, { transaction: t });
        if (!surat) {
            await t.rollback();
            return res.status(404).json({ message: 'SuratKeluar tidak ditemukan.' });
        }

        // Pastikan status sedang menunggu nomor
        if (surat.status !== 'waiting_number') {
            await t.rollback();
            return res.status(400).json({ message: `Tidak dapat generate nomor saat status '${surat.status}'.` });
        }

        // Generate dan simpan nomor surat + update status
        const newNo = await generateNoSuratKeluar(suratId);
        await surat.update({
            no_surat: newNo,
            status: 'waiting_signature'
        }, {
            transaction: t,
            individualHooks: true,
            context: { userId }
        });

        await t.commit();
        return res.status(200).json({ message: 'Nomor surat berhasil dibuat', data: surat });

        } catch (error) {
        await t.rollback();
        console.error('generateNumber error:', error);
        return res.status(500).json({ message: 'Gagal generate nomor surat', error: error.message });
        }
    },

    uploadSigned: async(req, res) => {
        const t = await sequelize.transaction();
        
        let driveFileId;
        let tempPath
        
        try {
            const {id} = req.params;

            const file = req.file;
            if (!file) {
                return res.status(404).json({
                    message: "no file uploaded"
                });
            }
            
            const surat = await SuratKeluar.findByPk(id);
            if (!surat) {
                return res.status(404).json({ 
                    message: 'Not Found'
                });
            }

            const content = await extractTextFromPDF(file.path);
            const url = await uploadToGoogleDrive(file.path, file.originalname);
            driveFileId = extractFileId(url);
            tempPath = file.path
            console.log("apakah sampe url?:", url)
            
            const doc = await Document.create({
                    documentType: "SuratKeluar",
                    documentId: surat.id,
                    name_doc: file.originalname,
                    type_doc: 'signed',
                    path_doc: url
                }, 
                {
                    transaction: t,
                    individualHooks: true,
                    context: {
                        userId: req.userData.id
                    }
                });

                console.log("apa isi doc:", doc)

            surat.status = 'completed';
            await surat.save({ 
                transaction: t, 
                individualHooks: true,
                context: {
                        userId: req.userData.id
                    } });
            
            await t.commit();

            await esClient.index({
                index: "surat_keluar",
                id: `${surat.no_surat}-${doc.id}`,
                body: {
                    id:         surat.id.toString(),
                    no_surat:   surat.no_surat,
                    tgl_surat:  surat.tgl_surat,
                    perihal:    surat.perihal,
                    ditujukan:  surat.ditujukan,
                    keterangan: surat.keterangan,
                    status:     surat.status,
                    sifat:      surat.sifat,
                    lampiran:   surat.lampiran || [],
                    jenis:      surat.jenis,
                    tembusan:   surat.tembusan,
                    no_folder:  surat.no_folder,
                    createdAt:  surat.createdAt,
                    content: content,
                },
            });
            
            return res.status(200).json({
                message: `Dokumen signed surat keluar berhasil ditambahkan `,
                data: doc
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            if (driveFileId) {
                await deleteFromGoogleDrive(driveFileId);
            }
                return res.status(500).json({
                message: "Error uploading signed document"
            });
        } finally {
            if (tempPath && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
                }
        
        }
    },

    archiveSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { no_folder } = req.body;
            const surat = await SuratKeluar.findByPk(id);
            if (!surat) {
                return res.status(404).json({
                    message: "not found"
                });
            }
            if (surat.status !== 'completed') {
                return res.status(400).json({
                    message: 'Only sent letters can be archived'
                });
            }

            if (!no_folder) {
                return res.status(400).json({
                    message: `must set no folder, ${no_folder} `
                });
            }

            const updated = await surat.update({
                status: 'archived',
                no_folder: no_folder
            }, {
                transaction: t,
                individualHooks: true,
                context: {
                    userId: req.userData.id
                }
            });
            await t.commit();
            return res.status(200).json({
                message: "berhasil archived surat keluar",
                data: updated
            });
        } catch (error) {
            console.error(error);
            await t.rollback();
            return res.status(500).json({
                message: 'Error archiving Surat keluar'
            });
        }
    },

    getDashboardSuratKeluar: async (req, res) => {
        try {
            const { role } = req.userData;
            let statuses = [];
            if (role === 'ktu') {
                statuses = ['draft', 'KTU_Review', 'waiting_number'];
            } else if (['kadep', 'sekretaris'].includes(role)) {
                statuses = ['Dept_Review'];
            } else if (role === 'administrasi') {
                statuses = ['KTU_Revision', 'Dept_Revision', 'waiting_signature', 'completed'];
            } else {
                return res.status(403).json({ message: 'Role tidak berwenang mengakses dashboard.' });
            }

            const suratList = await SuratKeluar.findAll({
                where: { status: { [Op.in]: statuses } },
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({ data: suratList });
        } catch (error) {
            console.error('getDashboardSuratKeluar error', error);
            return res.status(500).json({ message: 'Gagal mengambil dashboard surat keluar.', error: error.message });
        }
    },

    deleteSuratKeluar: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const {id} = req.params;
            const result = await SuratKeluar.findOne({
                where: {
                    id: id,
                }
            });

             if (!result) {
                return res.status(404).json({ message: `SuratMasuk with id ${id} not found` });
                }

                const noAgenda = result.no_surat;

                // Ambil semua dokumen terkait
                const documents = await Document.findAll({
                    where: { 
                        documentType: 'SuratKeluar',
                        documentId: id 
                    }
                });

                // Hapus dari Google Drive & Elasticsearch
                for (const doc of documents) {
                    const fileId = extractFileId(doc.path_doc);
            
                    if (fileId) {
                    await deleteFromGoogleDrive(fileId);
                    }
            
                    try {
                    await esClient.delete({
                        index: "surat_keluar",
                        id: `${noAgenda}-${doc.id}`,
                    });

                    } catch (err) {
                    console.warn(`Elasticsearch deletion warning: ${err.message}`);
                    }
                }

                 // Hapus dokumen dari database
                await Document.destroy({
                    where: { documentId: id },
                    transaction: t,
                    individualHooks: true,
                    context: {
                        userId: req.userData.id
                    }
                });
            
                await SuratKeluar.destroy({
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
                    message: `Room with id ${id} deleted successfully`
                });
            
        } catch (error) {
            console.error(error);
            await t.rollback();
            res.status(500).json({
                message: `error deleting SuratKeluar with id`
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
            });

            res.status(200).json({
                message: `Successfully get all SuratKeluar by user ${name}`, 
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error getting SuratKeluar by user ${name}`,
            })
        }
    },

    getArchivedSuratKeluar: async (req, res) => {
        try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await SuratKeluar.findAndCountAll({
            where: { status: 'archived' },   // atau 'diarsipkan' jika modelmu pakai itu
            distinct: true,
            offset,
            limit: +limit,
            order: [['createdAt', 'DESC']],
            include: [
            {
                model: Document,
                as: 'documents',
                attributes: ['id', 'type_doc', 'path_doc']
            }
            ]
        });

        return res.status(200).json({
            message: 'Success fetching archived Surat Keluar',
            total: count,
            page: +page,
            data: rows
        });
        } catch (err) {
        console.error('getArchivedSuratKeluar error', err);
        return res.status(500).json({
            message: 'Error fetching archived Surat Keluar'
        });
        }
    },

    downloadArchivedSuratKeluarXlsx: async (req, res) => {
    try {
      // Ambil semua SuratKeluar archived beserta dokumennya
      const rows = await SuratKeluar.findAll({
        where: { status: 'archived' },
        attributes: [
          'no_surat','tgl_surat','ditujukan',
          'perihal','keterangan','jenis',
          'sifat','no_folder','createdAt'
        ],
        include: [{
          model: Document,
          as: 'documents',
          attributes: ['type_doc','path_doc']
        }]
      });

      const wb = new ExcelJS.Workbook();
      await buildWorksheet(wb, 'Arsip Surat Keluar', rows, [
        { key:'no_surat',      header:'No. Surat',      getter: r => r.no_surat },
        { key:'tgl_surat',     header:'Tanggal Surat',  getter: r => fmt(r.tgl_surat) },
        { key:'ditujukan',     header:'Ditujukan',      getter: r => r.ditujukan },
        { key:'perihal',       header:'Perihal',        getter: r => r.perihal },
        { key:'keterangan',    header:'Keterangan',     getter: r => r.keterangan },
        { key:'jenis',         header:'Jenis',          getter: r => r.jenis },
        { key:'sifat',         header:'Sifat',          getter: r => r.sifat },
        { key:'no_folder',     header:'No. Folder',     getter: r => r.no_folder },
        { key:'createdAt',     header:'Tanggal Arsip',  getter: r => fmt(r.createdAt) },
      ]);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=arsip_surat_keluar_${Date.now()}.xlsx`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await wb.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message:'Gagal generate XLSX Surat Keluar' });
    }
  },

    getSuratKeluarDataTable: async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 1;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = req.query.search?.value || "";

    const orderColumnIdx = req.query.order?.[0]?.column || 0;
    const orderDir = req.query.order?.[0]?.dir || "asc";

    // Kolom yang ditampilkan di tabel (harus urut)
    const columns = [
      "no_surat",
      "tgl_surat",
      "perihal",
      "ditujukan",
      "keterangan",
      "status",
      "sifat",
      "jenis",
      "tembusan",
      "no_folder",
      "createdAt",
      "updatedAt",
    ];

    const orderBy = columns[orderColumnIdx] || "tgl_surat";

    // Kondisi pencarian global
    const where = searchValue
      ? {
          [Op.or]: [
            { no_surat: { [Op.iLike]: `%${searchValue}%` } },
            { perihal: { [Op.iLike]: `%${searchValue}%` } },
            { ditujukan: { [Op.iLike]: `%${searchValue}%` } },
            { keterangan: { [Op.iLike]: `%${searchValue}%` } },
          ],
        }
      : {};

    const totalRecords = await SuratKeluar.count();
    const { count: filteredCount, rows } = await SuratKeluar.findAndCountAll({
      where,
      order: [[orderBy, orderDir]],
      offset: start,
      limit: length,
      attributes: { exclude: []},
    });

    return res.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered: filteredCount,
      data: rows,
    });
  } catch (error) {
    console.error("Error in DataTables controller:", error);
    return res.status(500).json({ message: "Gagal mengambil data surat keluar" });
  }
}


}