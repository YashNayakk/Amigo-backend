import jwt from 'jsonwebtoken';
import CardStats from '../models/CardStatsModel.js';
import ChatService from './ChatService.js';
import CommitmentPodService from './commitmentPodService.js';

export function initializeSocketHandlers(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Unauthorized: no token'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.data.userId = (decoded.id || decoded._id)?.toString();
            if (!socket.data.userId) return next(new Error('Unauthorized: bad payload'));
            next();
        } catch {
            next(new Error('Unauthorized: invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);
        console.log(`[socket] User ${userId} connected — ${socket.id}`);

        socket.on('join:chat', ({ chatId }, cb) => {
            try {
                socket.join(`chat:${chatId}`);
                console.log(`[socket] User ${userId} joined chat: ${chatId}`);
                cb?.({ success: true, chatId });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('leave:chat', ({ chatId }, cb) => {
            try {
                socket.leave(`chat:${chatId}`);
                cb?.({ success: true });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('card:send', async (data, cb) => {
            try {
                const { chatId, activityName, satisfactionLevel, customMessage } = data;
                if (!chatId) throw new Error('chatId is required');

                const result = await ChatService.sendCard(chatId, userId, {
                    activityName,
                    satisfactionLevel,
                    customMessage,
                });

                io.to(`chat:${chatId}`).emit('card:received', {
                    card: { ...result.card, chatId },
                    stats: result.stats,
                });

                cb?.({ success: true, card: result.card, stats: result.stats });
                console.log(`[socket] Card sent by ${userId} in chat ${chatId}`);
            } catch (err) {
                console.error('[socket] card:send error:', err.message);
                cb?.({
                    success: false,
                    message: err.message,
                    code: err.message.includes('Daily limit') ? 429 : 400,
                });
            }
        });

        socket.on('stats:request', async ({ chatId }, cb) => {
            try {
                const userStats = await CardStats.findOne({ userId, chatId });
                const today = new Date().toISOString().split('T')[0];
                const cardsToday = userStats?.dailyCards?.date === today
                    ? userStats.dailyCards.count : 0;

                cb?.({
                    success: true,
                    stats: {
                        totalCardsSent:      userStats?.totalCardsSent || 0,
                        cardsRemainingToday: 3 - cardsToday,
                        daysActive:          userStats?.daysActive || 0,
                        currentStreak:       userStats?.currentStreak || 0,
                        longestStreak:       userStats?.longestStreak || 0,
                    },
                });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('chat:message', (msg, cb) => {
            try {
                if (!msg?.chatId) throw new Error('chatId is required');
                io.to(`chat:${msg.chatId}`).emit('chat:message:received', {
                    ...msg,
                    senderId: userId,
                    timestamp: new Date(),
                });
                cb?.({ success: true });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('join:pod', ({ podId }, cb) => {
            try {
                socket.join(`pod:${podId}`);
                console.log(`[socket] User ${userId} joined pod room: ${podId}`);
                cb?.({ success: true, podId });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('leave:pod', ({ podId }, cb) => {
            try {
                socket.leave(`pod:${podId}`);
                cb?.({ success: true });
            } catch (err) {
                cb?.({ success: false, message: err.message });
            }
        });

        socket.on('pod:card:send', async (data, cb) => {
            try {
                const { podId, activityName, satisfactionLevel, customMessage } = data;
                if (!podId) throw new Error('podId is required');

                const result = await CommitmentPodService.shareCard(userId, podId, {
                    activityName, satisfactionLevel, customMessage,
                });

                await result.card.populate('sender', 'name profilePicture');

                const cardPayload = {
                    _id:              result.card._id,
                    sender:           { _id: result.card.sender._id, name: result.card.sender.name },
                    activityName:     result.card.activityName,
                    satisfactionLevel: result.card.satisfactionLevel,
                    customMessage:    result.card.customMessage,
                    createdAt:        result.card.createdAt,
                };

                const statsPayload = {
                    cardsRemainingToday: 3 - result.cardStats.dailyCards.count,
                    totalCardsSent:      result.cardStats.totalCardsSent,
                    avgSatisfaction:     null,
                };

                io.to(`pod:${podId}`).emit('pod:card:received', {
                    card:  cardPayload,
                    stats: statsPayload,
                });

                cb?.({ success: true, card: cardPayload, stats: statsPayload });
            } catch (err) {
                console.error('[socket] pod:card:send error:', err.message);
                cb?.({ success: false, message: err.message, code: err.message.includes('Daily limit') ? 429 : 400 });
            }
        });

        socket.on('error', (err) => {
            console.error(`[socket] Error for user ${userId}:`, err);
        });

        socket.on('disconnect', (reason) => {
            console.log(`[socket] User ${userId} disconnected — ${reason}`);
        });
    });

    return io;
}

export function emitStatsUpdate(io, chatId, userId, stats) {
    io.to(`chat:${chatId}`).emit('stats:updated', { userId, chatId, stats, timestamp: new Date() });
}

export function emitCardSent(io, chatId, card) {
    io.to(`chat:${chatId}`).emit('card:received', { card, timestamp: new Date() });
}