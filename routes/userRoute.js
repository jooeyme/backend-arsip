const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")

router.post('/new', auth.CreateUser);
router.post('/login', auth.Login)
router.get('/me', auth.authenticate, userController.getProfile);
router.get('/all', userController.getAllUser);
router.get('/allname', userController.getUserName);
router.get(`/:id`, userController.getUserById);
router.delete(`/:id`, userController.deleteUser);


module.exports = router;