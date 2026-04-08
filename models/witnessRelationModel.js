import { mongoose } from "mongoose";

const witnessRelationSchema = new mongoose.Schema({
    userA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,

    },

    userB: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,

    },



}, { timestamps: true });

witnessRelationSchema.index(
    { userA: 1, userB: 1 },
    { unique: true }
);

export default mongoose.model("WitnessRelation", witnessRelationSchema);