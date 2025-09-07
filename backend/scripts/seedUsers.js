const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing users (optional - remove this if you want to keep existing users)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Check if demo users already exist
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Demo users already exist');
      return;
    }

    // Create demo users
    const demoUsers = [
      {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true,
      },
      {
        name: 'Manager User',
        email: 'manager@example.com',
        password: 'manager123',
        role: 'manager',
        isActive: true,
      },
      {
        name: 'Employee User',
        email: 'employee@example.com',
        password: 'employee123',
        role: 'employee',
        isActive: true,
      }
    ];

    // Create users
    const createdUsers = [];
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    // Set up manager-employee relationship
    const manager = createdUsers.find(u => u.role === 'manager');
    const employee = createdUsers.find(u => u.role === 'employee');
    
    if (manager && employee) {
      employee.managerId = manager._id;
      await employee.save();
      
      manager.teamMembers = [employee._id];
      await manager.save();
      
      console.log('Set up manager-employee relationship');
    }

    console.log('\nDemo users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Super Admin: admin@example.com / admin123');
    console.log('Manager: manager@example.com / manager123');
    console.log('Employee: employee@example.com / employee123');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the seed function
seedUsers();