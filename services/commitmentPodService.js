import CommitmentPod from '../models/commitmentPodModel.js';
import Chat from '../models/chatModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import CardStats from '../models/CardStatsModel.js';
import Card from '../models/witnessCard.js';
import mongoose from 'mongoose';

class CommitmentPodService {

  static async createPod(adminId, { podName, customType, TimePeriod, witnesses, rules }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admin = await User.findById(adminId).session(session);
      if (!admin) throw new Error('User not found');

      const witnessUsers = await User.find({ _id: { $in: witnesses } }).session(session);
      if (witnessUsers.length !== witnesses.length) throw new Error('One or more witness users not found');

      const witnessArray = witnesses.map(witnessId => ({
        user:   witnessId,
        status: 'pending',
      }));

      const [pod] = await CommitmentPod.create([{
        admin: adminId,
        podName,
        customType,
        TimePeriod,
        rules,
        witnesses: witnessArray,
      }], { session });

      const notifications = witnesses.map(witnessId => ({
        recipient: witnessId,
        sender:    adminId,
        type:      'pod_invite',
        pod:       pod._id,
        message:   `${admin.name} invited you to witness their ${customType} commitment`,
      }));
      await Notification.insertMany(notifications, { session });

      await session.commitTransaction();

      return CommitmentPod.findById(pod._id)
        .populate('admin', 'name profilePicture')
        .populate('witnesses.user', 'name profilePicture');

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async deletePod(adminId, podId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');
      if (pod.admin.toString() !== adminId.toString()) throw new Error('Only the admin can delete this pod');
      if (!pod.active) throw new Error('Pod is already deleted');
      console.log("pod", pod)
      pod.active     = false;
      pod.deletedAt  = new Date();
      pod.deletedBy  = adminId;
      await pod.save({ session });

      const toNotify = pod.witnesses
        .filter(w => w.status === 'joined' || w.status === 'pending')
        .map(w => w.user);

      if (toNotify.length) {
        const admin = await User.findById(adminId).select('name').session(session);
        const notifications = toNotify.map(witnessId => ({
          recipient: witnessId,
          sender:    adminId,
          type:      'pod_deleted',
          pod:       pod._id,
          message:   `${admin.name} closed the ${pod.customType} commitment pod`,
        }));
        await Notification.insertMany(notifications, { session });
      }
      console.log("notify", toNotify)
      await session.commitTransaction();
      return { success: true };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async removeWitness(adminId, podId, witnessUserId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');
      if (pod.admin.toString() !== adminId.toString()) throw new Error('Only the admin can remove witnesses');
      if (!pod.active) throw new Error('Pod is not active');

      const witness = pod.witnesses.find(w => w.user.toString() === witnessUserId.toString());
      if (!witness) throw new Error('User is not a witness of this pod');
      if (witness.status === 'removed' || witness.status === 'left') {
        throw new Error(`Witness has already ${witness.status} the pod`);
      }

      witness.status     = 'removed';
      witness.removedAt  = new Date();
      await pod.save({ session });

      if (pod.chat) {
        await Chat.findByIdAndUpdate(
          pod.chat,
          { $pull: { participants: new mongoose.Types.ObjectId(witnessUserId) } },
          { session }
        );
      }

      const admin = await User.findById(adminId).select('name').session(session);
      await Notification.create([{
        recipient: witnessUserId,
        sender:    adminId,
        type:      'pod_removed',
        pod:       pod._id,
        message:   `${admin.name} removed you from the ${pod.customType} commitment pod`,
      }], { session });

      await session.commitTransaction();

      return CommitmentPod.findById(podId)
        .populate('admin', 'name profilePicture')
        .populate('witnesses.user', 'name profilePicture')
        .populate('chat');

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async getPodStreaks(podId, requesterId) {
    const pod = await CommitmentPod.findById(podId)
      .populate('admin', 'name profilePicture')
      .populate('witnesses.user', 'name profilePicture');

    if (!pod) throw new Error('Pod not found');

    const isAdmin   = pod.admin._id.toString() === requesterId.toString();
    const isWitness = pod.witnesses.some(w => w.user._id.toString() === requesterId.toString());
    if (!isAdmin && !isWitness) throw new Error('Not authorized');

    if (!pod.chat) return [];

    const members = [
      { user: pod.admin, role: 'admin' },
      ...pod.witnesses
        .filter(w => w.status === 'joined')
        .map(w => ({ user: w.user, role: 'witness' })),
    ];

    const memberIds = members.map(m => m.user._id);

    const statsMap = {};
    const allStats = await CardStats.find({ userId: { $in: memberIds }, chatId: pod.chat });
    allStats.forEach(s => { statsMap[s.userId.toString()] = s; });

    const today = new Date().toISOString().split('T')[0];

    return members.map(({ user, role }) => {
      const stats        = statsMap[user._id.toString()];
      const streak       = stats?.currentStreak  || 0;
      const bestStreak   = stats?.longestStreak   || 0;
      const totalCards   = stats?.totalCardsSent  || 0;
      const activeToday  = stats?.lastCardDate === today;

      return {
        user:        { _id: user._id, name: user.name, profilePicture: user.profilePicture },
        role,
        streak,
        bestStreak,
        totalCards,
        activeToday,    
        atRisk:         streak > 0 && !activeToday,
      };
    });
  }

  static async getWitnessPods(userId) {
    return CommitmentPod.find({
      witnesses: {
        $elemMatch: {
          user:   userId,
          status: { $nin: ['left', 'declined', 'removed'] },
        }
      },
      active: true,
    })
      .populate('admin', 'name profilePicture')
      .populate('witnesses.user', 'name profilePicture')
      .populate('chat')
      .sort({ createdAt: -1 });
  }

  static async getAdminPods(userId) {
    return CommitmentPod.find({ admin: userId, active: true })
      .populate('witnesses.user', 'name profilePicture')
      .populate('chat')
      .sort({ createdAt: -1 });
  }

  static async getPodById(podId, userId) {
    const pod = await CommitmentPod.findById(podId)
      .populate('admin', 'name profilePicture')
      .populate('witnesses.user', 'name profilePicture')
      .populate('chat');

    if (!pod) throw new Error('Pod not found');

    const isAdmin   = pod.admin._id.toString() === userId.toString();
    const isWitness = pod.witnesses.some(w => w.user._id.toString() === userId.toString());
    if (!isAdmin && !isWitness) throw new Error('Not authorized');

    return pod;
  }

  static async joinPod(userId, podId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');

      const witness = pod.witnesses.find(w => w.user.toString() === userId.toString());
      if (!witness)                        throw new Error('You were not invited to this pod');
      if (witness.status === 'joined')     throw new Error('Already joined');
      if (witness.status === 'declined')   throw new Error('You already declined this pod');
      if (witness.status === 'left')       throw new Error('You already left this pod');
      if (witness.status === 'removed')    throw new Error('You were removed from this pod');

      witness.status   = 'joined';
      witness.joinedAt = new Date();

      const joinedWitnessIds = pod.witnesses
        .filter(w => w.status === 'joined')
        .map(w => w.user);
      const allParticipants = [pod.admin, ...joinedWitnessIds];

      if (!pod.chat) {
        const [chat] = await Chat.create([{
          participants: allParticipants,
          type:         'Pod',
          pod:          pod._id,
          name:         pod.podName || `${pod.customType} commitment pod`,
        }], { session });
        pod.chat = chat._id;
      } else {
        await Chat.findByIdAndUpdate(
          pod.chat,
          { $addToSet: { participants: userId } },
          { session }
        );
      }

      await pod.save({ session });

      const user = await User.findById(userId).session(session);
      await Notification.create([{
        recipient: pod.admin,
        sender:    userId,
        type:      'pod_joined',
        pod:       pod._id,
        message:   `${user.name} joined your ${pod.customType} commitment pod`,
      }], { session });

      await session.commitTransaction();

      return CommitmentPod.findById(podId)
        .populate('admin', 'name profilePicture')
        .populate('witnesses.user', 'name profilePicture')
        .populate('chat');

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async declinePod(userId, podId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');

      const witness = pod.witnesses.find(w => w.user.toString() === userId.toString());
      if (!witness)                      throw new Error('You were not invited to this pod');
      if (witness.status !== 'pending')  throw new Error(`Already ${witness.status} this pod`);

      witness.status = 'declined';
      await pod.save({ session });

      const user = await User.findById(userId).session(session);
      await Notification.create([{
        recipient: pod.admin,
        sender:    userId,
        type:      'pod_declined',
        pod:       pod._id,
        message:   `${user.name} declined your ${pod.customType} commitment pod`,
      }], { session });

      await session.commitTransaction();
      return { success: true };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async leavePod(userId, podId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');

      const witness = pod.witnesses.find(w => w.user.toString() === userId.toString());
      if (!witness)                      throw new Error('You are not a witness of this pod');
      if (witness.status !== 'joined')   throw new Error('You have not joined this pod');

      witness.status = 'left';
      await pod.save({ session });

      if (pod.chat) {
        await Chat.findByIdAndUpdate(
          pod.chat,
          { $pull: { participants: new mongoose.Types.ObjectId(userId) } },
          { session }
        );
      }

      const user = await User.findById(userId).session(session);
      await Notification.create([{
        recipient: pod.admin,
        sender:    userId,
        type:      'pod_left',
        pod:       pod._id,
        message:   `${user.name} left your ${pod.customType} commitment pod`,
      }], { session });

      await session.commitTransaction();
      return { success: true };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async shareCard(userId, podId, { activityName, satisfactionLevel, customMessage }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const pod = await CommitmentPod.findById(podId).session(session);
      if (!pod) throw new Error('Pod not found');
      if (!pod.chat) throw new Error('No active chat for this pod yet');

      const isAdmin         = pod.admin.toString() === userId.toString();
      const isJoinedWitness = pod.witnesses.some(
        w => w.user.toString() === userId.toString() && w.status === 'joined'
      );
      if (!isAdmin && !isJoinedWitness) throw new Error('Not authorized to share cards in this pod');

      const [card] = await Card.create([{
        chatId: pod.chat,
        sender: userId,
        activityName,
        satisfactionLevel,
        customMessage: customMessage || '',
      }], { session });

      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let cardStats = await CardStats.findOne({ userId, chatId: pod.chat }).session(session);

      if (cardStats) {
        const isToday     = cardStats.dailyCards.date === today;
        const wasYesterday = cardStats.lastCardDate   === yesterdayStr;

        if (isToday) {
          cardStats.dailyCards.count += 1;
        } else {
          cardStats.dailyCards  = { date: today, count: 1 };
          cardStats.daysActive += 1;
          cardStats.currentStreak = wasYesterday ? cardStats.currentStreak + 1 : 1;
          if (cardStats.currentStreak > cardStats.longestStreak) {
            cardStats.longestStreak = cardStats.currentStreak;
          }
        }
        cardStats.totalCardsSent += 1;
        cardStats.lastCardDate    = today;
        await cardStats.save({ session });
      } else {
        [cardStats] = await CardStats.create([{
          userId,
          chatId:         pod.chat,
          podId,
          dailyCards:     { date: today, count: 1 },
          totalCardsSent: 1,
          daysActive:     1,
          currentStreak:  1,
          longestStreak:  1,
          lastCardDate:   today,
        }], { session });
      }

      await session.commitTransaction();
      return { card, cardStats };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async getPodCardStats(podId, requesterId) {
    const pod = await CommitmentPod.findById(podId);
    if (!pod) throw new Error('Pod not found');

    const isAdmin   = pod.admin.toString() === requesterId.toString();
    const isWitness = pod.witnesses.some(w => w.user.toString() === requesterId.toString());
    if (!isAdmin && !isWitness) throw new Error('Not authorized');

    return CardStats.find({ podId }).populate('userId', 'name profilePicture');
  }

  static async getPodCards(podId, requesterId, { page = 1, limit = 20 } = {}) {
    const pod = await CommitmentPod.findById(podId);
    if (!pod) throw new Error('Pod not found');

    const isAdmin   = pod.admin.toString() === requesterId.toString();
    const isWitness = pod.witnesses.some(w => w.user.toString() === requesterId.toString());
    if (!isAdmin && !isWitness) throw new Error('Not authorized');

    if (!pod.chat) return [];

    return Card.find({ chatId: pod.chat })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  static async getNotifications(userId) {
    return Notification.find({ recipient: userId })
      .populate('sender', 'name profilePicture')
      .populate('pod', 'customType TimePeriod podName')
      .sort({ createdAt: -1 })
      .limit(50);
  }

  static async markNotificationsRead(userId) {
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
    return { success: true };
  }
}

export default CommitmentPodService;