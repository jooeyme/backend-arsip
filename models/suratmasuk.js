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
  class SuratMasuk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.Document,
        { 
          foreignKey: 'documentId', 
          constraints: false,
          as: "documents",
          scope: {
            documentType: "SuratMasuk", 
          }
        }
      );

      this.hasMany(models.Disposisi,
        { 
          foreignKey: 'no_agenda', 
          sourceKey: 'no_agenda_masuk',
          as: 'disposisi'

        });

      this.belongsToMany(models.User, {
        through: 'Recipients',
        foreignKey: 'suratMasukId',
        otherKey: 'userId',
        as: 'penerimaUsers'
      });
    }
  }
  SuratMasuk.init({
    no_agenda_masuk: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, 
    },
    tgl_terima: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    no_surat: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tgl_surat: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    perihal: {
      type: DataTypes.STRING,
      allowNull: false
    },
    asal_surat: {
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
      allowNull: false
    },
    lampiran: DataTypes.JSON,
    jenis: {
      type: DataTypes.STRING,
      allowNull: false
    },
    penerima: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tembusan: DataTypes.STRING,
    no_folder: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SuratMasuk',
  });

  SuratMasuk.addHook('beforeUpdate', async (instance, options) => {
    await logPerubahanHook(instance, options, instance.id, 'masuk', 'Perubahan Surat Masuk');
  });
  
  SuratMasuk.addHook('beforeDestroy', async (instance, options) => {
    await logPenghapusanHook(instance, options, instance.id, 'masuk', 'Penghapusan Surat Masuk');
  });
  
  SuratMasuk.addHook('afterCreate', async (instance, options) => {
    await logPenambahanHook(instance, options, instance.id, 'masuk', 'Penambahan Surat Masuk');
  });

  
  return SuratMasuk;
};