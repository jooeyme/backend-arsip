const express = require("express");
const router = express.Router();
const reviewController = require('../controllers/reviewController')
const auth = require('../middleware/auth');

// endpoint create review
router.post(
  '/reviews/:id',
  auth.authenticate,
  reviewController.createReview
);

// endpoint list reviews
router.get(
  '/:id/reviews',
  auth.authenticate,
  reviewController.getReviewsBySuratId
);

router.put('/complete/:id', auth.authenticate, reviewController.completeRevision)

router.patch('/:suratId/reviews/:reviewId', 
  auth.authenticate,
  reviewController.updateReview);

  
module.exports = router;