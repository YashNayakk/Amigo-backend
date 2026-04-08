import express from "express"
const router = express.Router();
import {sendCard , getChatByUserId , getUserChats} from "../controllers/ChatController.js";
import { auth } from "../middlewares/authMiddleware.js";

router.get('/my-chats', auth, getUserChats);
router.get('/witness/:userId', auth , getChatByUserId);
router.post('/:chatId/card', auth , sendCard);

export default router;