'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Documents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      no_agenda_masuk: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      no_agenda_keluar: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      name_doc: {
        type: Sequelize.STRING
      },
      type_doc: {
        type: Sequelize.STRING
      },
      path_doc: {
        type: Sequelize.STRING
      },
      Log_id: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('Documents');
  }
};