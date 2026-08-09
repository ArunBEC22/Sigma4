/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const createAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to database');

        // Admin credentials
        const adminData = {
            username: 'admin',
            email: 'admin@wanderlust.com',
            role: 'admin'
        };
        const password = 'admin123'; // Change this to a secure password

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: adminData.username });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Username:', existingAdmin.username);
            console.log('Email:', existingAdmin.email);
            console.log('Role:', existingAdmin.role);
            
            // Update role if not admin
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('✓ Updated existing user to admin role');
            }
        } else {
            // Create new admin user
            const admin = new User({
                username: adminData.username,
                email: adminData.email,
                role: adminData.role
            });

            await User.register(admin, password);
            console.log('✓ Admin user created successfully!');
            console.log('\nAdmin Credentials:');
            console.log('Username:', adminData.username);
            console.log('Password:', password);
            console.log('Email:', adminData.email);
            console.log('\nLogin at: http://localhost:3000/admin/login');
        }

        // Close connection
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

// Run the script
createAdmin();

// Made with Bob
