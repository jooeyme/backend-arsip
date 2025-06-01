const { where } = require("sequelize");
const { Disposisi, SuratMasuk, sequelize } = require("../models");

const STATUS_TRANSITIONS = {
  belum_dibaca: ['dibaca'],
  dibaca: ['diproses'],
  diproses: ['selesai'],
  selesai: [],

};


module.exports = {
    //KURANG VALIDASI DUPLIKAT DATA
    createDisposisi: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const {
                no_agenda,
                tindakan,
                diteruskan,
                ket_disposisi,
            } = req.body;

            const dibuat = req.userData.username;
            
            const status = "belum_dibaca"  // "dibaca", "diproses", "selesai"

            const surat = await SuratMasuk.findOne({
                where: {
                    no_agenda_masuk: no_agenda
                },
                attributes: ["id","jenis"],
                transaction: t
            });

            if (!surat) {
                return res.status(404).json({
                    message: "surat not found"
                })
            }
            const type_surat = surat.jenis;

            const lastDisposisi = await Disposisi.findOne({
                where: { no_agenda: no_agenda },
                order: [['urutan', 'DESC']],
                transaction: t
              });
            
            const urutan = lastDisposisi ? lastDisposisi.urutan + 1 : 1;

            const result = await Disposisi.create({
                no_agenda: no_agenda,
                type_surat: type_surat,
                tindakan: tindakan,
                dibuat: dibuat,
                diteruskan: diteruskan,
                ket_disposisi: ket_disposisi,
                status: status,
                urutan: urutan
            }, {
                transaction: t,
            })

            await surat.update(
                { status: "didisposisikan" },
                {
                    transaction: t,
                    individualHooks: true,
                    context: { userId: req.userData.id }
                }
            );

            await t.commit();

            res.status(201).json({
                message: "Surat Masuk is created successfully",
                data: result
            })
        } catch (error) {
            console.error(error);
            await t.rollback();
            res.status(500).json({
                message: "error creating Disposisi"
            })
        }
    },

    updateDisposisiStatus: async(req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id }     = req.params;
            const { status, catatan_tindak_lanjut } = req.body; 
            let statusSurat= null;
            const disp = await Disposisi.findByPk(id);
            if (!disp) {
                return res.status(404).json({ message: 'Disposisi tidak ditemukan' });
            }

            const surat = await SuratMasuk.findOne({
                where: {
                    no_agenda_masuk: disp.no_agenda
                },
                transaction: t
            });
            if (!surat) {
                return res.status(404).json({ message: "Surat masuk not found"})
            }

            // hanya izinkan transition tertentu
            const ALLOWED = STATUS_TRANSITIONS[disp.status] || [];
            if (!ALLOWED.includes(status)) {
                return res.status(400).json({ message: `Status tidak valid: ${status}` });
            }

            if (status === 'dibaca') {
                disp.waktu_dibaca = new Date();
            }
            if (status === 'diproses') {
                disp.waktu_diproses = new Date();
                statusSurat = 'diproses'
            }

            if (status === 'selesai') {
                if (!catatan_tindak_lanjut) {
                    await t.rollback();
                    return res.status(400).json({ message: 'Catatan tindak lanjut wajib diisi saat selesai' });
                }
                disp.catatan_tindak_lanjut = catatan_tindak_lanjut;
                disp.waktu_selesai = new Date();
                statusSurat = 'selesai'
            }

            // Update status
            disp.status = status;
            await disp.save({ transaction: t });
            if (statusSurat) {
                surat.status = statusSurat;
                await surat.save({
                    transaction: t,
                    individualHooks: true,
                    context: { userId: req.userData.id }
                });
            }
            
            await t.commit();
            
            return res.status(200).json({
                message: `Status disposisi diubah menjadi ${status}`,
                data: disp
            });
        } catch (err) {
            console.error(err);
            await t.rollback();
            return res.status(500).json({ message: 'Gagal mengubah status disposisi' });
        }
    },

    getByIdDisposisi: async(req, res) => {
        try {
            const { id } = req.params;
            const result = await Disposisi.findOne({
                where: {
                    id: id,
                },
            });

            if (!result) {
                return res.status(404).json({
                    message: `Disposisi with id ${id} not found`,
                });
            }

            res.status(200).json({
                message: `Successfully found Disposisi with id ${id}`,
                data: result,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error finding Disposisi with id ${id}`
            })
        }
    },

    getAllDisposisi: async(req, res) => {
        try {
            const result = await Disposisi.findAll();

            if (!result) {
                return res.status(404).json({
                    message: `Disposisi not found`,
                });
            }

            res.status(200).json({
                message: "success get all Disposisi",
                data: result
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error getting all Disposisi"
            })
        }
    },

    editDisposisi: async(req, res) => {
        try {
            const {id} = req.params;
            const {
                no_agenda,
                type_surat,
                tindakan,
                diteruskan,
                ket_disposisi,
            } = req.body

            const result = await Disposisi.findOne({
                where: {
                    id: id,
                },
            });

            if(!result) {
                return res.status(404).json({
                    message: `Disposisi not found`
                });
            };

            const updateDiposisi = await Disposisi.update({
                no_agenda: no_agenda,
                type_surat: type_surat,
                tindakan: tindakan,
                diteruskan: diteruskan,
                ket_disposisi: ket_disposisi,
            },{
                where: {
                    id: id,
                },
            });

            res.status(200).json({
                message: `success updated surat with id ${id}`,
                data: updateDiposisi,
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `internal server error, ${error.message}`
            })
        }
    },

    editProsesDisposisi: async(req, res) => {
        try {
            const {id} = req.params;
            const {
                status,
                catatan_tindak_lanjut,
                waktu_selesai,
            } = req.body

            const result = await Disposisi.findOne({
                where: {
                    id: id,
                },
            });

            if(!result) {
                return res.status(404).json({
                    message: `Disposisi not found`
                });
            };

            const updateDiposisi = await Disposisi.update({
                status: status,
                catatan_tindak_lanjut: catatan_tindak_lanjut,
                waktu_selesai: waktu_selesai
            },{
                where: {
                    id: id,
                },
            });

            res.status(200).json({
                message: `success updated surat with id ${id}`,
                data: updateDiposisi,
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `internal server error, ${error.message}`
            })
        }
    },

    deleteDisposisi: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await Disposisi.findOne({
                where: {
                    id: id,
                }
            });

            if (result) {
                await Disposisi.destroy({
                    where: {
                        id: id
                    }
                });
                res.status(200).json({
                    message: `Room with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `Disposisi with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting Disposisi with id ${id}`
            });
        }
    },

}