import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/connectDB.js";
import Counter from "../models/counter.model.js";
import Ticket from "../models/ticket.model.js";

dotenv.config();

const migrate = async () => {
    try {
        await connectDB();
        console.log("Connected to DB.");

        // 1. Fix Statuses for Assigned Tickets
        console.log("Checking for assigned tickets with incorrect status...");
        const ticketsToFix = await Ticket.find({
            assignedTo: { $ne: null },
            $or: [
                { status: "open" },
                { accepted: false }
            ]
        });

        console.log(`Found ${ticketsToFix.length} tickets to fix status.`);
        for (const ticket of ticketsToFix) {
            ticket.status = "in-progress";
            ticket.accepted = true;
            await ticket.save();
            console.log(`Axed status for ticket ${ticket._id}`);
        }

        // 2. Rewrite Ticket IDs to Sequential Numbers
        console.log("Rewriting Ticket IDs...");
        // Get all tickets sorted by createdAt
        const allTickets = await Ticket.find().sort({ createdAt: 1 });
        
        let currentSeq = 0;
        for (const ticket of allTickets) {
            currentSeq++;
            const oldId = ticket.ticketId;
            const newId = currentSeq.toString(); // Just the number as string: "1", "2"
            
            // Using updateOne to avoid validation issues if any unique constraint is temporarily violated (though unique is on ticketId)
            // But we are processing in order, so "1" shouldn't exist ideally. 
            // Warning: If "1" already exists as a UUID (unlikely), it might clash if we weren't careful.
            // UUIDs usually don't look like "1".
            
            await Ticket.updateOne({ _id: ticket._id }, { ticketId: newId });
            console.log(`Rewrote ${oldId} -> ${newId}`);
        }

        // 3. Initialize Counter
        await Counter.findByIdAndUpdate(
            { _id: "ticketId" },
            { seq: currentSeq },
            { upsert: true, new: true }
        );
        console.log(`Counter initialized to ${currentSeq}`);

        console.log("Migration complete.");
        process.exit(0);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
