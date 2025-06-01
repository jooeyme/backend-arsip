// services/generateNoSuratKeluar.js
const { SuratKeluar, KlasifikasiSurat } = require('../models');
const { Op } = require('sequelize');

async function generateNoSuratKeluar(suratId) {
  // 1. Ambil record SuratKeluar & klasifikasi
  const surat = await SuratKeluar.findByPk(suratId);
  if (!surat) throw new Error('SuratKeluar tidak ditemukan');

  // langsung ambil kodeSurat dari bagian kedua no_surat
  const parts      = surat.no_surat.split('/'); // ["","Dept", "SK", "VI", "2025"]
  if (parts.length !== 5) {
    throw new Error(`Format no_surat tidak sesuai: "${surat.no_surat}"`);
  }

  const [, kodeDept, kodeSurat, roman, year] = parts;

  // 2. Cari nomor urut terakhir tahun ini (full-pattern)
  const pattern = `/%/${year}`;      
  const last = await SuratKeluar.findOne({
    where: {
      no_surat: { 
        [Op.and]: [
          { [Op.like]: '%/' + year },              // akhiran tahun
          { [Op.regexp]: '^[0-9]{3}\\/' }          // prefix 3 angka + slash
        ]
       }
    },
    order: [['createdAt', 'DESC']]
  });

  let nextNum = 1;
  if (last) {
    const lastPrefix = parseInt(last.no_surat.split('/')[0], 10);
    if (!isNaN(lastPrefix)) nextNum = lastPrefix + 1;
  }
  const prefix = String(nextNum).padStart(3, '0'); 
  return `${prefix}/${kodeDept}/${kodeSurat}/${roman}/${year}`;
}

module.exports = { generateNoSuratKeluar };
