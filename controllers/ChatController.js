import ChatService from "../services/ChatService.js";

export async function getChatByUserId(req, res) {
  try {
    const currentUserId = req?.user?.id;
    const { userId } = req?.params;

    const chatData = await ChatService.getChatByUserId(currentUserId, userId);

    res.status(200).json({
      success: true,
      data: chatData,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export  async function getUserChats(req, res) {
  try {
    const userId = req?.user?.id;
    const chats = await ChatService.getUserChats(userId);

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export  async function sendCard(req, res) {
  try {
    const userId = req?.user?.id;
    const { chatId } = req?.params;
    const cardData = req?.body;

    const result = await ChatService.sendCard(chatId, userId, cardData);

    res.status(200).json({
      success: true,
      message: "Card sent successfully",
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes("Daily limit") ? 429 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
}