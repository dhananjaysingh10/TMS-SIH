// analytics.controller.js
import mongoose from 'mongoose';
import Ticket from '../models/ticket.model.js';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';

/**
 * Helper to calculate the date range based on a range string.
 * @param {string} range - One of: 1h, 24h, 10d, 1m, 1y, all
 * @returns {{ startDate: Date | null, endDate: Date }}
 */
const getDateRange = (range) => {
    const now = new Date();
    let startDate;

    switch (range) {
        case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '10d':
            startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
            break;
        case '1m':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
            startDate = null; // No start date filter
            break;
        default:
            // Default to last 30 days
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
};

/**
 * GET /api/analytics/department
 * Query params: range (1h, 24h, 10d, 1m, 1y, all), departmentId (optional)
 * Returns department-level analytics for the specified or admin's department.
 */
export const getDepartmentAnalytics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role department departments');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Only admins and super-admins can access
        if (user.role !== 'admin' && user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const range = req.query.range || '1m';
        const { startDate, endDate } = getDateRange(range);

        // Support departmentId query param for new system, fallback to legacy
        const departmentId = req.query.departmentId;
        let departmentName = null;

        // Build match query that works with both old (department string) and new (departmentRef) schema
        let matchQuery = {};

        if (departmentId) {
            // New system: query by departmentRef
            const dept = await Department.findById(departmentId);
            if (!dept) {
                return res.status(404).json({ success: false, message: 'Department not found' });
            }
            departmentName = dept.name;
            // Match either departmentRef or legacy department name
            matchQuery = {
                $or: [
                    { departmentRef: new mongoose.Types.ObjectId(departmentId) },
                    { department: dept.name }
                ]
            };
        } else if (user.departments && user.departments.length > 0) {
            // User has new departments array - use first one
            const dept = await Department.findById(user.departments[0]);
            if (dept) {
                departmentName = dept.name;
                matchQuery = {
                    $or: [
                        { departmentRef: dept._id },
                        { department: dept.name }
                    ]
                };
            }
        } else if (user.department) {
            // Fallback to legacy department string
            departmentName = user.department;
            matchQuery = { department: user.department };
        } else {
            return res.status(400).json({ success: false, message: 'No department found for user' });
        }

        if (startDate) {
            matchQuery.createdAt = { $gte: startDate, $lte: endDate };
        }

        // 1. Ticket Volume & Status Distribution
        const statusStats = await Ticket.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const statusResult = {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
        };

        statusStats.forEach((stat) => {
            statusResult.total += stat.count;
            if (stat._id === 'open') statusResult.open = stat.count;
            if (stat._id === 'in-progress') statusResult.inProgress = stat.count;
            if (stat._id === 'resolved') statusResult.resolved = stat.count;
            if (stat._id === 'closed') statusResult.closed = stat.count;
        });

        // 2. Priority Breakdown
        const priorityStats = await Ticket.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 },
                },
            },
        ]);

        const priorityResult = {
            urgent: 0,
            high: 0,
            medium: 0,
            low: 0,
        };

        priorityStats.forEach((stat) => {
            if (priorityResult.hasOwnProperty(stat._id)) {
                priorityResult[stat._id] = stat.count;
            }
        });

        // 3. Average Resolution Time (for closed/resolved tickets)
        // Build base query for resolved tickets (same dept filter)
        const baseMatchQuery = { ...matchQuery };
        delete baseMatchQuery.createdAt; // Remove date filter, we'll add updatedAt for resolved

        const resolutionMatchQuery = {
            ...baseMatchQuery,
            status: { $in: ['resolved', 'closed'] },
        };
        if (startDate) {
            resolutionMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
        }
        const resolutionStats = await Ticket.aggregate([
            { $match: resolutionMatchQuery },
            {
                $project: {
                    resolutionTime: { $subtract: ['$updatedAt', '$createdAt'] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgResolutionTime: { $avg: '$resolutionTime' },
                },
            },
        ]);

        const avgResolutionTimeMs = resolutionStats[0]?.avgResolutionTime || 0;
        const avgResolutionTimeHours = Math.round(avgResolutionTimeMs / (1000 * 60 * 60) * 10) / 10;

        // 4. SLA Compliance (tickets resolved before dueDate)
        const slaMatchQuery = {
            ...baseMatchQuery,
            status: { $in: ['resolved', 'closed'] },
            dueDate: { $exists: true, $ne: null },
        };
        if (startDate) {
            slaMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
        }
        const slaStats = await Ticket.aggregate([
            { $match: slaMatchQuery },
            {
                $project: {
                    metSLA: { $lte: ['$updatedAt', '$dueDate'] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalWithDueDate: { $sum: 1 },
                    metSLACount: { $sum: { $cond: ['$metSLA', 1, 0] } },
                },
            },
        ]);

        const slaTotal = slaStats[0]?.totalWithDueDate || 0;
        const slaMetCount = slaStats[0]?.metSLACount || 0;
        const slaCompliancePercent = slaTotal > 0 ? Math.round((slaMetCount / slaTotal) * 100) : null;

        // 5. Average Rating (CSAT)
        const ratingMatchQuery = {
            ...baseMatchQuery,
            status: { $in: ['resolved', 'closed'] },
            rating: { $gt: 0 },
        };
        if (startDate) {
            ratingMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
        }
        const ratingStats = await Ticket.aggregate([
            { $match: ratingMatchQuery },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    totalRated: { $sum: 1 },
                },
            },
        ]);

        const avgRating = ratingStats[0]?.avgRating ? Math.round(ratingStats[0].avgRating * 10) / 10 : null;
        const totalRated = ratingStats[0]?.totalRated || 0;

        // 6. Type Breakdown
        const typeStats = await Ticket.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                },
            },
        ]);

        const typeResult = {};
        typeStats.forEach((stat) => {
            typeResult[stat._id] = stat.count;
        });

        res.status(200).json({
            success: true,
            data: {
                department: departmentName,
                departmentId: departmentId || (user.departments && user.departments[0]) || null,
                range,
                startDate,
                endDate,
                ticketVolume: statusResult,
                priorityBreakdown: priorityResult,
                typeBreakdown: typeResult,
                avgResolutionTimeHours,
                slaCompliance: {
                    percent: slaCompliancePercent,
                    metCount: slaMetCount,
                    total: slaTotal,
                },
                customerSatisfaction: {
                    avgRating,
                    totalRated,
                },
            },
        });
    } catch (error) {
        console.error('Error in getDepartmentAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/analytics/employees
 * Query params: range (1h, 24h, 10d, 1m, 1y)
 * Returns a list of employees in the department with their individual stats.
 */
export const getEmployeeAnalytics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role department');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'admin' && user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const range = req.query.range || '1m';
        const { startDate, endDate } = getDateRange(range);
        const department = user.department;

        // Get all employees in the department
        const employees = await User.find({ department, role: 'employee' }).select('_id name email profilePicture');

        const employeeStats = await Promise.all(
            employees.map(async (employee) => {
                const employeeId = employee._id;

                // Build match query conditionally for date filtering
                const assignedMatchQuery = { assignedTo: employeeId };
                if (startDate) {
                    assignedMatchQuery.createdAt = { $gte: startDate, $lte: endDate };
                }

                // Tickets assigned to this employee
                const assignedStats = await Ticket.aggregate([
                    { $match: assignedMatchQuery },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                        },
                    },
                ]);

                const stats = {
                    total: 0,
                    open: 0,
                    inProgress: 0,
                    resolved: 0,
                    closed: 0,
                };

                assignedStats.forEach((stat) => {
                    stats.total += stat.count;
                    if (stat._id === 'open') stats.open = stat.count;
                    if (stat._id === 'in-progress') stats.inProgress = stat.count;
                    if (stat._id === 'resolved') stats.resolved = stat.count;
                    if (stat._id === 'closed') stats.closed = stat.count;
                });

                // Average resolution time for this employee
                const resMatchQuery = {
                    assignedTo: employeeId,
                    status: { $in: ['resolved', 'closed'] },
                };
                if (startDate) {
                    resMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
                }
                const resStats = await Ticket.aggregate([
                    { $match: resMatchQuery },
                    {
                        $project: {
                            resolutionTime: { $subtract: ['$updatedAt', '$createdAt'] },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgResolutionTime: { $avg: '$resolutionTime' },
                        },
                    },
                ]);

                const avgResTimeMs = resStats[0]?.avgResolutionTime || 0;
                const avgResTimeHours = Math.round(avgResTimeMs / (1000 * 60 * 60) * 10) / 10;

                // Average rating for this employee
                const ratMatchQuery = {
                    assignedTo: employeeId,
                    status: { $in: ['resolved', 'closed'] },
                    rating: { $gt: 0 },
                };
                if (startDate) {
                    ratMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
                }
                const ratStats = await Ticket.aggregate([
                    { $match: ratMatchQuery },
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: '$rating' },
                        },
                    },
                ]);

                const avgRating = ratStats[0]?.avgRating ? Math.round(ratStats[0].avgRating * 10) / 10 : null;

                // Current workload (open or in-progress tickets currently assigned)
                const workload = await Ticket.countDocuments({
                    assignedTo: employeeId,
                    status: { $in: ['open', 'in-progress'] },
                });

                return {
                    employee: {
                        _id: employee._id,
                        name: employee.name,
                        email: employee.email,
                        profilePicture: employee.profilePicture,
                    },
                    ticketStats: stats,
                    avgResolutionTimeHours: avgResTimeHours,
                    avgRating,
                    currentWorkload: workload,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                department,
                range,
                startDate,
                endDate,
                employees: employeeStats,
            },
        });
    } catch (error) {
        console.error('Error in getEmployeeAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/analytics/employee/:employeeId
 * Query params: range (1h, 24h, 10d, 1m, 1y)
 * Returns detailed analytics for a specific employee.
 */
export const getSingleEmployeeAnalytics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const adminUser = await User.findById(userId).select('role department');
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (adminUser.role !== 'admin' && adminUser.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { employeeId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json({ success: false, message: 'Invalid employee ID' });
        }

        const employee = await User.findById(employeeId).select('_id name email profilePicture department');
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Admins can only view employees in their department
        if (adminUser.role === 'admin' && employee.department !== adminUser.department) {
            return res.status(403).json({ success: false, message: 'Access denied to this employee' });
        }

        const range = req.query.range || '1m';
        const { startDate, endDate } = getDateRange(range);

        // Status breakdown - conditional date filtering
        const statusMatchQuery = { assignedTo: employee._id };
        if (startDate) {
            statusMatchQuery.createdAt = { $gte: startDate, $lte: endDate };
        }
        const statusStats = await Ticket.aggregate([
            { $match: statusMatchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const statusResult = {
            total: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
        };

        statusStats.forEach((stat) => {
            statusResult.total += stat.count;
            if (stat._id === 'open') statusResult.open = stat.count;
            if (stat._id === 'in-progress') statusResult.inProgress = stat.count;
            if (stat._id === 'resolved') statusResult.resolved = stat.count;
            if (stat._id === 'closed') statusResult.closed = stat.count;
        });

        // Priority breakdown
        const priorityMatchQuery = { assignedTo: employee._id };
        if (startDate) {
            priorityMatchQuery.createdAt = { $gte: startDate, $lte: endDate };
        }
        const priorityStats = await Ticket.aggregate([
            { $match: priorityMatchQuery },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 },
                },
            },
        ]);

        const priorityResult = { urgent: 0, high: 0, medium: 0, low: 0 };
        priorityStats.forEach((stat) => {
            if (priorityResult.hasOwnProperty(stat._id)) {
                priorityResult[stat._id] = stat.count;
            }
        });

        // Average resolution time
        const resMatchQuery = {
            assignedTo: employee._id,
            status: { $in: ['resolved', 'closed'] },
        };
        if (startDate) {
            resMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
        }
        const resolutionStats = await Ticket.aggregate([
            { $match: resMatchQuery },
            {
                $project: {
                    resolutionTime: { $subtract: ['$updatedAt', '$createdAt'] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgResolutionTime: { $avg: '$resolutionTime' },
                },
            },
        ]);

        const avgResolutionTimeMs = resolutionStats[0]?.avgResolutionTime || 0;
        const avgResolutionTimeHours = Math.round(avgResolutionTimeMs / (1000 * 60 * 60) * 10) / 10;

        // Average rating
        const ratingMatchQuery = {
            assignedTo: employee._id,
            status: { $in: ['resolved', 'closed'] },
            rating: { $gt: 0 },
        };
        if (startDate) {
            ratingMatchQuery.updatedAt = { $gte: startDate, $lte: endDate };
        }
        const ratingStats = await Ticket.aggregate([
            { $match: ratingMatchQuery },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    totalRated: { $sum: 1 },
                },
            },
        ]);

        const avgRating = ratingStats[0]?.avgRating ? Math.round(ratingStats[0].avgRating * 10) / 10 : null;
        const totalRated = ratingStats[0]?.totalRated || 0;

        // Current workload
        const currentWorkload = await Ticket.countDocuments({
            assignedTo: employee._id,
            status: { $in: ['open', 'in-progress'] },
        });

        // Recent tickets (last 10)
        const recentTicketsQuery = { assignedTo: employee._id };
        if (startDate) {
            recentTicketsQuery.createdAt = { $gte: startDate, $lte: endDate };
        }
        const recentTickets = await Ticket.find(recentTicketsQuery)
            .select('ticketId title status priority createdAt updatedAt rating')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    _id: employee._id,
                    name: employee.name,
                    email: employee.email,
                    profilePicture: employee.profilePicture,
                    department: employee.department,
                },
                range,
                startDate,
                endDate,
                ticketStats: statusResult,
                priorityBreakdown: priorityResult,
                avgResolutionTimeHours,
                customerSatisfaction: {
                    avgRating,
                    totalRated,
                },
                currentWorkload,
                recentTickets,
            },
        });
    } catch (error) {
        console.error('Error in getSingleEmployeeAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
