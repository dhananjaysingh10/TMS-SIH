import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './api/models/ticket.model.js';

dotenv.config();


const debugResolution = async () => {
    try {
        await mongoose.connect('mongodb+srv://huterabaap522_db_user:di11MQSx9e3PWr0a@cluster0.sx2gjvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log("Connected to MongoDB");

    // Find a few resolved/closed tickets
    const tickets = await Ticket.find({ 
      status: { $in: ['resolved', 'closed'] } 
    }).limit(5).select('ticketId status progress createdAt updatedAt');

    console.log(`Found ${tickets.length} resolved/closed tickets.`);

    tickets.forEach(t => {
      console.log(`\nTicket: ${t.ticketId} [${t.status}]`);
      console.log(`Created: ${t.createdAt}, Updated: ${t.updatedAt}`);
      console.log("Progress Logs:");
      if (t.progress && t.progress.length > 0) {
        t.progress.forEach(p => {
            console.log(` - [${p.timestamp}] "${p.description}"`);
        });
        
        // Emulate the aggregation logic check
        const firstLog = t.progress[0];
        const lastResolved = t.progress.filter(p => p.description === "Ticket Resolved").pop();
        
        if (firstLog && lastResolved) {
             const duration = new Date(lastResolved.timestamp) - new Date(firstLog.timestamp);
             const hours = duration / (1000 * 60 * 60);
             console.log(` >> CALCULATED MATCH: ${hours.toFixed(2)} hours`);
        } else {
             console.log(` >> NO MATCH: FirstLog=${!!firstLog}, LastResolved=${!!lastResolved} (found: ${t.progress.filter(p => p.description === "Ticket Resolved").length})`);
        }

      } else {
        console.log(" - No progress logs.");
      }
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

debugResolution();
