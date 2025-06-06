'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User,
        { 
          foreignKey: 'reviewerId', 
          as: 'reviewer',
        }
      );

      this.belongsTo(models.SuratKeluar, {
        foreignKey: "suratId",
        as: 'suratKeluar'
      })
    }
  }
  Review.init({
    suratId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    komentar: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Review',
  });
  return Review;
};