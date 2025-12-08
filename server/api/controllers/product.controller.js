// product.controller.js
import Product from '../models/product.model.js';
import Department from '../models/department.model.js';
import User from '../models/user.model.js';

/**
 * GET /api/products
 * List all products (optionally filter by isActive)
 */
export const getAllProducts = async (req, res) => {
    try {
        const { active } = req.query;
        const filter = {};
        if (active !== undefined) {
            filter.isActive = active === 'true';
        }

        const products = await Product.find(filter)
            .populate('createdBy', 'name email')
            .populate('admin', 'name email profilePicture')
            .sort({ createdAt: -1 });

        // Log all products with their admin emails for debugging
        console.log('=== ALL PRODUCTS WITH ADMINS ===');
        products.forEach(p => {
            console.log(`Product: "${p.name}" | Admin: ${p.admin ? p.admin.email : 'NONE'}`);
        });
        console.log('================================');

        res.status(200).json({
            success: true,
            data: products,
        });
    } catch (error) {
        console.error('Error in getAllProducts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/products/:id
 * Get single product with its departments
 */
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate('createdBy', 'name email')
            .populate('admin', 'name email profilePicture');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Get departments for this product
        const departments = await Department.find({ product: id, isActive: true })
            .populate('lead', 'name email profilePicture')
            .select('name description lead members isActive');

        res.status(200).json({
            success: true,
            data: {
                product,
                departments,
            },
        });
    } catch (error) {
        console.error('Error in getProductById:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/products
 * Create a new product (admin/super-admin only)
 */
export const createProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        // Only super-admin can create products
        if (!user || user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Only super-admin can create products' });
        }

        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        // Check if product name already exists
        const existing = await Product.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Product name already exists' });
        }

        const product = new Product({
            name: name.trim(),
            description: description?.trim() || '',
            createdBy: userId,
        });

        await product.save();

        res.status(201).json({
            success: true,
            data: product,
            message: 'Product created successfully',
        });
    } catch (error) {
        console.error('Error in createProduct:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PUT /api/products/:id
 * Update a product (admin/super-admin only)
 */
export const updateProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id } = req.params;
        const { name, description, isActive } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if user is super-admin OR the product's admin
        const isProductAdmin = product.admin && product.admin.toString() === userId;
        if (user.role !== 'super-admin' && !isProductAdmin) {
            return res.status(403).json({ success: false, message: 'You are not authorized to edit this product' });
        }

        // Check for duplicate name if changing
        if (name && name.trim() !== product.name) {
            const existing = await Product.findOne({ name: name.trim(), _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Product name already exists' });
            }
            product.name = name.trim();
        }

        if (description !== undefined) product.description = description.trim();
        if (isActive !== undefined) product.isActive = isActive;

        await product.save();

        res.status(200).json({
            success: true,
            data: product,
            message: 'Product updated successfully',
        });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * DELETE /api/products/:id
 * Delete a product (super-admin only) - also deletes associated departments
 */
export const deleteProduct = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Only super-admin can delete products' });
        }

        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete all departments under this product
        await Department.deleteMany({ product: id });

        // Delete the product
        await Product.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Product and associated departments deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PUT /api/products/:id/admin
 * Set product admin (super-admin only)
 */
export const setProductAdmin = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Only super-admin can assign product admins' });
        }

        const { id } = req.params;
        const { adminId } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Verify the admin user exists and has admin role
        if (adminId) {
            const adminUser = await User.findById(adminId);
            if (!adminUser) {
                return res.status(404).json({ success: false, message: 'Admin user not found' });
            }
            // Optionally update user role to admin if they're not already
            if (adminUser.role === 'user' || adminUser.role === 'employee') {
                adminUser.role = 'admin';
                await adminUser.save();
            }
        }

        product.admin = adminId || null;
        await product.save();

        // Populate admin for response
        await product.populate('admin', 'name email profilePicture');

        res.status(200).json({
            success: true,
            data: product,
            message: adminId ? 'Product admin assigned successfully' : 'Product admin removed',
        });
    } catch (error) {
        console.error('Error in setProductAdmin:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
