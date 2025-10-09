import { nodemailerClient } from '../config/email.config.js';
import {TICKET_STATUS_UPDATE_TEMPLATE} from './emailTemplate.js';

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