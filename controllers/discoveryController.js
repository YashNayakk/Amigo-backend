const User = require("../models/userModel");
const mongoose = require("mongoose");

exports.getDiscovery = async (req, res) => {
   const rawId = req?.user?.id ;
   try {
      const users = await User.aggregate([
         {
            $match: {
               _id:{$ne: new mongoose.Types.ObjectId(rawId)}
            }
         },
         {
            $lookup: {
               from: "performances",
               localField: "_id",
               foreignField: "user",
               as: "performance",
            },
         },
         {
            $unwind: {
               path: "$performance",
               preserveNullAndEmptyArrays: true,
            },
         },
         {
            $project: {
               password: 0,
               __v: 0,
               email: 0,
               "performance.__v": 0,
            },
         },
      ]);
      res.json(users)
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Discovery failed", error: err.message });
   }
};