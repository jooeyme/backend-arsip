'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("SuratKeluars", "sifat", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("SuratKeluars", "lampiran", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("SuratKeluars", "jenis", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("SuratKeluars", "tembusan", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("SuratKeluars", "no_folder", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("SuratKeluars", "sifat");
    await queryInterface.removeColumn("SuratKeluars", "lampiran");
    await queryInterface.removeColumn("SuratKeluars", "jenis");
    await queryInterface.removeColumn("SuratKeluars", "tembusan");
    await queryInterface.removeColumn("SuratKeluars", "no_folder");
    
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
