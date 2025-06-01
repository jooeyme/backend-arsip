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
      documentType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      documentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name_doc: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type_doc: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      path_doc: {
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
    await queryInterface.dropTable('Documents');
  }
};