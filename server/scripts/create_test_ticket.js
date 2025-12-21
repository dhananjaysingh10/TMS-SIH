
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

import Department from '../api/models/department.model.js';
import Ticket from '../api/models/ticket.model.js';
import User from '../api/models/user.model.js';

const createTestTicket = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected DB");

        // Get a department
        const dept = await Department.findOne({}).populate('lead');
        if (!dept) throw new Error("No department found");

        const ticket = await Ticket.create({
            title: "Worker Test Ticket " + Date.now(),
            description: "Testing auto assignment worker",
            department: dept.name,
            departmentRef: dept._id,
            status: "open",
            priority: "medium",
            type: "task",
            createdBy: (await User.findOne())._id,
            ticketId: "TEST-" + Date.now(),
            accepted: false
        });

        console.log(`✅ Created Ticket: ${ticket.ticketId} (${ticket.title})`);
        console.log("Worker should pick this up in ~30s...");
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

createTestTicket();
