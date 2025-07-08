// services/generateNoSuratKeluar.js
const { SuratKeluar, SuratMasuk } = require('../models');
const { Op } = require('sequelize');

function toRoman(num) {
  if (num <= 0 || num >= 4000) {
    throw new Error('toRoman only supports integers 1-3999');
  }
  const romans = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  const ints   = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  let res = '';
  for (let i = 0; i < ints.length; i++) {
    while (num >= ints[i]) {
      res += romans[i];
      num -= ints[i];
    }
  }
  return res;
}
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

async function generateNoSuratMasuk(kodeSurat) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const roman = toRoman(month);

  const last = await SuratMasuk.findOne({
    where: {
      no_agenda_masuk: { 
        [Op.and]: [
          { [Op.like]: '___/%' },              // akhiran tahun
                 // prefix 3 angka + slash
        ]
       }
    },
    order: [['createdAt', 'DESC']]
  });

  let nextNum = 1;
  if (last) {
    const lastPrefix = parseInt(last.no_agenda_masuk.split('/')[0], 10);
    if (!isNaN(lastPrefix)) nextNum = lastPrefix + 1;
  }
  const prefix = String(nextNum).padStart(3, '0'); 
  return `${prefix}/${kodeSurat}/${roman}/${year}`;
}

module.exports = { generateNoSuratKeluar, generateNoSuratMasuk };
