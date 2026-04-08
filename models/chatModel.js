import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    ],

    type: {
        type: String,
        enum: ["Witness", "Pod"],
        default: "Witness"
    },
   
    pod: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommitmentPod",
        default: null
    },


    name: {
        type: String,
        default: null
    }
}, { timestamps: true });

chatSchema.index({ participants: 1 });

export default mongoose.model("Chat", chatSchema)