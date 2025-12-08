import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './api/models/ticket.model.js';

dotenv.config();

const debugLastHour = async () => {
  try {
    await mongoose.connect('mongodb+srv://huterabaap522_db_user:di11MQSx9e3PWr0a@cluster0.sx2gjvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("Connected to MongoDB");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    console.log(`Searching for actions since: ${oneHourAgo.toISOString()}`);

    // Fetch all tickets to inspect locally
    const tickets = await Ticket.find({ 
        status: { $in: ['resolved', 'in-progress'] }
    });

    console.log(`Scanning ${tickets.length} tickets...`);

    let resolutionDurations = [];
    let acceptanceDurations = [];

    tickets.forEach(t => {
        // Log Sorting Check
        // t.progress usually comes as [Oldest ... Newest] in JS if standard array?
        // Wait, Mongoose arrays might be popped differently?
        // Let's print the raw order of one ticket
        
        const logs = t.progress;
        if (!logs || logs.length === 0) return;

        // Creation is usually the first pushed log?
        // Debug script earlier showed [Resolved (new), Accepted, Created (old)] order.
        // So index 0 = Newest.
        // Index -1 = Oldest.
        
        // Find Resolution in Last Hour
        const resolvedLog = logs.find(l => l.description === "Ticket Resolved" && l.timestamp <= oneHourAgo);
        // console.log(resolvedLog);
        
        
        if (resolvedLog) {
            // Found a recent resolution
            // Calculate duration using Oldest log (Last element)
            const creationLog = logs[logs.length - 1]; // This is -1 in Mongo aggregation
            
            const durationMs = new Date(resolvedLog.timestamp) - new Date(creationLog.timestamp);
            const durationHrs = durationMs / (1000 * 60 * 60);
            
            console.log(durationMs);
            console.log(durationHrs);
            
            console.log(`[Resolution] Ticket ${t.ticketId}:`);
            console.log(`  Resolved At: ${resolvedLog.timestamp}`);
            console.log(`  Created At:  ${creationLog.timestamp}`);
            console.log(`  Duration:    ${durationHrs.toFixed(2)}h`);
            resolutionDurations.push(durationHrs);
        }

        // Find Acceptance in Last Hour
        const acceptedLog = logs.find(l => l.description === "Employee accepted ticket" && l.timestamp <= oneHourAgo);
        
        if (acceptedLog) {
             const creationLog = logs[logs.length - 1];
             const durationMs = new Date(acceptedLog.timestamp) - new Date(creationLog.timestamp);
             const durationHrs = durationMs / (1000 * 60 * 60);
             
             console.log(`[Acceptance] Ticket ${t.ticketId}:`);
             console.log(`  Accepted At: ${acceptedLog.timestamp}`);
             console.log(`  Created At:  ${creationLog.timestamp}`);
             console.log(`  Duration:    ${durationHrs.toFixed(2)}h`);
             acceptanceDurations.push(durationHrs);
        }
    });

    const avgRes = resolutionDurations.length > 0 ? resolutionDurations.reduce((a,b)=>a+b,0)/resolutionDurations.length : 0;
    const avgAcc = acceptanceDurations.length > 0 ? acceptanceDurations.reduce((a,b)=>a+b,0)/acceptanceDurations.length : 0;

    console.log(`\nAverage Resolution Time (Last 1h): ${avgRes.toFixed(2)}h`);
    console.log(`Average Acceptance Time (Last 1h): ${avgAcc.toFixed(2)}h`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

debugLastHour();
