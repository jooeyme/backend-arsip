const { User } = require('../models');
const bcrypt = require('bcrypt');	
const jwt = require('jsonwebtoken');
require("dotenv").config();

module.exports = {
    CreateUser: async(req, res) => {
        try{
            const {
                name,
                email,
                password,
                confirmPassword,
                role // ["super_admin","administrasi", "KTU", "Kadep", "sekdep"]
            } = req.body;

            if(password !== confirmPassword) {
                return res.status(400).json({
                    msg: "Password dan Confirm Password tidak cocok"
                });
            }
        
            const hashPassword = await bcrypt.hash(password, 10);
    
            const newUser = await User.create({
                name: name,
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
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }); // Set expiry time
                
            res.status(200).json({token, role: user.role, id:user.id});
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