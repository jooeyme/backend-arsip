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
        type: Sequelize.DATE
      },
      no_surat: {
        type: Sequelize.STRING
      },
      tgl_surat: {
        type: Sequelize.DATE
      },
      perihal: {
        type: Sequelize.STRING
      },
      asal_surat: {
        type: Sequelize.STRING
      },
      keterangan: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
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