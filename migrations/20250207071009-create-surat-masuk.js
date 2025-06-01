'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SuratMasuks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      no_agenda_masuk: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      tgl_terima: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      no_surat: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      tgl_surat: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      perihal: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      asal_surat: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      keterangan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SuratMasuks');
  }
};