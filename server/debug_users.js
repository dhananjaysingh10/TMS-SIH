
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './api/models/user.model.js';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const departmentId = "6936b33bb3b6f3ddb2ebebc3"; // SAP Security & GRC
        console.log(`Checking for users in department: ${departmentId}`);

        const allUsers = await User.find({});
        console.log(`Total users in DB: ${allUsers.length}`);

        const deptUsers = await User.find({ departments: departmentId });
        console.log(`Users with department ${departmentId}: ${deptUsers.length}`);
        
        deptUsers.forEach(u => {
            console.log(` - User: ${u.email}, Role: ${u.role}, Departments: ${u.departments}`);
        });

        const eligibleAgents = await User.find({
            departments: departmentId,
            role: { $in: ["employee", "admin", "super-admin"] }
        });
        console.log(`Eligible Agents (Employee/Admin): ${eligibleAgents.length}`);
         eligibleAgents.forEach(u => {
            console.log(` - AGENT: ${u.email}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
