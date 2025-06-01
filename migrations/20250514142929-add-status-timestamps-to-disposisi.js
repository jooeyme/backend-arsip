'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Disposisis', 'waktu_dibaca',   { 
      type: Sequelize.DATE, 
      allowNull: true, 
    });
    await queryInterface.addColumn('Disposisis', 'waktu_diproses', { 
      type: Sequelize.DATE, 
      allowNull: true 
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Disposisis', 'waktu_dibaca');
    await queryInterface.removeColumn('Disposisis', 'waktu_diproses');
  }
};
