'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Disposisis", "status", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("Disposisis", "catatan_tindak_lanjut", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Disposisis", "waktu_selesai", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Disposisis", "urutan", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("Disposisis", "status");
    await queryInterface.removeColumn("Disposisis", "catatan_tindak_lanjut");
    await queryInterface.removeColumn("Disposisis", "waktu_selesai");
    await queryInterface.removeColumn("Disposisis", "urutan");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
