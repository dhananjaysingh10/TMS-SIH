
import dotenv from "dotenv";
import mongoose from "mongoose";
import Department from "./api/models/department.model.js";
import Product from "./api/models/product.model.js";
import User from "./api/models/user.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🔥 MongoDB Connected for Seeding General Depts");
    } catch (error) {
        console.error("❌ DB Connection Error:", error);
        process.exit(1);
    }
};

const seedGeneralData = async () => {
    await connectDB();

    try {
        // 1. Get a System Admin User (Required for createdBy)
        let adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            console.log("⚠️ No admin found, using any user...");
            adminUser = await User.findOne({});
            if (!adminUser) {
                console.log("❌ No users found. Please create a user first.");
                process.exit(1);
            }
        }

        const generalProductData = {
            name: "General Inquiry",
            description: "For general tickets not specific to a product.",
            isActive: true,
            createdBy: adminUser._id
        };

        // 2. Create/Find "General Inquiry" Product
        let productDoc = await Product.findOne({ name: generalProductData.name });
        if (!productDoc) {
            productDoc = await Product.create(generalProductData);
            console.log(`✅ Created Product: ${generalProductData.name}`);
        } else {
            console.log(`ℹ️  Product exists: ${generalProductData.name}`);
        }

        const generalTeams = [
            "IT",
            "HR",
            "Finance",
            "Legal",
            "Operations",
            "Cybersecurity", 
            "Software",
            "DevOps",
            "Networking",
            "Other" 
        ];

        // 3. Create Departments for "General Inquiry"
        for (const teamName of generalTeams) {
            const existingDept = await Department.findOne({ name: teamName, product: productDoc._id });
            if (!existingDept) {
                await Department.create({
                    name: teamName,
                    product: productDoc._id,
                    description: `General support team for ${teamName}`,
                    keywords: [],
                    isActive: true
                });
                console.log(`   ├─ ✅ Created Dept: ${teamName}`);
            } else {
                console.log(`   ├─ ℹ️  Dept exists: ${teamName} linked to General`);
            }
        }

        console.log("\n🎉 General Seeding Complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

seedGeneralData();
