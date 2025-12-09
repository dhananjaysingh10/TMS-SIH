/**
 * Cron Job: Ticket Escalation
 * Runs every minute to check for tickets open for 2+ hours without assignment
 * Sends email to department lead for escalation
 */

import cron from 'node-cron';
import Ticket from '../models/ticket.model.js';
import Department from '../models/department.model.js';
import User from '../models/user.model.js';
import { nodemailerClient } from '../config/email.config.js';
import { TICKET_ESCALATION_TEMPLATE } from './emailTemplate.js';

// Track tickets we've already escalated to avoid duplicate emails
const escalatedTickets = new Set();

/**
 * Check for tickets that need escalation
 * Criteria: status='open', accepted=false, open for 2+ hours, not already escalated
 */
const checkAndEscalateTickets = async () => {
    try {
        const twoHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

        // HARDCODED: Only for E-Tendering product (TODO: make configurable later)
        const E_TENDERING_PRODUCT_ID = '6936b16fd115e503d02578d0';

        // Get departments under E-Tendering product only
        const eTenderingDepartments = await Department.find({ product: E_TENDERING_PRODUCT_ID }).select('_id');
        const eTenderingDeptIds = eTenderingDepartments.map(d => d._id);

        // Find tickets open for 2+ hours that haven't been accepted/assigned
        // Only from E-Tendering product departments
        const ticketsToEscalate = await Ticket.find({
            status: 'open',
            accepted: { $ne: true },
            assignedTo: null,
            createdAt: { $lte: twoHoursAgo },
            inreview: { $ne: true },  // Don't escalate tickets pending department change
            departmentRef: { $in: eTenderingDeptIds }  // ONLY E-Tendering departments
        }).populate('departmentRef');

        console.log(`[Escalation Cron] Found ${ticketsToEscalate.length} E-Tendering tickets to check`);

        for (const ticket of ticketsToEscalate) {
            // Skip if already escalated
            if (escalatedTickets.has(ticket.ticketId)) {
                continue;
            }

            // Get department and lead
            if (!ticket.departmentRef) {
                console.log(`[Escalation Cron] Ticket ${ticket.ticketId} has no department, skipping`);
                continue;
            }

            const department = await Department.findById(ticket.departmentRef._id).populate('lead');

            if (!department?.lead) {
                console.log(`[Escalation Cron] Department "${department?.name}" has no lead, skipping ticket ${ticket.ticketId}`);
                continue;
            }

            const leadEmail = department.lead.email;
            const hoursOpen = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60));

            console.log(`[Escalation Cron] Escalating ticket ${ticket.ticketId} to ${leadEmail} (open for ${hoursOpen}h)`);

            try {
                await nodemailerClient.sendMail({
                    to: leadEmail,
                    subject: `⚠️ URGENT: Ticket ${ticket.displayId || ticket.ticketId} needs assignment - Open for ${hoursOpen}h`,
                    html: TICKET_ESCALATION_TEMPLATE(
                        ticket.ticketId,
                        ticket.displayId,
                        ticket.title,
                        department.name,
                        ticket.priority,
                        ticket.createdAt,
                        hoursOpen
                    )
                });

                console.log(`[Escalation Cron] Email sent to ${leadEmail} for ticket ${ticket.ticketId}`);

                // Mark as escalated to avoid duplicate emails
                escalatedTickets.add(ticket.ticketId);

            } catch (emailError) {
                console.error(`[Escalation Cron] Failed to send email for ticket ${ticket.ticketId}:`, emailError.message);
            }
        }

    } catch (error) {
        console.error('[Escalation Cron] Error checking tickets:', error);
    }
};

/**
 * Start the escalation cron job
 * Runs every minute
 */
export const startEscalationCron = () => {
    // Run every minute: */1 * * * *
    cron.schedule('*/1 * * * *', () => {
        console.log('[Escalation Cron] Running escalation check...');
        checkAndEscalateTickets();
    });

    console.log('[Escalation Cron] Started - checking for unpicked tickets every minute');
};

/**
 * Clear escalated ticket from tracking (call when ticket is assigned/resolved)
 */
export const clearEscalatedTicket = (ticketId) => {
    escalatedTickets.delete(ticketId);
};

export default { startEscalationCron, clearEscalatedTicket };
