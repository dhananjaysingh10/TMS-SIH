/**
 * Migration script to assign products to existing users based on their departments
 * Run with: node migrate-user-products.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Define schemas inline to avoid import issues
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
});

const departmentSchema = new mongoose.Schema({
    name: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);

async function migrateUserProducts() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tms';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Get all users with departments
        const users = await User.find({ departments: { $exists: true, $not: { $size: 0 } } });
        console.log(`Found ${users.length} users with departments`);

        let updated = 0;
        let skipped = 0;

        for (const user of users) {
            const productIds = new Set();

            // Get all departments for this user
            for (const deptId of user.departments) {
                const dept = await Department.findById(deptId);
                if (dept && dept.product) {
                    productIds.add(dept.product.toString());
                }
            }

            if (productIds.size > 0) {
                const productArray = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));

                // Check if user already has these products
                const existingProducts = new Set(user.products?.map(p => p.toString()) || []);
                const newProducts = productArray.filter(p => !existingProducts.has(p.toString()));

                if (newProducts.length > 0) {
                    await User.updateOne(
                        { _id: user._id },
                        { $addToSet: { products: { $each: productArray } } }
                    );
                    console.log(`Updated user ${user.email}: added ${newProducts.length} products`);
                    updated++;
                } else {
                    console.log(`Skipped user ${user.email}: already has all products`);
                    skipped++;
                }
            } else {
                console.log(`Skipped user ${user.email}: no valid departments with products`);
                skipped++;
            }
        }

        console.log('\n--- Migration Complete ---');
        console.log(`Updated: ${updated} users`);
        console.log(`Skipped: ${skipped} users`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateUserProducts();
