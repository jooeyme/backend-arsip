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

// GET /log-perubahan/latest
getLatestLogs: async (req, res) => {
  try {
    const logs = await LogPerubahan.findAll({
      where: {
        createdAt: {
          [Op.gte]: dayjs().subtract(1, 'day').toDate(),
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
},

markAsRead: async (req, res) => {
  try {
    const logId = req.params.id;

    const log = await LogPerubahan.findByPk(logId);
    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    log.isRead = true;
    await log.save();

    return res.status(200).json({ message: "Log marked as read", log });
  } catch (error) {
    console.error("Error marking log as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
},



}
