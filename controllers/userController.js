const { where } = require("sequelize");
const { User } = require("../models");


module.exports = {
    // createUser: async(req, res) => {
    //     try {
    //         const {
    //             name,
    //             email,
    //             password,
    //             role
    //         } = req.body;

    //         const result = await User.create({
    //             name: name,
    //             email: email,
    //             password: password,
    //             role: role
    //         });

    //         res.status(200).json({
    //             message: "User created successfully",
    //             data: result
    //         });
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({
    //             message: "User creation failed",
    //         });
    //     }
    // },

    getProfile: async (req, res) => {
    try {
        // Pastikan middleware auth sudah menyetel req.userData
        const userId = req.userData?.id;
        if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
        }

        // Ambil data user terkini dari DB
        const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'nama_lengkap', 'jabatan', 'email', 'role']  // sesuaikan atribut
        });

        if (!user) {
        return res.status(404).json({ message: 'User not found' });
        }

        // Kirimkan profil
        return res.status(200).json({
        message: 'Profile fetched successfully',
        data: user
        });
    } catch (error) {
        console.error('getProfile error:', error);
        return res.status(500).json({
        message: 'Failed to fetch profile'
        });
    }
    },

    getAllUser: async(req, res) => {
        try {
            const result = await User.findAll();

            res.status(200).json({
                message: "Successfully get all users",
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Error getting all users"
            });
        }
    },

    getUserName: async(req, res) => {
        try {
            const result = await User.findAll({
                attributes: [ "id","nama_lengkap", "username"],
            });

            res.status(200).json({
                message: "Successfully get all users",
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Error getting all users"
            });
        }
    },

    getUserById: async(req, res) => {
        try {
            const { id } = req.params;

            const result = await User.findOne({
                where: {
                    id: id
                },
            });

            if (!result) {	
                return res.status(404).json({
                    message: `User with id ${id} not found`, 
                })
            };

            res.status(200).json({
                message: `Successfully get user with id ${id}`,
                data: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Error getting user with id ${id}`
            })
        }
    },

    updateUser: async(req, res) => {

    },

    deleteUser: async(req, res) => {
        try {
            const { id } = req.params;

            const user = await User.findOne({
                where: {
                    id: id,
                }
            });

            if (!user) {
                return res.status(404).json({
                    message: `User with id ${id} not found` 
                });
            } else {
                await User.destroy({
                    where: {
                        id: user.id
                    }
                });

                res.status(200).json({
                    message: `Successfully deleted user with id ${user.id}`
                })
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: `Failed to delete user`
            })
        }

    }

}