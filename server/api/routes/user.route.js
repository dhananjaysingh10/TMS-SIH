import express from "express";
import { markNotificationsAsSeen, getSeenNotifications, getAllUsers, getUserById, updateUser, deleteUser, signOut, linkTelegramAccount, getUserByTelegramId } from "../controllers/user.controller.js";

const router = express.Router();

router.put('/mark-notifications-seen', (req, res, next) => {
  markNotificationsAsSeen(req, res, next);
});

router.get('/seen-notifications', (req, res, next) => {
  getSeenNotifications(req, res, next);  
});
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/update/:id", updateUser);
// router.delete("/:id", deleteUser);
router.post('/signout', signOut);
router.put('/linkTelegram', linkTelegramAccount);
router.get('/byTelegramId/:telegramId', getUserByTelegramId);

export default router;