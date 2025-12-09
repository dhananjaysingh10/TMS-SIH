// analytics.route.js
import express from 'express';
import {
    getDepartmentAnalytics,
    getEmployeeAnalytics,
    getSingleEmployeeAnalytics,
    getProductAnalytics
} from '../controllers/analytics.controller.js';
import { authMiddleware } from '../utils/verifyUser.js';

const router = express.Router();

// Department-level analytics (admin only)
// GET /api/analytics/department?range=1m
router.get('/department', authMiddleware, getDepartmentAnalytics);

// All employees in the department with summary stats (admin only)
// GET /api/analytics/employees?range=1m
router.get('/employees', authMiddleware, getEmployeeAnalytics);

// Single employee detailed analytics (admin only)
// GET /api/analytics/employee/:employeeId?range=1m
router.get('/employee/:employeeId', authMiddleware, getSingleEmployeeAnalytics);

// Product-wise aggregated stats (admin only)
// GET /api/analytics/products?range=1m
router.get('/products', authMiddleware, getProductAnalytics);

export default router;
