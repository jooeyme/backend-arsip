'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SuratKeluars', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      no_agenda_keluar: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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
      ditujukan: {
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
    await queryInterface.dropTable('SuratKeluars');
  }
};