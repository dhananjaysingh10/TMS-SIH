import Ticket from "../models/ticket.model";
import asyncHandler from "express-async-handler"

export const getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findOne({ ticketId }).select("chat").populate("chat.userId", "username");

        if (!ticket) {
            res.status(404);
            throw new Error("Ticket not found");
        }

        res.status(200).json(ticket.chat);
    } catch (err) {
        console.log(err.message);
    }

};

export const sendMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, attachments } = req.body;
        const userId = req.user.userId;

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            res.status(404);
            throw new Error("Ticket not found");
        }

        const message = {
            userId,
            content,
            attachments: attachments || [],
            createdAt: new Date(),
        };

        ticket.chat.push(message);
        await ticket.save();

        req.io.to(ticketId).emit("newMessage", {
            ticketId,
            message: { ...message, userId: { _id: userId, username: req.user.username } },
        });

        res.status(201).json(message);
    } catch (error) {
        console.log(error.message);
    }
};
