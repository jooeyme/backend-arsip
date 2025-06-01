'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TujuanSurat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TujuanSurat.init({
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true}
  }, {
    sequelize,
    modelName: 'TujuanSurat',
  });
  return TujuanSurat;
};