
import mongoose from "mongoose";
import Ticket from "./api/models/ticket.model.js"; 
import Department from "./api/models/department.model.js";
import Product from "./api/models/product.model.js"; 
import dotenv from "dotenv";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ticketingable";

const checkTickets = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("DB Connected.");

    // Find last 5 tickets
    const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(5)
      .populate('departmentRef');
      
    console.log("\n🔍 INSPECTING RECENT TICKETS FOR PRODUCT DATA:");
    
    for (const t of tickets) {
        console.log(`\n🎫 Ticket ID: ${t.ticketId}`);
        console.log(`   Title: "${t.title}"`);
        console.log(`   Direct 'product' field: "${t.product || 'undefined'}"`); // Check if schema has it (it doesn't seems so from model file)
        console.log(`   Direct 'department' string: "${t.department}"`);
        
        if (t.departmentRef) {
            console.log(`   ✅ Linked Department: "${t.departmentRef.name}" (ID: ${t.departmentRef._id})`);
            // Now check if department has product
            // We need to fetch it fully populated if not already? 
            // departmentRef should have the product field (reference)
            // Let's manually fetch the department to be sure
            const dept = await Department.findById(t.departmentRef._id).populate('product');
            if (dept) {
                 if (dept.product) {
                     console.log(`      ↳ 📦 Department's Product: "${dept.product.name}"`);
                 } else {
                     console.log(`      ↳ ⚠️ Department's Product field is NULL/Missing!`);
                 }
            }
        } else {
            console.log(`   ❌ NO Linked DepartmentRef! (This is why UI can't show product)`);
            // Check if department name exists
            if (t.department) {
                const potential = await Department.findOne({ name: t.department });
                if (potential) {
                    console.log(`      💡 Found matching Department doc by name! ID: ${potential._id}. Link is BROKEN.`);
                } else {
                    console.log(`      ⚠️ No Department doc found with name "${t.department}".`);
                }
            }
        }
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

checkTickets();
