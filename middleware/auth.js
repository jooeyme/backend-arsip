const { User } = require('../models');
const bcrypt = require('bcrypt');	
const jwt = require('jsonwebtoken');
const BASE_LINK = process.env.FRONTEND_URL;
require("dotenv").config();

module.exports = {
    canViewSuratMasuk: async(req, res, next) => {
        const user = req.userData;      // diasumsikan sudah di-attach oleh JWT middleware
        const id   = req.params.id;     // untuk detail
        let surat;

        try {
            // ambil surat & daftar penerimaUsers
            surat = await SuratMasuk.findByPk(id, {
            include: [{ model: User, as: 'penerimaUsers', attributes: ['id'] }]
            });
            if (!surat) return res.status(404).json({ message: 'SuratMasuk tidak ditemukan' });

            if (surat.sifat === 'rahasia') {
                const isAdmin   = user.role === 'administrasi';
                const isAllowed = surat.penerimaUsers.some(u => u.id === user.id);
                if (!isAdmin && !isAllowed) {
                    return res.status(403).json({ message: 'Akses ditolak: surat rahasia' });
                }
            }
            req.suratMasuk = surat;  // simpan untuk controller
            next();
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Error memeriksa akses' });
        }
        },

        ForgotPassword: async(req, res) => {
        const { id } = req.params;

        if(!id) {
            return res.status(440).json({message: "Invalid input email"})
        }

        const user = await User.findOne({
            where: { id: id}
        });

        if (!user) return res.status(404).json({ message: 'Email tidak ditemukan' });
        
        const email = user.email
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `${BASE_LINK}/auth/reset-password/${token}`;
    
        // Kirim email
        await req.transporter.sendMail({
            from: process.env.EMAIL_MNH,
            to: user.email,
            subject: 'Reset Password',
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                <H1>Forest Management Services</H1>
                </div>
                <p>Hello,</p>
                <p>You are receiving this email because we received a password reset request for your account.</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${resetLink}" style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>This password reset link will expire in 60 minutes.</p>
                <p>If you did not request a password reset, no further action is required.</p>
                <p>Thanks,</p>
                <p>Forest Management</p>

                <div style="background-color:azure; padding: 20px; max-width: 600px; margin: auto;">
                    <p>If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser: ${resetLink}</p>    
                </div>
            </div>
            `,
        });
    
        res.json({ message: 'Email reset password telah dikirim' });
    },

    ResetPassword: async(req, res) => {
        try {
            const { token } = req.params; 
            const { newPassword } = req.body;
            const { confirmPassword } = req.body;
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({
                where: { email: decoded.email}
            });
            if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
            
            if(newPassword !== confirmPassword) {
                return res.status(400).json({
                    msg: "Password dan Confirm Password baru tidak cocok"
                });
            }
            const passwordHashed = await bcrypt.hash(newPassword, 10);

            await User.update(
                { password: passwordHashed },
                { where: { email: decoded.email } }
            );
            res.json({ message: 'Password berhasil direset' });
        } catch (error) {
            res.status(400).json({ message: 'Token tidak valid atau telah kadaluarsa' });
        }
    },

    CreateUser: async(req, res) => {
        try{
            const {
                nama_lengkap,
                username,
                jabatan,
                email,
                password,
                confirmPassword,
                role // ["super_admin","administrasi", "KTU", "Kadep", "sekdep"]
            } = req.body;

            const user = await User.findOne({
                where: {
                    email  
                }
            });

            if (user) {
                return res.status(400).json({
                    msg: "Email sudah digunakan! coba dengan email lain."
                });
            }

            if(password !== confirmPassword) {
                return res.status(400).json({
                    msg: "Password dan Confirm Password tidak cocok"
                });
            }
        
            const hashPassword = await bcrypt.hash(password, 10);
    
            const newUser = await User.create({
                nama_lengkap: nama_lengkap,
                username: username,
                jabatan: jabatan,
                email: email,
                password: hashPassword,
                role: role
            });
            res.status(201).json({
                msg: "Register Berhasil",
                data: newUser
            });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
    },

    Login : async (req, res) =>{
        try {
            const { email, password } = req.body;
            const user = await User.findOne({
                where: {
                    email  
                }
            });
            
            if(!user) 
                return res.status(404).json({
                    msg: "User tidak ditemukan"
                });

            const match = await bcrypt.compare( password, user.password);

            if(!match) 
                return res.status(400).json({
                    msg: "Wrong Password"
                });
                // Generate JWT token with user information
                const payload = {
                    id: user.id,
                    jabatan: user.jabatan,
                    nama_lengkap: user.nama_lengkap,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }); // Set expiry time
                
            res.status(200).json({token, role: user.role, id:user.id, username: user.username});
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    },

    authenticate: async (req, res, next) => {
        const token = req.headers.authorization;
      
        if (!token) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
          req.userData = decoded;
    
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
    },
      
    
    authorize: (allowedRoles) => {
      return (req, res, next) => {
        const role = req.userData?.role;
        
        if (!role || typeof role !== 'string') {
          return res.status(400).json({ error: 'Missing role for User' });
        }    
    
        if (allowedRoles.includes(role)) {
          next();
        } else {
          return res.status(403).json({ error: 'Forbidden for this role' });
        }
      };
    },

}