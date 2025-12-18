import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';

export const markNotificationsAsSeen = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id || decoded.id; // ← ADD decoded.userId    
    const { notificationIds } = req.body;

    await User.findByIdAndUpdate(userId, {
      $addToSet: { seenNotificationIds: { $each: notificationIds } }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as seen' });
  }
};

export const getSeenNotifications = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id || decoded.id;
    const user = await User.findById(userId).select('seenNotificationIds');

    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ seenNotificationIds: user.seenNotificationIds || [] });
  } catch (error) {
    console.error('Get seen notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get seen notifications' });
  }
};


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate({
        path: "departments",
        select: "name product",
        populate: {
          path: "product",
          select: "name"
        }
      });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const getMyProducts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log("getMyProducts called, userId:", userId);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).populate('products', 'name _id');
    console.log("Found user:", user?.email, "products:", user?.products);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      products: user.products || [],
    });
  } catch (error) {
    console.error("getMyProducts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user products",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "departments",
        select: "name product",
        populate: {
          path: "product",
          select: "name"
        }
      });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, primaryPhone, email, role, department, profilePicture, telegramId } = req.body;

    const updateData = {
      name,
      primaryPhone,
      email,
      role,
      department,
      profilePicture,
      telegramId
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

export const signOut = (req, res) => {
  try {
    res.clearCookie('token').status(200).json('user has been signed out');
  } catch (error) {
    console.log(error.message);
  }
}

export const linkTelegramAccount = async (req, res) => {
  try {
    const { email, telegramId } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { telegramId },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'Telegram account linked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error linking account', error: error.message });
  }
};

export const getUserByTelegramId = async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};