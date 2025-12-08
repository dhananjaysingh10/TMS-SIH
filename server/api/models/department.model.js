// department.model.js
import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        keywords: {
            type: [String],
            default: [],
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Ensure unique department name within a product
departmentSchema.index({ name: 1, product: 1 }, { unique: true });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
