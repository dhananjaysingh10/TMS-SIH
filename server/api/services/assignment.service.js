import Ticket from "../models/ticket.model.js";
import User from "../models/user.model.js";

/**
 * Counts the number of active (open or in-progress) tickets for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} - The count of active tickets.
 */
export const countUserActiveTickets = async (userId) => {
    return await Ticket.countDocuments({
        assignedTo: userId,
        status: { $in: ["open", "in-progress"] },
    });
};

/**
 * Finds the agent with the lowest number of active tickets in a given department.
 * Filters for users with roles 'employee', 'admin', or 'super-admin'.
 * @param {string} departmentId - The ID of the department.
 * @returns {Promise<string|null>} - The ID of the least loaded agent, or null if none found.
 */
export const findLeastLoadedAgent = async (departmentId, excludeUserIds = []) => {
    try {
        const query = {
            departments: departmentId,
            role: { $in: ["employee", "admin", "super-admin"] }
        };

        if (excludeUserIds.length > 0) {
            query._id = { $nin: excludeUserIds };
        }

        // Find all potential agents in the department
        const agents = await User.find(query).select("_id");

        if (agents.length === 0) {
            return null;
        }

        let leastLoadedAgent = null;
        let minTickets = Infinity;

        // Iterate through agents to find the one with the minimum load
        for (const agent of agents) {
            const ticketCount = await countUserActiveTickets(agent._id);
            if (ticketCount < minTickets) {
                minTickets = ticketCount;
                leastLoadedAgent = agent._id;
            }
        }

        return leastLoadedAgent;
    } catch (error) {
        console.error("Error finding least loaded agent:", error);
        return null;
    }
};

/**
 * Finds the next suitable agent for re-assignment.
 * Handles exclusions (declined users) and pool exhaustion.
 * @param {string} departmentId
 * @param {string[]} declinedUserIds
 * @param {string[]} excludeUserIds - Users to never assign (e.g. creator)
 * @returns {Promise<{agentId: string|null, resetDeclined: boolean}>}
 */
export const findNextAgentForReassignment = async (departmentId, declinedUserIds = [], excludeUserIds = []) => {
    try {
        const Department = (await import("../models/department.model.js")).default;
        
        // 1. Get Department Lead & Eligible Agent Count
        const dept = await Department.findById(departmentId).populate('lead');
        
        // Count TOTAL eligible agents in dept
        const totalEligibleCount = await User.countDocuments({
            departments: departmentId,
            role: { $in: ["employee", "admin", "super-admin"] }
        });
        
        // Calculate effectively eligible (Total - Excluded)
        // Note: This is an approximation. If excluded user isn't in dept, it doesn't matter.
        // But assuming excludeUserIds are valid users. 
        // Let's do a query to be precise.
        const effectiveEligibleCount = await User.countDocuments({
            departments: departmentId,
            role: { $in: ["employee", "admin", "super-admin"] },
            _id: { $nin: excludeUserIds }
        });

        // Ensure IDs are strings
        const declinedStrings = declinedUserIds.map(id => id.toString());
        const excludedStrings = excludeUserIds.map(id => id.toString());

        // Pool Exhausted if declined count covers all effective eligible agents
        const poolExhausted = declinedStrings.length >= effectiveEligibleCount && effectiveEligibleCount > 0;

        console.log(`[Re-assign] Dept: ${dept?.name}, Effective Eligible: ${effectiveEligibleCount}, Declined: ${declinedStrings.length}`);

        // 2. Escalation Logic (Rule: >3 declines OR Pool Exhausted)
        if ((declinedStrings.length >= 3 || poolExhausted) && dept && dept.lead) {
             const leadId = dept.lead._id.toString();
             // Determine if Lead is available (not declined AND not excluded)
             if (!declinedStrings.includes(leadId) && !excludedStrings.includes(leadId)) {
                 console.log(`[Re-assign] Escalating to Team Lead: ${dept.lead.email}`);
                 return { agentId: dept.lead._id, resetDeclined: false };
             } else {
                 console.log(`[Re-assign] Team Lead ${dept.lead.email} unavailable (Declined or Excluded).`);
             }
        }

        // 3. Pool Exhaustion (No Lead or Lead unavailable)
        if (poolExhausted) {
             console.log(`[Re-assign] Pool exhausted for ${dept?.name}. No valid agents. Resetting declined list for next cycle.`);
             return { agentId: null, resetDeclined: true };
        }

        // 4. Normal Search (excluding declined AND excluded)
        const candidates = await User.find({
            departments: departmentId,
            role: { $in: ["employee", "admin", "super-admin"] },
            _id: { $nin: [...declinedUserIds, ...excludeUserIds] }
        }).select("_id");

        let bestAgent = null;
        let minTickets = Infinity;

        for (const agent of candidates) {
            const ticketCount = await countUserActiveTickets(agent._id);
            if (ticketCount < minTickets) {
                minTickets = ticketCount;
                bestAgent = agent._id;
            }
        }
        
        return { agentId: bestAgent, resetDeclined: false };

    } catch (error) {
        console.error("Error finding next agent:", error);
        return { agentId: null, resetDeclined: false };
    }
};
