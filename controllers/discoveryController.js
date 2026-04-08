const User = require("../models/userModel");

exports.getDiscovery = async (req, res) => {
   try {
      const users = await User.aggregate([
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

      res.json(users);
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Discovery failed", error: err.message });
   }
};