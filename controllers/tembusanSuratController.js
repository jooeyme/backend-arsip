const { Tembusan } = require('../models');

module.exports = {
  // GET /api/tujuan
  getAllTembusan: async (req, res) => {
    try {
      const list = await Tembusan.findAll({
        order: [['nama', 'ASC']]
      });
      res.status(200).json(list);
    } catch (error) {
      console.error('Error fetching Tembusan:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/Tembusan
  createTembusan: async (req, res) => {
    try {
      const { nama } = req.body;
      
      console.log(nama)
      if (!nama || !nama.trim()) {
        return res.status(400).json({ message: 'Field `nama` is required' });
      }
      // Buat baru
      const newOne = await Tembusan.create({ nama: nama.trim() });
      res.status(201).json(newOne);
    } catch (error) {
      console.error('Error creating Tembusan:', error);
      // tangani unique constraint
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Tembusan sudah ada' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  deleteTembusan: async(req, res) => {
        try {
            const {id} = req.params;
            const result = await Tembusan.findOne({
                where: {
                    id: id,
                }
            });

            if (result) {
                await Tembusan.destroy({
                    where: {
                        id: id
                    }
                });
                res.status(200).json({
                    message: `Tembusan with id ${id} deleted successfully`
                  })
            } else {
                return res.status(404).json({
                    message: `Tembusan with id ${id} not found`
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `error deleting Tembusan with id`
            });
        }
    },

};

