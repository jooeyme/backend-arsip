// controllers/reviewController.js
const { sequelize, Review, SuratKeluar } = require('../models');
const { generateNoSuratKeluar } = require('../helpers/generateNoSurat');


module.exports = {
  // Create a review for a specific SuratKeluar
    createReview: async(req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id: suratId } = req.params;
      const { status, komentar } = req.body;
      const reviewer = req.userData.id;
      const reviewerRole = req.userData.role;

      // validasi body
      if (!['approved','revisi'].includes(status)) {
        await t.rollback();
        return res.status(400).json({ message: 'Status harus "approved" atau "revisi".' });
      }
      if (status === 'revisi' && (!komentar || !komentar.trim())) {
        await t.rollback();
        return res.status(400).json({ message: 'Komentar wajib diisi untuk revisi.' });
      }

      // pastikan surat keluar ada
      const surat = await SuratKeluar.findByPk(suratId);
      if (!surat) {
        return res.status(404).json({ message: 'SuratKeluar tidak ditemukan' });
      }

      // buat review
      const review = await Review.create({
        suratId: suratId,
        reviewerId: reviewer,
        status: status,
        komentar: komentar
      }, {
        transaction: t
      });

      // Tentukan status baru berdasarkan role dan keputusan
      let newStatus;
      if (reviewerRole === 'ktu') {
        newStatus = status === 'approved'
          ? 'Dept_Review'
          : 'KTU_Revision';
      } else if (['kadep', 'sekretaris'].includes(reviewerRole)) {
        newStatus = status === 'approved'
          ? 'waiting_number'
          : 'Dept_Revision';
      } else {
        await t.rollback();
        return res.status(403).json({ message: 'Role tidak berwenang melakukan review.' });
      }

      
      await surat.update({
        status: newStatus
      },{ 
        transaction: t,
        individualHooks: true,
                context: {
                  userId: req.userData.id
                } 
      });

      await t.commit();
      return res.status(201).json({ 
        message: 'Review tersimpan', 
        data: review 
      });
    } catch (e) {
      await t.rollback();
      console.error('createReview error:', e);
      return res.status(500).json({ message: 'Gagal membuat review' });
    }
  },

  completeRevision: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id: suratId } = req.params;
      const surat = await SuratKeluar.findByPk(suratId, { transaction: t });
      if (!surat) {
        await t.rollback();
        return res.status(404).json({ message: 'SuratKeluar tidak ditemukan.' });
      }

      // Tentukan transisi
      let nextStatus;
      if (surat.status === 'KTU_Revision') {
        nextStatus = 'KTU_Review';
      } else if (surat.status === 'Dept_Revision') {
        nextStatus = 'Dept_Review';
      } else {
        await t.rollback();
        return res.status(400).json({
          message: `Tidak bisa selesaikan revisi pada status '${surat.status}'.`
        });
      }

      // Update status
      await surat.update({ status: nextStatus }, {
        transaction: t,
        individualHooks: true,
        context: { userId: req.userData.id }
      });

      await t.commit();
      return res.status(200).json({
        message: `Revisi dari '${surat.status}' selesai, status diubah ke '${nextStatus}'.`,
        data: surat
      });
    } catch (err) {
      console.error('completeRevision error', err);
      await t.rollback();
      return res.status(500).json({ message: 'Gagal menyelesaikan revisi.', error: err.message });
    }
  },

  updateReview: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { suratId, reviewId } = req.params;
      const { status, komentar } = req.body;
      const userId = req.userData.id;

      if (status === 'revisi' && (!komentar || !komentar.trim())) {
        await t.rollback();
        return res.status(400).json({
          message: 'Komentar harus diisi saat meminta revisi.'
        });
      }

      // Temukan review, pastikan milik surat ini dan reviewer yang sama
      const review = await Review.findOne({
        where: { id: reviewId, suratId, reviewerId: userId },
        transaction: t
      });
      if (!review) {
        await t.rollback();
        return res.status(404).json({ message: 'Review tidak ditemukan atau Anda bukan reviewer.' });
      }

      // Update field
      review.status   = status   ?? review.status;
      review.komentar = komentar ?? review.komentar;
      await review.save({ transaction: t });

      // Jika perlu, sinkron ke SuratKeluar lagi:
      // contoh: jika reviewer merubah ke “approved” ulang → ubah surat status
      const surat = await SuratKeluar.findByPk(suratId, { transaction: t });
      if (status === 'approved') {
        surat.status = 'waiting_for_signature';
        await surat.save({ transaction: t });
      } else if (status === 'revisi') {
        surat.status = 'revisi';
        await surat.save({ transaction: t });
      }
      // untuk status lain, tidak perlu di‐sync

      await t.commit();
      return res.json({ data: review });
    } catch (err) {
      await t.rollback();
      console.error(err);
      return res.status(500).json({ message: 'Gagal memperbarui review', err });
    }
  },

  // List all reviews for a specific SuratKeluar
   getReviewsBySuratId: async(req, res) => {
    try {
      const { id: suratId } = req.params;
      const reviews = await Review.findAll({
        where: { suratId: suratId },
        include: [{ model: require('../models').User, as: 'reviewer', attributes: ['id','nama_lengkap'] }],
        order: [['createdAt','DESC']]
      });
      return res.json({data: reviews});
    } catch (e) {
      console.error('listReviews error:', e);
      return res.status(500).json({ message: 'Gagal mengambil data review' });
    }
  },

  getReviewById: async (req, res) => {
    try {
      const { id } = req.params;
      const review = await Review.findByPk(id, {
        include: [{ model: User, as: 'reviewer', attributes: ['id','name'] }]
      });
      if (!review) {
        return res.status(404).json({ message: 'Review tidak ditemukan' });
      }
      return res.json({ data: review });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal mengambil review' });
    }
  },
};
