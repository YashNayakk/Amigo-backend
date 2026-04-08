const mongoose = require("mongoose");
const { repairIndex } = require("../models/performanceModel");

require("dotenv").config();

const connectWithDB = () => {
    const mongoose = require("mongoose");
    
    mongoose.connect(process.env.DATABASE_URL)
        .then(() => {
            console.log("DB connnection successful");
            return repairIndex();
        })
        .catch((error) => {
            
            console.log("db error", error);
            process.exit(1);
        })

};





module.exports = connectWithDB;