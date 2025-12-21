import User from "../models/user.model.js";
import { countUserActiveTickets } from "../services/assignment.service.js";

export const getUserAvailability = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("name email profilePicture role");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const ticketCount = await countUserActiveTickets(userId);

        res.status(200).json({
            ...user.toObject(),
            activeTicketCount: ticketCount,
        });
    } catch (error) {
        console.error("Error in getUserAvailability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getProductAvailability = async (req, res) => {
    try {
        const { productId } = req.params;

        const users = await User.find({ products: productId }).select("name email profilePicture role");

        const availabilityData = await Promise.all(
            users.map(async (user) => {
                const ticketCount = await countUserActiveTickets(user._id);
                return {
                    ...user.toObject(),
                    activeTicketCount: ticketCount,
                };
            })
        );

        res.status(200).json(availabilityData);
    } catch (error) {
        console.error("Error in getProductAvailability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getDepartmentAvailability = async (req, res) => {
    try {
        const { departmentId } = req.params;

        const users = await User.find({ departments: departmentId }).select("name email profilePicture role");

        const availabilityData = await Promise.all(
            users.map(async (user) => {
                const ticketCount = await countUserActiveTickets(user._id);
                return {
                    ...user.toObject(),
                    activeTicketCount: ticketCount,
                };
            })
        );

        res.status(200).json(availabilityData);
    } catch (error) {
        console.error("Error in getDepartmentAvailability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
