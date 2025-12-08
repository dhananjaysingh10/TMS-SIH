import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from './api/models/ticket.model.js';

dotenv.config();

const calculateStats = (tickets, rangeName, startDate) => {
    let resolutionDurations = [];
    let acceptanceDurations = [];
    let resolvedCount = 0;
    let acceptedCount = 0;

    tickets.forEach(t => {
        const logs = t.progress;
        if (!logs || logs.length === 0) return;

        // Creation time (Oldest log - index -1 equivalent)
        // Assuming logs are chronological [Created, ..., Actioned] OR [Resolved, ..., Created]
        // Based on previous debug, logs were [Resolved (Newest), ..., Created (Oldest)]
        // So creation is usually the LAST element (logs[logs.length-1])
        const creationLog = logs[logs.length - 1]; 
        
        // Find Resolution in Range
        // Must be "Ticket Resolved" AND timestamp >= startDate
        const resolvedLog = logs.find(l => {
            const isResolved = l.description === "Ticket Resolved";
            const inRange = startDate ? new Date(l.timestamp) >= startDate : true;
            return isResolved && inRange;
        });
        
        if (resolvedLog) {
            const durationMs = new Date(resolvedLog.timestamp) - new Date(creationLog.timestamp);
            const durationHrs = durationMs / (1000 * 60 * 60);
            resolutionDurations.push(durationHrs);
            resolvedCount++;
        }

        // Find Acceptance in Range
        // Must be "Employee accepted ticket" AND timestamp >= startDate
        // We want the *First* acceptance usually? 
        // Logic in controller uses $last of filtered list.
        // If logs are [AcceptedNew, AcceptedOld], $last is AcceptedOld (First time accepted).
        
        // Let's filter first, then pick the correct one.
        const acceptanceLogs = logs.filter(l => l.description === "Employee accepted ticket");
        
        // We need to count it if the VALID acceptance log falls in the range.
        // If we want "Time to Accept", we typically measure Creation -> First Acceptance.
        // Does the "First Acceptance" event fall in the range?
        // If I accepted it 10 days ago, it shouldn't be in "Last 1 Hour" stats.
        
        // So we find the First Acceptance
        const firstAcceptance = acceptanceLogs[acceptanceLogs.length - 1]; // Oldest acceptance if logs are New->Old
        
        if (firstAcceptance) {
            const inRange = startDate ? new Date(firstAcceptance.timestamp) >= startDate : true;
            if (inRange) {
                const durationMs = new Date(firstAcceptance.timestamp) - new Date(creationLog.timestamp);
                const durationHrs = durationMs / (1000 * 60 * 60);
                acceptanceDurations.push(durationHrs);
                acceptedCount++;
            }
        }
    });

    const avgRes = resolutionDurations.length > 0 ? resolutionDurations.reduce((a,b)=>a+b,0)/resolutionDurations.length : 0;
    const avgAcc = acceptanceDurations.length > 0 ? acceptanceDurations.reduce((a,b)=>a+b,0)/acceptanceDurations.length : 0;

    console.log(`\n=== ${rangeName} ===`);
    if (startDate) console.log(`Since: ${startDate.toISOString()}`);
    else console.log(`Since: Beginning of Time`);
    console.log(`Resolved Tickets: ${resolvedCount}`);
    console.log(`Avg Resolution Time: ${avgRes.toFixed(2)}h`);
    console.log(`Accepted Tickets: ${acceptedCount}`);
    console.log(`Avg Acceptance Time: ${avgAcc.toFixed(2)}h`);
};

const debugTimeFilters = async () => {
  try {
    await mongoose.connect('mongodb+srv://huterabaap522_db_user:di11MQSx9e3PWr0a@cluster0.sx2gjvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("Connected to MongoDB");

    // Fetch all tickets to inspect locally
    const tickets = await Ticket.find({});
    console.log(`Total Tickets Scanned: ${tickets.length}`);

    const now = Date.now();
    const ranges = [
        { name: "Last 1 Hour", date: new Date(now - 60 * 60 * 1000) },
        { name: "Last 24 Hours", date: new Date(now - 24 * 60 * 60 * 1000) },
        { name: "Last 10 Days", date: new Date(now - 10 * 24 * 60 * 60 * 1000) },
        { name: "Last 30 Days", date: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        { name: "All Time", date: null }
    ];

    ranges.forEach(r => calculateStats(tickets, r.name, r.date));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

debugTimeFilters();
