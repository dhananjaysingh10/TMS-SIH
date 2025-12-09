import { nodemailerClient } from '../config/email.config.js';
import { AI_RESPONSE_EMAIL_TEMPLATE, TICKET_STATUS_UPDATE_TEMPLATE } from './emailTemplate.js';

export const sendTicketStatusUpdateEmail = async (email, ticketId, status, remark, timestamp) => {
    const recipient = [{ email }];
console.log(recipient);
console.log(email);
    try {
        const response = await nodemailerClient.sendMail({
            to: email,
            subject: `Ticket ${ticketId} Status Update`,
            html: TICKET_STATUS_UPDATE_TEMPLATE(ticketId, status, remark, timestamp)
        });

        console.log("Ticket status update email sent successfully", response);
    } catch (error) {
        console.error(`Error sending ticket status update email`, error);
        throw new Error(`Error sending ticket status update email: ${error}`);
    }
};

/**
 * Send AI response email to user who submitted a ticket via email
 * @param {string} email - User's email address
 * @param {string} ticketId - Temporary or permanent ticket ID
 * @param {string} userQuery - Original user question/issue
 * @param {string} aiResponse - AI chatbot response
 */
export const sendAIResponseEmail = async (email, ticketId, userQuery, aiResponse) => {
    const helpdeskUrl = process.env.CORS_ORIGIN ? `${process.env.CORS_ORIGIN}/helpdesk` : 'http://localhost:3000/helpdesk';
    
    try {
        console.log(`📧 Sending AI response email to ${email} for ticket ${ticketId}`);
        
        const response = await nodemailerClient.sendMail({
            to: email,
            subject: `[POWERGRID AI Support] Response to your query - ${ticketId}`,
            html: AI_RESPONSE_EMAIL_TEMPLATE(ticketId, userQuery, aiResponse, helpdeskUrl)
        });

        console.log("✅ AI response email sent successfully", response);
        return true;
    } catch (error) {
        console.error(`❌ Error sending AI response email:`, error);
        return false;
    }
};