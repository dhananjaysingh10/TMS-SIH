
import mongoose from "mongoose";
import Department from "./server/api/models/department.model.js";
import Product from "./server/api/models/product.model.js";
import Ticket from "./server/api/models/ticket.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const inspect = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB...");

        // 1. Check Departments and Products collections
        const deptCount = await Department.countDocuments();
        const prodCount = await Product.countDocuments();
        console.log(`\n📊 DB CTS: Departments=${deptCount}, Products=${prodCount}`);
        
        const products = await Product.find({});
        console.log("Products in DB:", JSON.stringify(products, null, 2));

        // 2. Dump Recent Tickets
        const tickets = await Ticket.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('departmentRef'); // Populate to see if it resolves

        console.log("\n🎫 Recent Tickets Analysis:");
        
        tickets.forEach(t => {
            console.log("------------------------------------------------");
            console.log(`ID: ${t.ticketId}`);
            console.log(`Title: ${t.title}`);
            console.log(`Department (String): "${t.department}"`);
            console.log(`DepartmentRef: ${t.departmentRef ? t.departmentRef._id : "NULL"}`);
            if (t.departmentRef) {
                 console.log(`  -> Resolved Dept Name: ${t.departmentRef.name}`);
                 console.log(`  -> Resolved Product ID: ${t.departmentRef.product}`);
            }
            // Check if there is a 'productName' field hidden in schema or strict: false?
            // Mongoose models are strict by default, but let's check _doc if possible
            console.log(`Raw Doc Keys: ${Object.keys(t._doc)}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

inspect();
