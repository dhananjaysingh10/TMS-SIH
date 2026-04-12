
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Models (assuming paths are correct relative to project root)
import Department from "./api/models/department.model.js";
import Product from "./api/models/product.model.js";
import User from "./api/models/user.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🔥 MongoDB Connected for Seeding");
    } catch (error) {
        console.error("❌ DB Connection Error:", error);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        // 1. Get a System Admin User (Required for createdBy)
        let adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            console.log("⚠️ No admin found, using any user or creating dummy...");
            adminUser = await User.findOne({});
            if (!adminUser) {
                console.log("❌ No users found at all to set as creator. Please create a user first.");
                process.exit(1);
            }
        }
        console.log(`👤 Using User: ${adminUser.name} (${adminUser.email}) as creator`);

        const products = [
            {
                name: "e-Tendering Portal",
                description: "Platform for managing tenders, bids, and vendor registration.",
                teams: [
                    "Vendor Onboarding & Reg",
                    "PKI & Digital Signature",
                    "Tender & Bidding Support",
                    "EMD & Payment Gateway",
                    "Portal Technical Support"
                ]
            },
            {
                name: "SAP ERP System",
                description: "Enterprise Resource Planning system for internal operations.",
                teams: [
                    "SAP Security & GRC",
                    "Plant Maintenance Support",
                    "MM & Finance Support",
                    "HR ESS Portal Team",
                    "BASIS & Technical"
                ]
            }
        ];

        for (const p of products) {
            // 2. Create/Find Product
            let productDoc = await Product.findOne({ name: p.name });
            if (!productDoc) {
                productDoc = await Product.create({
                    name: p.name,
                    description: p.description,
                    createdBy: adminUser._id,
                    isActive: true
                });
                console.log(`✅ Created Product: ${p.name}`);
            } else {
                console.log(`ℹ️  Product exists: ${p.name}`);
            }

            // 3. Create Departments for this Product
            for (const teamName of p.teams) {
                const existingDept = await Department.findOne({ name: teamName, product: productDoc._id });
                if (!existingDept) {
                    await Department.create({
                        name: teamName,
                        product: productDoc._id,
                        description: `Support team for ${teamName}`,
                        keywords: [],
                        isActive: true
                    });
                    console.log(`   ├─ ✅ Created Dept: ${teamName}`);
                } else {
                    console.log(`   ├─ ℹ️  Dept exists: ${teamName}`);
                }
            }
        }

        console.log("\n🎉 Seeding Complete! AI Brain is now sync'd with Database.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

seedData();
