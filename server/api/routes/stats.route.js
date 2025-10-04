import express from 'express';
import { getMyStats, getDepStats } from '../controllers/stats.controller.js';
import { authMiddleware } from '../utils/verifyUser.js';

const router = express.Router();

// pesonal stats
router.get('/mystats', authMiddleware, getMyStats); // it will get total allocated ticket to me, total solved(resolved), in progress, closed, filtred by month 


// department stats
router.get('/depstats', authMiddleware, getDepStats); // it will get total allocated ticket in department, total solved(resolved), in progress, closed, filtred by month 
// return data of all department if user is super admin, otherwise returen data of his department is user is admin

export default router;