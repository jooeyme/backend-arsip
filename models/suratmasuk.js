'use strict';
const {
  Model
} = require('sequelize');
const { diff } = require("deep-diff");

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
          foreignKey: 'no_agenda_masuk', 
          sourceKey: 'no_agenda_masuk'
        }
      );

      this.belongsTo(models.Disposisi,
        { foreignKey: 'no_agenda_masuk', targetKey: 'no_agenda'}
      )
    }
  }
  SuratMasuk.init({
    no_agenda_masuk: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, 
    },
    tgl_terima: DataTypes.DATE,
    no_surat: DataTypes.STRING,
    tgl_surat: DataTypes.DATE,
    perihal: DataTypes.STRING,
    asal_surat: DataTypes.STRING,
    keterangan: DataTypes.STRING,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SuratMasuk',
  });

  SuratMasuk.addHook("beforeUpdate", async (instance, options) => {
    const changedFields = instance.changed();

    if (changedFields && changedFields.length === 0) return;
      const perubahan = {};

      changedFields.forEach((field) => {
        perubahan[field] = {
          old: instance._previousDataValues[field],
          new: instance.dataValues[field],
        };
      });

      const LogPerubahan = sequelize.models.LogPerubahan;

      await LogPerubahan.create({
        suratId: instance.id,
        jenisSurat: 'masuk', // untuk SuratMasuk
        perubahan,
        userId: options.userId || null, // pastikan dikirim dari controller
        keterangan: 'Perubahan data Surat Masuk',
      });
  })
  return SuratMasuk;
};