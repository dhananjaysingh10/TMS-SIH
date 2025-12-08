// product.route.js
import express from 'express';
import {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
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

export default router;
