// migrate-departments.js
// Run this script once to migrate existing data to the new Product/Department system
// Usage: node migrate-departments.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/connectDB.js';
import Product from './models/product.model.js';
import Department from './models/department.model.js';
import User from './models/user.model.js';
import Ticket from './models/ticket.model.js';

dotenv.config();

const LEGACY_DEPARTMENTS = ['IT', 'DevOps', 'Software', 'Networking', 'Cybersecurity', 'Other'];

async function migrate() {
    try {
        await connectDB();
        console.log('Connected to database');

        // Step 1: Find or create a super-admin user to be the creator
        let superAdmin = await User.findOne({ role: 'super-admin' });
        if (!superAdmin) {
            console.log('No super-admin found, creating migration admin...');
            superAdmin = await User.create({
                name: 'Migration Admin',
                email: 'migration@system.internal',
                role: 'super-admin',
            });
        }
        console.log(`Using admin: ${superAdmin.name} (${superAdmin._id})`);

        // Step 2: Create a default Product
        let defaultProduct = await Product.findOne({ name: 'Default Product' });
        if (!defaultProduct) {
            defaultProduct = await Product.create({
                name: 'Default Product',
                description: 'Auto-created product for migrated departments',
                createdBy: superAdmin._id,
            });
            console.log(`Created default product: ${defaultProduct._id}`);
        } else {
            console.log(`Using existing default product: ${defaultProduct._id}`);
        }

        // Step 3: Create Departments from legacy enum values
        const departmentMap = {}; // legacyName -> _id

        for (const legacyName of LEGACY_DEPARTMENTS) {
            let dept = await Department.findOne({ name: legacyName, product: defaultProduct._id });
            if (!dept) {
                dept = await Department.create({
                    name: legacyName,
                    product: defaultProduct._id,
                    description: `Migrated from legacy department: ${legacyName}`,
                    members: [],
                });
                console.log(`Created department: ${legacyName} (${dept._id})`);
            } else {
                console.log(`Department already exists: ${legacyName} (${dept._id})`);
            }
            departmentMap[legacyName] = dept._id;
        }

        // Step 4: Migrate Users - add them to corresponding departments
        const users = await User.find({ department: { $in: LEGACY_DEPARTMENTS } });
        console.log(`Found ${users.length} users with legacy departments`);

        for (const user of users) {
            const deptId = departmentMap[user.department];
            if (deptId) {
                // Add to departments array if not already there
                if (!user.departments.includes(deptId)) {
                    user.departments.push(deptId);
                    await user.save();
                }

                // Add to department members if not already there
                const dept = await Department.findById(deptId);
                if (dept && !dept.members.includes(user._id)) {
                    dept.members.push(user._id);
                    await dept.save();
                }
            }
        }
        console.log('Users migrated successfully');

        // Step 5: Migrate Tickets - set departmentRef
        const tickets = await Ticket.find({
            department: { $in: LEGACY_DEPARTMENTS },
            departmentRef: { $exists: false }
        });
        console.log(`Found ${tickets.length} tickets to migrate`);

        for (const ticket of tickets) {
            const deptId = departmentMap[ticket.department];
            try{
                if (deptId) {
                    ticket.departmentRef = deptId;
                    await ticket.save();
                }
            }catch(error){
                console.log(ticket)
            }
        }
        console.log('Tickets migrated successfully');

        console.log('\n✅ Migration completed successfully!');
        console.log('\nSummary:');
        console.log(`- Default Product: ${defaultProduct.name} (${defaultProduct._id})`);
        console.log(`- Departments created: ${Object.keys(departmentMap).length}`);
        console.log(`- Users updated: ${users.length}`);
        console.log(`- Tickets updated: ${tickets.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
