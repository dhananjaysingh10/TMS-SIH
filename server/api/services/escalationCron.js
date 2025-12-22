/**
 * Cron Job: Ticket Escalation
 * Runs every minute to check for tickets that need escalation based on priority thresholds
 * Initial thresholds: low=2h, medium=1h, high=0.5h, urgent=0.5h
 * After each escalation, threshold increases by 2 hours
 */

import cron from 'node-cron';
import Ticket from '../models/ticket.model.js';
import Department from '../models/department.model.js';
import { nodemailerClient } from '../config/email.config.js';
import { TICKET_ESCALATION_TEMPLATE } from './escalationEmailTemplate.js';

// Initial threshold values based on priority (in hours)
const INITIAL_THRESHOLDS = {
    low: 2,
    medium: 1,
    high: 0.5,
    urgent: 0.5
};

// Hours to add after each escalation
const THRESHOLD_INCREMENT = 2;

/**
 * Get initial threshold based on priority
 */
const getInitialThreshold = (priority) => {
    return INITIAL_THRESHOLDS[priority?.toLowerCase()] || INITIAL_THRESHOLDS.medium;
};

/**
 * Check for tickets that need escalation
 * Escalates in-progress tickets that haven't been resolved within threshold
 */
const checkAndEscalateTickets = async () => {
    try {
        // Find all in-progress tickets that haven't been resolved
        const ticketsToCheck = await Ticket.find({
            status: 'in-progress',
            accepted: true
        }).populate('departmentRef');

        console.log(`[Escalation Cron] Checking ${ticketsToCheck.length} in-progress tickets`);

        let emailsSent = 0;
        const MAX_EMAILS_PER_RUN = 2; // Rate limit: max 2 emails per minute

        for (const ticket of ticketsToCheck) {
            // Rate limiting - stop if we've sent max emails this run
            if (emailsSent >= MAX_EMAILS_PER_RUN) {
                console.log(`[Escalation Cron] Rate limit reached (${MAX_EMAILS_PER_RUN} emails), will continue next run`);
                break;
            }

            // Set initial threshold if not set
            if (ticket.escalationThresholdHours === null || ticket.escalationThresholdHours === undefined) {
                const initialThreshold = getInitialThreshold(ticket.priority);
                await Ticket.updateOne(
                    { _id: ticket._id },
                    { $set: { escalationThresholdHours: initialThreshold } }
                );
                ticket.escalationThresholdHours = initialThreshold;
                console.log(`[Escalation Cron] Set initial threshold for ${ticket.ticketId}: ${initialThreshold}h`);
            }

            // Calculate when next escalation should happen
            // First escalation: createdAt + threshold
            // Subsequent escalations: escalatedAt + threshold
            const baseTime = ticket.escalatedAt ? new Date(ticket.escalatedAt) : new Date(ticket.createdAt);
            const hoursElapsed = (Date.now() - baseTime.getTime()) / (1000 * 60 * 60);

            // Check if threshold exceeded (time to escalate)
            if (hoursElapsed >= ticket.escalationThresholdHours) {
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
                const totalHoursOpen = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);

                console.log(`[Escalation Cron] Escalating ticket ${ticket.ticketId} to ${leadEmail} (in-progress: ${totalHoursOpen.toFixed(1)}h, threshold: ${ticket.escalationThresholdHours}h)`);

                try {
                    // Add delay between emails to avoid rate limiting
                    if (emailsSent > 0) {
                        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
                    }

                    await nodemailerClient.sendMail({
                        to: leadEmail,
                        subject: `⚠️ URGENT: Ticket ${ticket.displayId || ticket.ticketId} pending resolution - In-progress for ${Math.round(totalHoursOpen)}h`,
                        html: TICKET_ESCALATION_TEMPLATE(
                            ticket.ticketId,
                            ticket.displayId,
                            ticket.title,
                            department.name,
                            ticket.priority,
                            ticket.createdAt,
                            Math.round(totalHoursOpen)
                        )
                    });

                    console.log(`[Escalation Cron] Email sent to ${leadEmail} for ticket ${ticket.ticketId}`);
                    emailsSent++;

                    // Increase threshold by 2 hours for next escalation
                    const newThreshold = ticket.escalationThresholdHours + THRESHOLD_INCREMENT;
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        { $set: { escalationThresholdHours: newThreshold, escalatedAt: new Date() } }
                    );

                    console.log(`[Escalation Cron] New threshold for ${ticket.ticketId}: ${newThreshold}h`);

                } catch (emailError) {
                    console.error(`[Escalation Cron] Failed to send email for ticket ${ticket.ticketId}:`, emailError.message);
                }
            }
        }

        if (emailsSent > 0) {
            console.log(`[Escalation Cron] Sent ${emailsSent} escalation emails this run`);
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
    cron.schedule('*/1 * * * *', () => {
        console.log('[Escalation Cron] Running escalation check...');
        checkAndEscalateTickets();
    });

    console.log('[Escalation Cron] Started - checking tickets every minute');
};

/**
 * Reset escalation threshold for a ticket (call when ticket is assigned)
 */
export const resetEscalationThreshold = async (ticketId) => {
    try {
        const ticket = await Ticket.findOne({ ticketId });
        if (ticket) {
            ticket.escalationThresholdHours = getInitialThreshold(ticket.priority);
            ticket.escalatedAt = null;
            await ticket.save();
        }
    } catch (error) {
        console.error(`[Escalation Cron] Error resetting threshold for ${ticketId}:`, error);
    }
};

export default { startEscalationCron, resetEscalationThreshold };
