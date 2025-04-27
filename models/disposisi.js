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
        { foreignKey: 'no_agenda', targetKey: 'no_agenda_masuk' }
      );
    }
  }
  Disposisi.init({
    no_agenda: DataTypes.STRING,
    type_surat: DataTypes.STRING,
    tindakan: DataTypes.STRING,
    diteruskan: DataTypes.STRING,
    ket_disposisi: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Disposisi',
  });
  return Disposisi;
};