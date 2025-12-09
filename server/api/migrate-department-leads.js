/**
 * Migration script to populate lead field in departments
 * Run with: node migrate-department-leads.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const departmentsCollection = db.collection('departments');
        const usersCollection = db.collection('users');

        // Get all departments
        const departments = await departmentsCollection.find({}).toArray();
        console.log(`Found ${departments.length} departments to update`);

        for (const dept of departments) {
            // Check if lead is already set
            if (dept.lead) {
                console.log(`Department "${dept.name}" already has a lead, skipping...`);
                continue;
            }

            // If department has members, find first employee member as lead
            if (dept.members && dept.members.length > 0) {
                // Find first member who is an employee
                let leadId = null;
                for (const memberId of dept.members) {
                    const member = await usersCollection.findOne({ _id: memberId, role: 'employee' });
                    if (member) {
                        leadId = memberId;
                        break;
                    }
                }

                if (leadId) {
                    await departmentsCollection.updateOne(
                        { _id: dept._id },
                        { $set: { lead: leadId } }
                    );
                    console.log(`Set lead for "${dept.name}" to employee member: ${leadId}`);
                } else {
                    console.log(`No employee members found for "${dept.name}", looking for any employee...`);
                    // Find any employee user to set as lead
                    const employee = await usersCollection.findOne({ role: 'employee' });
                    if (employee) {
                        await departmentsCollection.updateOne(
                            { _id: dept._id },
                            { $set: { lead: employee._id } }
                        );
                        console.log(`Set lead for "${dept.name}" to employee: ${employee.email}`);
                    } else {
                        console.log(`No employees found for "${dept.name}"`);
                    }
                }
            } else {
                // Find any employee user to set as lead
                const employee = await usersCollection.findOne({ role: 'employee' });

                if (employee) {
                    await departmentsCollection.updateOne(
                        { _id: dept._id },
                        { $set: { lead: employee._id } }
                    );
                    console.log(`Set lead for "${dept.name}" to employee: ${employee.email}`);
                } else {
                    console.log(`No employees available for "${dept.name}"`);
                }
            }
        }

        console.log('\nMigration complete!');

        // Show updated departments
        const updated = await departmentsCollection.find({}).toArray();
        console.log('\n=== Updated Departments ===');
        for (const d of updated) {
            const leadUser = d.lead ? await usersCollection.findOne({ _id: d.lead }) : null;
            console.log(`${d.name}: Lead = ${leadUser ? leadUser.email : 'None'}`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

migrate();
