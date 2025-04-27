const { LogPerubahan, User } = require("../models");

module.exports = {
  getAllLog: async(req, res) => {
    try {
        const result = await LogPerubahan.findAll();

        if (!result) {
            return res.status(404).json({
                message: `Log not found`,
            });
        }

        res.status(200).json({
            message: "success get all Log Perubahan",
            data: result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: "error getting all Log Perubahan"
        })
    }
  },
  
  getLogsBySurat: async (req, res) => {
  const { suratId, jenisSurat } = req.params;
  try {
    const logs = await LogPerubahan.findAll({
      where: { suratId, jenisSurat },
      include: [{ model: User, attributes: ["name", "role"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil log", error });
  }
},

addLog: async (req, res) => {
  const { suratId, jenisSurat, perubahan, userId, keterangan } = req.body;
  try {
    const newLog = await LogPerubahan.create({
      suratId,
      jenisSurat,
      perubahan,
      userId,
      keterangan,
    });
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat log", error });
  }
},

}
