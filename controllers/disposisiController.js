const { where } = require("sequelize");
const { Disposisi } = require("../models");

module.exports = {
    //KURANG VALIDASI DUPLIKAT DATA
    createDisposisi: async(req, res) => {
        try {
            const {
                no_agenda,
                type_surat,
                tindakan,
                diteruskan,
                ket_disposisi,
            } = req.body

            const result = await Disposisi.create({
                no_agenda: no_agenda,
                type_surat: type_surat,
                tindakan: tindakan,
                diteruskan: diteruskan,
                ket_disposisi: ket_disposisi,
            })

            res.status(201).json({
                message: "Surat Masuk is created successfully",
                data: result
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                message: "error creating Disposisi"
            })
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