const { getSocketInstance } = require('../helpers/socket');

const ambilNoAgenda = (instance, jenisSurat) => {
  if (jenisSurat === 'masuk') return instance.no_agenda_masuk;
  if (jenisSurat === 'keluar') return instance.no_agenda_keluar;
  return null;
};

module.exports = {
  logPenambahanHook: async (instance, options, suratId, jenisSurat, keterangan) => {
    const LogPerubahan = instance.sequelize.models.LogPerubahan;
    const noAgenda = ambilNoAgenda(instance, jenisSurat);

    const logData = {
      suratId,
      jenisSurat,
      aksi: "created",
      perubahan: instance.dataValues,
      userId: options.context?.userId || null,
      keterangan,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => {
        LogPerubahan.create(logData).then((log) => {
          const io = getSocketInstance();
          if (io) {
            io.emit('log-perubahan', { log, action: 'created' });
          }
        });
      });
    } else {
      const log = await LogPerubahan.create(logData);
      const io = getSocketInstance();
      if (io) {
        io.emit('log-perubahan', { log, action: 'created' });
      }
    }
  },

  logPerubahanHook: async (instance, options, suratId,jenisSurat, keterangan) => {
    const changedFields = instance.changed();
  
    if (!changedFields || changedFields.length === 0) return;
  
    const perubahan = {};
  
    changedFields.forEach((field) => {
      perubahan[field] = {
        old: instance._previousDataValues[field],
        new: instance.dataValues[field],
      };
    });
  
    const LogPerubahan = instance.sequelize.models.LogPerubahan;
  
    const logData = {
      suratId,
      jenisSurat,
      aksi: "edited",
      perubahan,
      userId: options.context?.userId || null,
      keterangan,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => {
        LogPerubahan.create(logData).then((log) => {
          const io = getSocketInstance();
          if (io) {
            io.emit('log-perubahan', { log, action: 'updated' });
          }
        });
      });
    } else {
      const log = await LogPerubahan.create(logData);
      const io = getSocketInstance();
      if (io) {
        io.emit('log-perubahan', { log, action: 'updated' });
      }
    }
  },
  
  logPenghapusanHook: async (instance, options, suratId,jenisSurat, keterangan) => {
    const LogPerubahan = instance.sequelize.models.LogPerubahan;
    const perubahan = {};
    
    const logData = {
      suratId,
      jenisSurat,
      aksi: "deleted",
      perubahan,
      userId: options.context?.userId || null,
      keterangan,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => {
        LogPerubahan.create(logData).then((log) => {
          const io = getSocketInstance();
          if (io) {
            io.emit('log-perubahan', { log, action: 'deleted' });
          }
        });
      });
    } else {
      const log = await LogPerubahan.create(logData);
      const io = getSocketInstance();
      if (io) {
        io.emit('log-perubahan', { log, action: 'deleted' });
      }
    }
  }
}