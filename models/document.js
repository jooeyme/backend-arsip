'use strict';
const {
  Model
} = require('sequelize');
const { 
  logPenambahanHook, 
  logPerubahanHook, 
  logPenghapusanHook } = require('../helpers/perubahanHelper');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // define association here
      this.belongsTo(models.SuratMasuk,
        { 
          foreignKey: 'documentId', 
          constraints: false,
          as: 'suratMasuk',
          scope: {
            documentType: "SuratMasuk",
          },
        }
      );

      this.belongsTo(models.SuratKeluar,
        { 
          foreignKey: 'documentId', 
          constraints: false,
          as: 'suratKeluar',
          scope: {
            documentType: "SuratKeluar",
          },
        }
      );

    }
  }
  Document.init({
    documentType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name_doc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type_doc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path_doc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Document',
  });

  return Document;
};