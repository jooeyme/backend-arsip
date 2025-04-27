'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.SuratMasuk,
        { 
          foreignKey: 'no_agenda_masuk', 
          targetKey: 'no_agenda_masuk',
        }
      );

      this.belongsTo(models.SuratKeluar,
        { 
          foreignKey: 'no_agenda_keluar', 
          targetKey: 'no_agenda_keluar'
        }
      );

    }
  }
  Document.init({
    no_agenda_masuk: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    no_agenda_keluar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name_doc: DataTypes.STRING,
    type_doc: DataTypes.STRING,
    path_doc: DataTypes.STRING,
    Log_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Document',
  });
  return Document;
};