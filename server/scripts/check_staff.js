
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Department from '../api/models/department.model.js';
import User from '../api/models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const checkStaff = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const deptName = "PKI & Digital Signature";
        const dept = await Department.findOne({ name: deptName });

        if (!dept) {
            console.log(`Department '${deptName}' not found.`);
            // List all departments to help debug
            const allDepts = await Department.find({});
            console.log("Available Departments:", allDepts.map(d => d.name));
            return;
        }

        console.log(`Found Department: ${dept.name} (${dept._id})`);

        const agents = await User.find({
            departments: dept._id,
            role: { $in: ["employee", "admin", "super-admin"] }
        });

        console.log(`\nTotal Agents in '${deptName}': ${agents.length}`);
        if (agents.length > 0) {
            console.log("Agents:");
            agents.forEach(a => console.log(`- ${a.name} (${a.email}) [${a.role}]`));
        } else {
            console.log("No agents found in this department.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

checkStaff();
