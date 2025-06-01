const { TujuanSurat } = require('../models');

module.exports = {
  // GET /api/tujuan
  getAllTujuan: async (req, res) => {
    try {
      const list = await TujuanSurat.findAll({
        order: [['nama', 'ASC']]
      });
      res.status(200).json(list);
    } catch (error) {
      console.error('Error fetching tujuan:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/tujuan
  createTujuan: async (req, res) => {
    try {
      const { nama } = req.body;
      
      console.log(nama)
      if (!nama || !nama.trim()) {
        return res.status(400).json({ message: 'Field `nama` is required' });
      }
      // Buat baru
      const newOne = await TujuanSurat.create({ nama: nama.trim() });
      res.status(201).json(newOne);
    } catch (error) {
      console.error('Error creating tujuan:', error);
      // tangani unique constraint
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Tujuan sudah ada' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
