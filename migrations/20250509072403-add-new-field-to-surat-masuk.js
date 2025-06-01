'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("SuratMasuks", "sifat", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("SuratMasuks", "lampiran", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("SuratMasuks", "jenis", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("SuratMasuks", "penerima", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn("SuratMasuks", "tembusan", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("SuratMasuks", "no_folder", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("SuratMasuks", "sifat");
    await queryInterface.removeColumn("SuratMasuks", "lampiran");
    await queryInterface.removeColumn("SuratMasuks", "jenis");
    await queryInterface.removeColumn("SuratMasuks", "penerima");
    await queryInterface.removeColumn("SuratMasuks", "tembusan");
    await queryInterface.removeColumn("SuratMasuks", "no_folder");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
