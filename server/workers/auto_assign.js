
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..'); // Assuming server/workers/auto_assign.js -> server/

// Load env from server/.env
dotenv.config({ path: path.join(rootDir, '.env') });

import Department from '../api/models/department.model.js';
import Ticket from '../api/models/ticket.model.js';
import User from '../api/models/user.model.js';
import { findNextAgentForReassignment } from '../api/services/assignment.service.js';
import { sendTicketStatusUpdateEmail } from '../api/services/email.service.js';

const SLEEP_INTERVAL_MS = 30000; // 30 seconds

// Capture start time to ignore old tickets
const WORKER_START_TIME = new Date();
console.log(`🕒 Worker Start Time: ${WORKER_START_TIME.toISOString()}`);

const runWorker = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB. Starting Auto-Assignment Worker...");

        while (true) {
            try {
                // Find OPEN tickets created AFTER worker started
                const openTickets = await Ticket.find({
                    status: 'open',
                    assignedTo: null,
                    departmentRef: { $ne: null },
                    createdAt: { $gt: WORKER_START_TIME }
                }).populate('departmentRef');

                if (openTickets.length > 0) {
                    console.log(`🔍 Found ${openTickets.length} new open tickets.`);
                }

                for (const ticket of openTickets) {
                    // Check if it's already accepted (double check data integrity)
                    if (ticket.accepted || ticket.assignedTo) continue;

                    console.log(`👉 Processing Ticket ${ticket.ticketId} (${ticket.title})`);
                    console.log(`   ⛔ Declined By: ${ticket.declinedBy ? ticket.declinedBy.join(', ') : 'None'}`);

                    // Use common logic to find next agent (handles escalation > 3 declines)
                    const { agentId, resetDeclined } = await findNextAgentForReassignment(
                        ticket.departmentRef._id, 
                        ticket.declinedBy || [],
                        ticket.createdBy ? [ticket.createdBy] : []
                    );

                    let updates = {};
                    let assignedUser = null;

                    if (resetDeclined) {
                        console.log(`   ⟳ Pool reset for ticket ${ticket.ticketId}`);
                        updates.declinedBy = [];
                    }

                    if (agentId) {
                        assignedUser = await User.findById(agentId);
                        if (assignedUser) {
                            updates.assignedTo = agentId;
                            updates.status = "in-progress";
                            updates.accepted = true;
                            
                            console.log(`   ✅ Assigning to: ${assignedUser.email}`);
                        }
                    } else {
                         console.log(`   ⚠️ No suitable agent found for ticket ${ticket.ticketId}. Skipping.`);
                    }

                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        const updatedTicket = await Ticket.findByIdAndUpdate(
                            ticket._id, 
                            updates, 
                            { new: true }
                        ).populate("createdBy");
                        
                        // Send Email if assigned
                        if (updatedTicket.assignedTo && updatedTicket.createdBy) {
                             const reason = (ticket.declinedBy && ticket.declinedBy.length >= 3) 
                                ? "Escalated to Team Lead due to multiple declines." 
                                : "Auto-assigned by system.";
                                
                             try {
                                // Notify Agent
                                await sendTicketStatusUpdateEmail(
                                    assignedUser.email,
                                    updatedTicket.ticketId,
                                    "assigned",
                                    `Ticket auto-assigned to you. Reason: ${reason}`,
                                    Date.now()
                                );
                                // Notify Creator? Maybe not needed for every reassignment unless status changes significantly.
                             } catch (mailErr) {
                                 console.error("   ❌ Failed to send email:", mailErr.message);
                             }
                        }
                    }
                }

            } catch (loopErr) {
                console.error("❌ Error in worker loop:", loopErr);
            }

            // Sleep
            // console.log(`💤 Sleeping for ${SLEEP_INTERVAL_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, SLEEP_INTERVAL_MS));
        }

    } catch (err) {
        console.error("❌ Fatal Worker Error:", err);
        process.exit(1);
    }
};

runWorker();
