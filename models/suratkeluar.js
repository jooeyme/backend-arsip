'use strict';
const {
  Model
} = require('sequelize');
const {
  logPerubahanHook,
  logPenghapusanHook,
  logPenambahanHook,
} = require('../helpers/perubahanHelper');

module.exports = (sequelize, DataTypes) => {
  class SuratKeluar extends Model {
    static associate(models) {
      // define association here
      this.hasMany(models.Document,
        { 
          foreignKey: 'documentId', 
          constraints: false,
          as: 'documents',
          scope: {
            documentType: "SuratKeluar",
          },
        }
      );
      this.hasMany(models.Review, {
        foreignKey: 'suratId',
        as: 'reviews',
      })
    }
  }
  SuratKeluar.init({
    no_surat: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    tgl_surat: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    perihal: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ditujukan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sifat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lampiran: DataTypes.JSON,
    jenis: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tembusan: DataTypes.STRING,
    no_folder: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SuratKeluar',
  });

  SuratKeluar.addHook('beforeUpdate', async (instance, options) => {
    await logPerubahanHook(instance, options, 'keluar', 'Perubahan Surat Keluar');
  });
  
  SuratKeluar.addHook('beforeDestroy', async (instance, options) => {
    await logPenghapusanHook(instance, options, 'keluar', 'Penghapusan Surat Keluar');
  });
  
  SuratKeluar.addHook('afterCreate', async (instance, options) => {
    await logPenambahanHook(instance, options, 'keluar', 'Penambahan Surat Keluar');
  });

  return SuratKeluar;
};