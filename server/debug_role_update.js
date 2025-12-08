import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './api/models/user.model.js';

dotenv.config();

const debugRoleUpdate = async () => {
  try {
    await mongoose.connect('mongodb+srv://huterabaap522_db_user:di11MQSx9e3PWr0a@cluster0.sx2gjvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("Connected to MongoDB");

    // Create a temporary user
    const tempEmail = `test_role_${Date.now()}@example.com`;
    const newUser = new User({
        name: "Test Role User",
        email: tempEmail,
        password: "password123",
        role: "user"
    });
    await newUser.save();
    console.log(`Created temp user: ${newUser._id} with role: ${newUser.role}`);

    // Attempt to update to 'employee'
    console.log("Attempting to update role to 'employee'...");
    newUser.role = "employee";
    await newUser.save();
    console.log(`SUCCESS: User role updated to: ${newUser.role}`);

    // Verify persistence
    const fetchedUser = await User.findById(newUser._id);
    console.log(`Fetched role verify: ${fetchedUser.role}`);

    // Clean up
    await User.findByIdAndDelete(newUser._id);
    console.log("Cleaned up temp user.");

    process.exit(0);
  } catch (error) {
    console.error("FAILURE: Error updating role:", error.message);
    process.exit(1);
  }
};

debugRoleUpdate();
