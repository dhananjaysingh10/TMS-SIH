
import dotenv from "dotenv";
import mongoose from "mongoose";
import Department from "./api/models/department.model.js";
import Product from "./api/models/product.model.js";
import User from "./api/models/user.model.js";

// Load env explicitly if needed, or rely on process.env from command line
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const auditUsers = async () => {
    try {
        console.log("Connecting to DB at:", MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB...");

        const users = await User.find({})
            .populate('departments', 'name')
            .populate('products', 'name');

        console.log(`\nTotal Users: ${users.length}`);

        const deptCounts = {};
        const prodCounts = {};
        const combinedCounts = {};

        // Helper to normalize department names
        const normalize = (s) => s ? s.trim() : "Unknown";

        for (const u of users) {
             let userDepts = [];
             
             // Check new array structure
             if (u.departments && u.departments.length > 0) {
                 userDepts = u.departments.map(d => d.name);
             } 
             
             // Fallback to legacy string
             if (userDepts.length === 0 && u.department) {
                 userDepts.push(u.department);
             }

             if (userDepts.length === 0) userDepts.push("Unassigned");

             let userProds = [];
             if (u.products && u.products.length > 0) {
                 userProds = u.products.map(p => p.name);
             }

             // Count Departments
             userDepts.forEach(d => {
                 deptCounts[d] = (deptCounts[d] || 0) + 1;
             });

             // Count Products
             userProds.forEach(p => {
                 prodCounts[p] = (prodCounts[p] || 0) + 1;
             });

             // Combined
             userDepts.forEach(d => {
                 if (userProds.length > 0) {
                     userProds.forEach(p => {
                         const key = `[${d}] - [${p}]`;
                         combinedCounts[key] = (combinedCounts[key] || 0) + 1;
                     });
                 } else {
                     const key = `[${d}] - [No Product]`;
                     combinedCounts[key] = (combinedCounts[key] || 0) + 1;
                 }
             });
        }

        console.log("\n📊 HEADCOUNT BY DEPARTMENT:");
        console.table(Object.entries(deptCounts).map(([Department, Count]) => ({ Department, Count })));

        console.log("\n📦 HEADCOUNT BY PRODUCT:");
        console.table(Object.entries(prodCounts).map(([Product, Count]) => ({ Product, Count })));

        console.log("\n🔗 HEADCOUNT BY TEAM ASSIGNMENT:");
        console.table(Object.entries(combinedCounts).map(([Assignment, Count]) => ({ Assignment, Count })));

        process.exit(0);
    } catch (e) {
        console.error("Audit Error:", e);
        process.exit(1);
    }
};

auditUsers();
