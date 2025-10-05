//message.controller.js
import Ticket from "../models/ticket.model.js";

export const getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findOne({ ticketId })
          .select("chat")
          .populate("chat.user", "name email profilePicture");  

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        res.status(200).json(ticket.chat);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: err.message });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, attachment } = req.body;
        const userId = req.user.userId;

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            res.status(404);
            throw new Error("Ticket not found");
        }

        const message = {
            user:userId,
            content,
            attachment: attachment || "",
            createdAt: new Date(),
        };

        ticket.chat.push(message);
        await ticket.save();

        req.io.to(ticketId).emit("newMessage", {
            ticketId,
            message: { ...message, user: { _id: userId, username: req.user.username } }, // Change userId to user
        });

        res.status(201).json(message);
    } catch (error) {
        console.log(error.message);
    }
};
