'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Recipients', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      suratMasukId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'SuratMasuks', key: 'id' },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
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

    await queryInterface.addConstraint('Recipients', {
      fields: ['suratMasukId','userId'],
      type: 'unique',
      name: 'ux_suratmasuk_user'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Recipients');
  }
};