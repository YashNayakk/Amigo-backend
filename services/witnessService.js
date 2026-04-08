import WitnessRequest from "../models/witnessRequestModel.js";
import WitnessRelation from "../models/witnessRelationModel.js";
import Chat from "../models/chatModel.js";
import CardStats from "../models/CardStatsModel.js";
import mongoose from "mongoose";

class WitnessService {
  async sendWitnessRequest(requesterId, targetId) {
    if (!targetId) throw new Error("Target user ID is required");
    if (requesterId === targetId) throw new Error("Cannot send request to yourself");

    const existingRequest = await WitnessRequest.findOne({
      requesterId,
      targetId,
      status: "pending",
    });
    if (existingRequest) throw new Error("Request already sent");

    const existingRelation = await WitnessRelation.findOne({
      $or: [
        { userA: requesterId, userB: targetId },
        { userA: targetId, userB: requesterId },
      ],
    });
    if (existingRelation) throw new Error("Already connected as witnesses");

    return WitnessRequest.create({ requesterId, targetId, status: "pending" });
  }

  async getIncomingWitnessRequests(userId) {
    const requests = await WitnessRequest.find({ targetId: userId, status: "pending" })
      .populate("requesterId", "name profilePicture")
      .sort({ createdAt: -1 });

    return requests.map(req => ({
      requestId: req.id,
      requester: req.requesterId,
      createdAt: req.createdAt,
    }));
  }

  async respondingWitnessResquest({ userId, requestId, action }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const request = await WitnessRequest.findById(requestId).session(session);
      if (!request) throw new Error("Witness request not found");
      if (request.targetId.toString() !== userId.toString()) throw new Error("Not allowed to respond to this request");
      if (request.status !== "pending") return { status: request.status };

      if (action === "declined") {
        request.status = "declined";
        request.respondedAt = new Date();
        await request.save({ session });
        await session.commitTransaction();
        return { status: "declined" };
      }

      if (action === "accept") {
        request.status = "accepted";
        request.respondedAt = new Date();
        await request.save({ session });

        const [userA, userB] = [request.requesterId, request.targetId].sort();

        const [relation] = await WitnessRelation.create([{ userA, userB }], { session });

        await WitnessRequest.updateMany(
          { _id: { $in: [request.requesterId, request.targetId] } },
          { $inc: { WitnessCount: 1 } },
          { session }
        );

        const [chat] = await Chat.create([{
          participants: [request.requesterId, request.targetId],
          type: "Witness",
        }], { session, ordered: true });

        const today = new Date().toISOString().split("T")[0];

        await CardStats.create([
          { userId: userA, chatId: chat._id, dailyCards: { date: today, count: 0 }, totalCardsSent: 0, daysActive: 0 },
          { userId: userB, chatId: chat._id, dailyCards: { date: today, count: 0 }, totalCardsSent: 0, daysActive: 0 },
        ], { session, ordered: true });

        await session.commitTransaction();
        return { status: "accepted", relationId: relation._id, chatId: chat._id };
      }

      throw new Error("Invalid action");

    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getUserConnections(userId) {
    const relations = await WitnessRelation.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate("userA", "name profilePicture")
      .populate("userB", "name profilePicture")
      .sort({ createdAt: -1 });

    return relations.map(relation => {
      const otherUser = relation.userA._id.toString() === userId.toString()
        ? relation.userB
        : relation.userA;

      return {
        id: relation._id,
        relationId: relation._id,
        user: {
          id: otherUser._id,
          name: otherUser.name,
          profilePicture: otherUser.profilePicture,
        },
        createdAt: relation.createdAt,
      };
    });
  }
}

export default new WitnessService();