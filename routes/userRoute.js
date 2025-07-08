const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")
const {transporter} = require("../middleware/transporter")

router.post('/new', auth.CreateUser);
router.post('/login', auth.Login)
router.get('/me', auth.authenticate, userController.getProfile);
router.get('/all', userController.getAllUser);
router.get('/allname', userController.getUserName);
router.get(`/:id`, userController.getUserById);
router.put('/edit/:id', userController.updateUser);
router.delete(`/delete/:id`, userController.deleteUser);
router.post('/forgot-password/:id', transporter, auth.ForgotPassword);
router.post('/reset-password', auth.ResetPassword);


module.exports = router;