import express from "express";
import { getAllUsers, getUserById, updateUser, deleteUser, signOut } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post('/signout', signOut);

export default router;