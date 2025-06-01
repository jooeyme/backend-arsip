'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Disposisi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.SuratMasuk,
        { 
          foreignKey: 'no_agenda', 
          targetKey: 'no_agenda_masuk'
        }
      );
    }
  }
  Disposisi.init({
    no_agenda: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type_surat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tindakan: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dibuat: {
      type: DataTypes.STRING,
      allowNull: false
    },
    diteruskan: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ket_disposisi: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    catatan_tindak_lanjut: DataTypes.STRING,
    waktu_selesai: DataTypes.DATE,
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    waktu_dibaca: DataTypes.DATE,
    waktu_diproses: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Disposisi',
  });
  return Disposisi;
};