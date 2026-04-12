
import mongoose from "mongoose";
import Department from "./server/api/models/department.model.js";
import Product from "./server/api/models/product.model.js";
import User from "./server/api/models/user.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const auditUsers = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB...");

        const users = await User.find({})
            .populate('departments', 'name')
            .populate('products', 'name');

        console.log(`\nTotal Users: ${users.length}`);

        const deptCounts = {};
        const prodCounts = {};
        const combinedCounts = {};

        users.forEach(u => {
            // Count by Department
            const depts = u.departments.map(d => d.name);
            if (depts.length === 0 && u.department) depts.push(u.department); // Fallback to legacy
            
            depts.forEach(d => {
                deptCounts[d] = (deptCounts[d] || 0) + 1;
            });

            // Count by Product
            const prods = u.products.map(p => p.name);
            prods.forEach(p => {
                prodCounts[p] = (prodCounts[p] || 0) + 1;
            });

            // Count Combined
            depts.forEach(d => {
                if (prods.length > 0) {
                    prods.forEach(p => {
                        const key = `${d} | ${p}`;
                        combinedCounts[key] = (combinedCounts[key] || 0) + 1;
                    });
                } else {
                    const key = `${d} | No Product`;
                    combinedCounts[key] = (combinedCounts[key] || 0) + 1;
                }
            });
        });

        console.log("\n📊 Users by Department:");
        console.table(deptCounts);

        console.log("\n📦 Users by Product:");
        console.table(prodCounts);

        console.log("\n🔗 Users by Department + Product:");
        console.table(combinedCounts);

        console.log("\n📋 Detailed User List:");
        users.forEach(u => {
            const dNames = u.departments.map(d => d.name).join(", ") || u.department || "N/A";
            const pNames = u.products.map(p => p.name).join(", ") || "N/A";
            console.log(`- ${u.name} (${u.email}) \n  Departments: [${dNames}] \n  Products: [${pNames}]`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

auditUsers();
