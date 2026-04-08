import Chat from "../models/chatModel.js";
import Card from "../models/witnessCard.js";
import CardStats from "../models/CardStatsModel.js";
import WitnessRelation from "../models/witnessRelationModel.js";

class ChatService {
  async getChatByUserId(currentUserId, targetUserId) {
    const relation = await WitnessRelation.findOne({
      $or: [
        { userA: currentUserId, userB: targetUserId },
        { userA: targetUserId, userB: currentUserId },
      ],
    });

    if (!relation) {
      throw new Error("No witness relationship found");
    }

    const chat = await Chat.findOne({
      participants: { $all: [currentUserId, targetUserId] },
      type: "Witness",
    }).populate("participants", "name profilePicture");

    if (!chat) {
      throw new Error("Chat not found");
    }

    const cards = await Card.find({ chatId: chat._id })
      .populate("sender", "name profilePicture")
      .sort({ createdAt: 1 });

    const userStats = await CardStats.findOne({
      userId: currentUserId,
      chatId: chat._id,
    });

    const today = new Date().toISOString().split("T")[0];
    const cardsToday =
      userStats?.dailyCards?.date === today ? userStats.dailyCards.count : 0;

    const otherUser = chat.participants.find(
      (p) => p._id.toString() !== currentUserId
    );

    return {
      chatId: chat._id,
      otherUser: {
        id: otherUser._id,
        name: otherUser.name,
        profilePicture: otherUser.profilePicture,
      },
      cards: cards.map((card) => ({
        id: card._id,
        sender: {
          id: card.sender._id,
          name: card.sender.name,
          profilePicture: card.sender.profilePicture,
        },
        activityName: card.activityName,
        satisfactionLevel: card.satisfactionLevel,
        customMessage: card.customMessage,
        timestamp: card.createdAt,
        isMine: card.sender._id.toString() === currentUserId,
      })),
      stats: {
        daysShared: userStats?.daysActive || 0,
        totalCardsSent: userStats?.totalCardsSent || 0,
        cardsRemainingToday: 3 - cardsToday,
      },
    };
  }

  async getUserChats(userId) {
    console.log("Getting chats for user:", userId);

    const chats = await Chat.find({
      participants: userId,
      type: "Witness",
    })
      .populate("participants", "name profilePicture")
      .sort({ updatedAt: -1 });

    console.log("Found chats:", chats.length);

    if (!chats || chats.length === 0) {
      return [];
    }

    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        if (!chat.participants || chat.participants.length === 0) {
          console.log("Chat has no participants:", chat._id);
          return null;
        }

        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        if (!otherUser) {
          console.log("No other user found in chat:", chat._id);
          return null;
        }

        const lastCard = await Card.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .limit(1);

        return {
          id: chat._id,
          chatId: chat._id,
          user: {
            id: otherUser._id,
            name: otherUser.name,
            profilePicture: otherUser.profilePicture,
          },
          lastActivity: lastCard
            ? {
              activityName: lastCard.activityName,
              timestamp: lastCard.createdAt,
            }
            : null,
          type: "witness",
        };
      })
    );

    const validChats = formattedChats.filter((chat) => chat !== null);
    console.log("Returning formatted chats:", validChats.length);

    return validChats;
  }

  async sendCard(chatId, userId, cardData) {
    const { activityName, satisfactionLevel, customMessage } = cardData;

    if (!activityName || !satisfactionLevel)
      throw new Error('Activity name and satisfaction level are required');
    if (satisfactionLevel < 1 || satisfactionLevel > 5)
      throw new Error('Satisfaction level must be between 1 and 5');

    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error('Chat not found');
    if (!chat.participants.some(p => p.toString() === userId))
      throw new Error('Unauthorized');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let userStats = await CardStats.findOne({ userId, chatId });
    if (!userStats) {
      userStats = await CardStats.create({
        userId,
        chatId,
        dailyCards: { date: today, count: 0 },
        totalCardsSent: 0,
        daysActive: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
    }

    const cardsToday = userStats.dailyCards.date === today
      ? userStats.dailyCards.count : 0;
    if (cardsToday >= 3)
      throw new Error('Daily limit reached. Maximum 3 cards per day.');

    const card = await Card.create({
      chatId,
      sender: userId,
      activityName: activityName.trim(),
      satisfactionLevel,
      customMessage: customMessage ? customMessage.trim() : '',
    });

    const isToday = userStats.dailyCards.date === today;
    const wasYesterday = userStats.lastCardDate === yesterdayStr;

    if (isToday) {
      userStats.dailyCards.count += 1;
    } else {
      userStats.dailyCards = { date: today, count: 1 };
      userStats.daysActive += 1;
      userStats.currentStreak = wasYesterday ? userStats.currentStreak + 1 : 1;
      if (userStats.currentStreak > userStats.longestStreak)
        userStats.longestStreak = userStats.currentStreak;
    }

    userStats.totalCardsSent += 1;
    userStats.lastCardDate = today;
    await userStats.save();

    chat.updatedAt = new Date();
    await chat.save();

    await card.populate('sender', 'name profilePicture');

    return {
      card: {
        _id: card._id,
        sender: { _id: card.sender._id, name: card.sender.name, profilePicture: card.sender.profilePicture },
        activityName: card.activityName,
        satisfactionLevel: card.satisfactionLevel,
        customMessage: card.customMessage,
        timestamp: card.createdAt,
        isMine: true,
      },
      stats: {
        cardsRemainingToday: 3 - userStats.dailyCards.count,
        daysShared: userStats.daysActive,
        totalCardsSent: userStats.totalCardsSent,
      },
    };
  }

}

export default new ChatService();
