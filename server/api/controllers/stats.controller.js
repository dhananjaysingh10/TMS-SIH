import mongoose from 'mongoose';
import Ticket from '../models/ticket.model.js'; 
import User from '../models/user.model.js'; 

const getMonthRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1); 
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); 
  return { startDate, endDate };
};

export const getMyStats = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const { startDate, endDate } = getMonthRange(month, year);

    const stats = await Ticket.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    };

    stats.forEach((stat) => {
      if (stat._id === 'open') result.open = stat.count;
      if (stat._id === 'in-progress') result.inProgress = stat.count;
      if (stat._id === 'resolved') result.resolved = stat.count;
      if (stat._id === 'closed') result.closed = stat.count;
      result.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        stats: result,
      },
    });
  } catch (error) {
    console.error('Error in getMyStats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDepStats = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('role department');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const { startDate, endDate } = getMonthRange(month, year);

    let matchQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (user.role !== 'super-admin') {
      matchQuery.department = user.department;
    }

    const stats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            department: '$department',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {};
    let totalByDepartment = {};

    stats.forEach((stat) => {
      const dept = stat._id.department;
      if (!result[dept]) {
        result[dept] = {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        };
        totalByDepartment[dept] = 0;
      }

      if (stat._id.status === 'open') result[dept].open = stat.count;
      if (stat._id.status === 'in-progress') result[dept].inProgress = stat.count;
      if (stat._id.status === 'resolved') result[dept].resolved = stat.count;
      if (stat._id.status === 'closed') result[dept].closed = stat.count;
      result[dept].total += stat.count;
      totalByDepartment[dept] += stat.count;
    });

    const responseData = user.role === 'super-admin' ? result : { [user.department]: result[user.department] };

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        stats: responseData,
      },
    });
  } catch (error) {
    console.error('Error in getDepStats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};