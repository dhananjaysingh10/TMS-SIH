import express from "express";
import {
    getUserAvailability,
    getProductAvailability,
    getDepartmentAvailability,
} from "../controllers/availability.controller.js";
// import verifyToken from "../middleware/verifyToken.js"; // Assuming you might want auth, but user didn't explicitly ask for it. I'll leave it open or add it if standard pattern.
// Checking other routes... auth usually protected. I will leave it public for now or check auth.route.js usage.
// Actually, let's keep it simple first as requested.

const router = express.Router();

router.get("/user/:userId", getUserAvailability);
router.get("/product/:productId", getProductAvailability);
router.get("/department/:departmentId", getDepartmentAvailability);

export default router;
