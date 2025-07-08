const { KlasifikasiSurat } = require("../models");

module.exports = {
    getAllKlasifikasi: async (req, res) => {
        try {
          const data = await KlasifikasiSurat.findAll({
            attributes: ["id", "deskripsi", "kode"],
          });
          res.json(data);
        } catch (error) {
          res.status(500).json({ message: error.message });
        }
      },

      createKlasifikasi: async(req, res) => {
        try {
            const {
                kode,
                deskripsi
            } = req.body;

            const result = await KlasifikasiSurat.create({
                kode: kode,
                deskripsi: deskripsi
            });

            res.status(200).json({
                message: "created data Klasifikasi Successfully",
                data: result
            });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                message: "Internal server error"
            })
        }
      },

      deleteKlasifikasi: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await KlasifikasiSurat.findOne({
                where: {
                    id: id,
                }
            });

            if (result) {
                await KlasifikasiSurat.destroy({
                    where: {
                        id: id
                    }
                });
                res.status(200).json({
                    message: `KlasifikasiSurat with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `KlasifikasiSurat with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting KlasifikasiSurat with id`
            });
        }
    },

      

}