//connect with database
// require('dotenv').config

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB().then(() => {

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    });

    app.on("error", (error) => {
        console.log("ERRR: ", error);
    });

}).catch((err) => {
    console.log("MONGODB connection failed !!!", err);
})











//approach 1

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//         app.on("error", (error) => {
//             console.log("ERRR: ", error);
//         });

//         app.listen(process.env.PORT, () => {
//             console.log(`App is Listening on port ${process.env.PORT}`);
//         })

//     }
//     catch (error) {
//         console.error("ERROR: ", error);
//     }
// })();
