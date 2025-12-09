
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TemporaryTicket from '../server/api/models/temporaryTicket.model.js';
import Ticket from '../server/api/models/ticket.model.js';

dotenv.config({ path: 'server/.env' });

const TICKET_ID = 'fba01c86-76da-4c9a-b873-760fa9cce357';
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://dhananjaysingh10:Dhananjay@cluster0.p49ki.mongodb.net/TMS-SIH?retryWrites=true&w=majority&appName=Cluster0";

async function inspectTicket() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check Permanent Ticket
    const ticket = await Ticket.findOne({ ticketId: TICKET_ID });
    if (ticket) {
        console.log('\n--- PERMANENT TICKET FOUND ---');
        console.log('ID:', ticket.ticketId);
        console.log('Source:', ticket.source || 'Standard Creation'); // 'source' field might not exist in schema yet, but let's check doc
        console.log('Created By:', ticket.createdBy?.email || ticket.createdBy);
        console.log('Description:', ticket.description);
        console.log('Full Doc:', JSON.stringify(ticket.toObject(), null, 2));
    } else {
        console.log('\n--- NO PERMANENT TICKET FOUND with this ID ---');
    }

    // Check Temporary Ticket (just in case ID format matches, unlikely, or check if any temp ticket links to this)
    const tempTicket = await TemporaryTicket.findOne({ permanentTicketId: TICKET_ID });
    if (tempTicket) {
        console.log('\n--- LINKED TEMPORARY TICKET FOUND ---');
        console.log('Temp ID:', tempTicket.tempTicketId);
        console.log('Auto Resolved:', tempTicket.autoResolved);
        console.log('Escalated:', tempTicket.escalatedToTicket);
    } else {
        console.log('\n--- NO LINKED TEMPORARY TICKET FOUND ---');
    }

    // Check if the ID itself exists as a temp ticket ID (unlikely due to format)
    const tempTicketDirect = await TemporaryTicket.findOne({ tempTicketId: TICKET_ID });
    if (tempTicketDirect) {
        console.log('\n--- THIS IS A TEMPORARY TICKET ID ---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectTicket();
