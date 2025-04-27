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
        type: Sequelize.STRING
      },
      type_surat: {
        type: Sequelize.STRING
      },
      tindakan: {
        type: Sequelize.STRING
      },
      diteruskan: {
        type: Sequelize.STRING
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