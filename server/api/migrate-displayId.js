/**
 * Migration script to add displayId field to all existing tickets
 * Format: TKT000001, TKT000002, etc.
 * 
 * Run with: node migrate-displayId.js
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
        const ticketsCollection = db.collection('tickets');

        // Fetch all tickets sorted by createdAt (oldest first)
        const tickets = await ticketsCollection.find({}).sort({ createdAt: 1 }).toArray();
        console.log(`Found ${tickets.length} tickets to update`);

        let counter = 1;
        for (const ticket of tickets) {
            // Generate displayId like TKT000001, TKT000002...
            const displayId = `TKT${String(counter).padStart(6, '0')}`;

            await ticketsCollection.updateOne(
                { _id: ticket._id },
                { $set: { displayId: displayId } }
            );

            console.log(`Updated ticket ${ticket.ticketId || ticket._id} -> ${displayId}`);
            counter++;
        }

        console.log(`\nMigration complete! Updated ${tickets.length} tickets with displayId`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

migrate();
