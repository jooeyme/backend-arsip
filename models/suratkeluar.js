'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SuratKeluar extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.Document,
        { 
          foreignKey: 'no_agenda_keluar', 
          sourceKey: 'no_agenda_keluar'
        }
      );
    }
  }
  SuratKeluar.init({
    no_agenda_keluar: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    no_surat: DataTypes.STRING,
    tgl_surat: DataTypes.DATE,
    perihal: DataTypes.STRING,
    ditujukan: DataTypes.STRING,
    keterangan: DataTypes.STRING,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SuratKeluar',
  });
  return SuratKeluar;
};