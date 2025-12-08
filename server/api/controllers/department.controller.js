// department.controller.js
import Department from '../models/department.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

/**
 * GET /api/departments
 * List all departments (optionally filter by product or isActive)
 */
export const getAllDepartments = async (req, res) => {
    try {
        const { product, active } = req.query;
        const filter = {};

        if (product) {
            filter.product = product;
        }
        if (active !== undefined) {
            filter.isActive = active === 'true';
        }

        const departments = await Department.find(filter)
            .populate('product', 'name')
            .populate('lead', 'name email profilePicture')
            .populate('members', 'name email profilePicture')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: departments,
        });
    } catch (error) {
        console.error('Error in getAllDepartments:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/departments/:id
 * Get single department with members
 */
export const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const department = await Department.findById(id)
            .populate('product', 'name description')
            .populate('lead', 'name email profilePicture')
            .populate('members', 'name email profilePicture role');

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        res.status(200).json({
            success: true,
            data: department,
        });
    } catch (error) {
        console.error('Error in getDepartmentById:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/departments
 * Create a new department (admin/super-admin only)
 */
export const createDepartment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { name, product, description, leadId, keywords } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Department name is required' });
        }

        if (!product) {
            return res.status(400).json({ success: false, message: 'Product is required' });
        }

        // Verify product exists
        const productDoc = await Product.findById(product);
        if (!productDoc) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Check if department name already exists for this product
        const existing = await Department.findOne({ name: name.trim(), product });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Department name already exists for this product' });
        }

        const department = new Department({
            name: name.trim(),
            product,
            description: description?.trim() || '',
            lead: leadId || null,
            members: leadId ? [leadId] : [],
            keywords: keywords || [],
        });

        await department.save();

        // Populate for response
        await department.populate('product', 'name');
        await department.populate('lead', 'name email');

        res.status(201).json({
            success: true,
            data: department,
            message: 'Department created successfully',
        });
    } catch (error) {
        console.error('Error in createDepartment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * PUT /api/departments/:id
 * Update a department (admin/super-admin only)
 */
export const updateDepartment = async (req, res) => {
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
        const { name, description, leadId, isActive, keywords } = req.body;

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Check for duplicate name if changing
        if (name && name.trim() !== department.name) {
            const existing = await Department.findOne({
                name: name.trim(),
                product: department.product,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Department name already exists for this product' });
            }
            department.name = name.trim();
        }

        if (description !== undefined) department.description = description.trim();
        if (leadId !== undefined) {
            department.lead = leadId || null;
            // Add lead to members if not already
            if (leadId && !department.members.includes(leadId)) {
                department.members.push(leadId);
            }
        }
        if (isActive !== undefined) department.isActive = isActive;
        if (keywords !== undefined) department.keywords = keywords;

        await department.save();

        // Populate for response
        await department.populate('product', 'name');
        await department.populate('lead', 'name email');

        res.status(200).json({
            success: true,
            data: department,
            message: 'Department updated successfully',
        });
    } catch (error) {
        console.error('Error in updateDepartment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * DELETE /api/departments/:id
 * Delete a department (super-admin only)
 */
export const deleteDepartment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || user.role !== 'super-admin') {
            return res.status(403).json({ success: false, message: 'Only super-admin can delete departments' });
        }

        const { id } = req.params;

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        await Department.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Department deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteDepartment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/departments/:id/join
 * User joins a department
 */
export const joinDepartment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        if (!department.isActive) {
            return res.status(400).json({ success: false, message: 'Cannot join inactive department' });
        }

        // Check if already a member
        if (department.members.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Already a member of this department' });
        }

        department.members.push(userId);
        await department.save();

        res.status(200).json({
            success: true,
            message: 'Joined department successfully',
        });
    } catch (error) {
        console.error('Error in joinDepartment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/departments/:id/leave
 * User leaves a department
 */
export const leaveDepartment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id } = req.params;

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Check if user is a member
        const memberIndex = department.members.indexOf(userId);
        if (memberIndex === -1) {
            return res.status(400).json({ success: false, message: 'Not a member of this department' });
        }

        // Remove from members
        department.members.splice(memberIndex, 1);

        // If user is lead, remove as lead
        if (department.lead && department.lead.toString() === userId) {
            department.lead = null;
        }

        await department.save();

        res.status(200).json({
            success: true,
            message: 'Left department successfully',
        });
    } catch (error) {
        console.error('Error in leaveDepartment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/departments/:id/members
 * Add a member to department (admin only)
 */
export const addMember = async (req, res) => {
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
        const { memberId } = req.body;

        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Member ID is required' });
        }

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Verify member exists
        const member = await User.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if already a member
        if (department.members.includes(memberId)) {
            return res.status(400).json({ success: false, message: 'User is already a member' });
        }

        // Add member to department
        department.members.push(memberId);
        await department.save();

        // Add department and product to user's arrays
        if (!member.departments.includes(id)) {
            member.departments.push(id);
        }
        if (department.product && !member.products.includes(department.product)) {
            member.products.push(department.product);
        }
        await member.save();

        res.status(200).json({
            success: true,
            message: 'Member added successfully',
        });
    } catch (error) {
        console.error('Error in addMember:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * DELETE /api/departments/:id/members/:memberId
 * Remove a member from department (admin only)
 */
export const removeMember = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('role');
        if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id, memberId } = req.params;

        const department = await Department.findById(id);
        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        // Check if user is a member
        const memberIndex = department.members.findIndex(m => m.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(400).json({ success: false, message: 'User is not a member of this department' });
        }

        // Remove from members
        department.members.splice(memberIndex, 1);

        // If user is lead, remove as lead
        if (department.lead && department.lead.toString() === memberId) {
            department.lead = null;
        }

        await department.save();

        // Remove department from user's departments array
        const member = await User.findById(memberId);
        if (member) {
            member.departments = member.departments.filter(d => d.toString() !== id);

            // Check if user has any other departments in this product
            // If not, remove the product from user's products array
            if (department.product) {
                const otherDepsInProduct = await Department.find({
                    product: department.product,
                    members: memberId
                });
                if (otherDepsInProduct.length === 0) {
                    member.products = member.products.filter(p => p.toString() !== department.product.toString());
                }
            }

            await member.save();
        }

        res.status(200).json({
            success: true,
            message: 'Member removed successfully',
        });
    } catch (error) {
        console.error('Error in removeMember:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * GET /api/departments/my
 * Get departments the current user belongs to
 */
export const getMyDepartments = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const departments = await Department.find({
            members: userId,
            isActive: true
        })
            .populate('product', 'name')
            .populate('lead', 'name email profilePicture')
            .select('name description product lead');

        res.status(200).json({
            success: true,
            data: departments,
        });
    } catch (error) {
        console.error('Error in getMyDepartments:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
