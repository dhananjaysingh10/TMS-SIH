// department.route.js
import express from 'express';
import {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    joinDepartment,
    leaveDepartment,
    addMember,
    removeMember,
    getMyDepartments,
} from '../controllers/department.controller.js';
import { authMiddleware } from '../utils/verifyUser.js';

const router = express.Router();

// User's own departments
router.get('/my', authMiddleware, getMyDepartments);

// List and details
router.get('/', authMiddleware, getAllDepartments);
router.get('/:id', authMiddleware, getDepartmentById);

// Admin CRUD
router.post('/', authMiddleware, createDepartment);
router.put('/:id', authMiddleware, updateDepartment);
router.delete('/:id', authMiddleware, deleteDepartment);

// Membership
router.post('/:id/join', authMiddleware, joinDepartment);
router.post('/:id/leave', authMiddleware, leaveDepartment);
router.post('/:id/members', authMiddleware, addMember);
router.delete('/:id/members/:memberId', authMiddleware, removeMember);

export default router;
