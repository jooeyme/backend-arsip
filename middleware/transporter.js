require("dotenv").config();
const nodemailer = require('nodemailer');

const email = process.env.EMAIL_transporter;
const password = process.env.PASSWORD_transporter;


const transporter = async (req, res, next) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email, 
                pass: password, 
            },
        });

        req.transporter = transporter; // Menyimpan transporter ke dalam req
        next(); // Melanjutkan ke middleware atau handler berikutnya
    } catch (error) {
        console.error('Error creating transporter:', error.message);
        res.status(500).json({
            message: 'Failed to initialize email transporter',
            error: error.message,
        });
    }
};

module.exports = {transporter}