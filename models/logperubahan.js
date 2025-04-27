'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LogPerubahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User,
        { foreignKey: 'userId' }
      )
    }
  }
  LogPerubahan.init({
    suratId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    jenisSurat: {
      type: DataTypes.ENUM('masuk', 'keluar'),
      allowNull: false
    },
    perubahan: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    keterangan: {
      type: DataTypes.STRING
    }},  {
      sequelize,
      modelName: 'LogPerubahan',
    });
    return LogPerubahan;
};