
import mongoose from "mongoose";
import User from "./server/api/models/user.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const inspectUsers = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB...");

        const users = await User.find({});
        console.log("\n👥 Current Users & Departments:");
        users.forEach(u => {
            console.log(`- [${u.role}] ${u.name} (${u.email}) | Dept: "${u.department}"`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

inspectUsers();
