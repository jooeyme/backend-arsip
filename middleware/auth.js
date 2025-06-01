const { User } = require('../models');
const bcrypt = require('bcrypt');	
const jwt = require('jsonwebtoken');
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