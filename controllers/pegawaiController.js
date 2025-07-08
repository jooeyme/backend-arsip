const { Pegawai } = require('../models');

module.exports = {
  // GET /api/pegawai
  getAllPegawai: async (req, res) => {
    try {
      const list = await Pegawai.findAll({
        order: [['nama_lengkap', 'ASC']]
      });
      res.status(200).json({
        message: "Successfully get all users",
        data: list
    });
    } catch (error) {
      console.error('Error fetching Pegawai:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/Pegawai
  createPegawai: async (req, res) => {
    try {
      const { nama_lengkap } = req.body;
      
      if (!nama_lengkap || !nama_lengkap.trim()) {
        return res.status(400).json({ message: 'Field `nama_lengkap` is required' });
      }
      // Buat baru
      const newOne = await Pegawai.create({ nama_lengkap: nama_lengkap.trim() });
      res.status(201).json(newOne);
    } catch (error) {
      console.error('Error creating Pegawai:', error);
      // tangani unique constraint
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Pegawai sudah ada' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  deletePegawai: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await Pegawai.findOne({
                where: {
                    id: id,
                }
            });

            if (result) {
                await Pegawai.destroy({
                    where: {
                        id: id
                    }
                });
                res.status(200).json({
                    message: `Pegawai with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `Pegawai with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting Pegawai with id`
            });
        }
    },
};

