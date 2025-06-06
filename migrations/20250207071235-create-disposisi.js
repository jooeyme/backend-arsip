'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Disposisis', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      no_agenda: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type_surat: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tindakan: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dibuat: {
        type: Sequelize.STRING,
        allowNull: false
      },
      diteruskan: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ket_disposisi: {
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
    await queryInterface.dropTable('Disposisis');
  }
};