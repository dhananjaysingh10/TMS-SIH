// product.route.js
import express from 'express';
import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    setProductAdmin,
} from '../controllers/product.controller.js';
import { authMiddleware } from '../utils/verifyUser.js';

const router = express.Router();

// Public routes (still require auth for data access)
router.get('/', authMiddleware, getAllProducts);
router.get('/:id', authMiddleware, getProductById);

// Admin routes
router.post('/', authMiddleware, createProduct);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

// Super-admin only: assign product admin
router.put('/:id/admin', authMiddleware, setProductAdmin);

export default router;

