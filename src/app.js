import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// .use() is use for middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import
import userRouter from './routes/user.routes.js';


//routes  declaration
//pre routes
//http://localhost:8000/api/v1/users/register
app.use("/api/v1/users", userRouter)

export { app }