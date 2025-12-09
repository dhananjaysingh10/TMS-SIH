
import mongoose from 'mongoose';
import TemporaryTicket from './api/models/temporaryTicket.model.js';
import Ticket from './api/models/ticket.model.js';

const TICKET_ID = 'fba01c86-76da-4c9a-b873-760fa9cce357';
// Using the URI I saw in the previous turn's attempt (or standard localhost if that fails, but user had a cloud URI)
const MONGO_URI = "mongodb+srv://dhananjaysingh10:Dhananjay@cluster0.p49ki.mongodb.net/TMS-SIH?retryWrites=true&w=majority&appName=Cluster0";

async function inspectTicket() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check Permanent Ticket
    const ticket = await Ticket.findOne({ ticketId: TICKET_ID });
    if (ticket) {
        console.log('\n--- PERMANENT TICKET FOUND ---');
        console.log('ID:', ticket.ticketId);
        console.log('Source:', ticket.source);
        console.log('Department:', ticket.department);
        console.log('Type:', ticket.type);
    } else {
        console.log('\n--- NO PERMANENT TICKET FOUND with this ID ---');
    }

    // Check if any Temporary Ticket escalated to this
    const tempTicket = await TemporaryTicket.findOne({ permanentTicketId: TICKET_ID });
    if (tempTicket) {
        console.log('\n--- ORIGIN: CHATBOT/TEMPORARY TICKET ---');
        console.log('Original Temp ID:', tempTicket.tempTicketId);
        console.log('Escalated At:', tempTicket.updatedAt);
    } else {
        console.log('\n--- NO LINKED TEMPORARY TICKET FOUND ---');
        console.log('(This ticket likely originated directly from the "Create Ticket" form)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectTicket();
