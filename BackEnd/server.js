const express = require("express");
const cors = require("cors");
const passport = require("./util/passport");
const connectDB = require("./util/mongodb");
const authRouter = require("./routes/auth");
const redisClient = require("./util/redis");
const port = 5000;

const app = express();

connectDB()
  .then(() => {
    redisClient.connect();
  })
  .then(() => {
    console.log("Connected to Redis");
  })
  .then(() => {
    app.use(cors({ origin: "http://localhost:3000", credentials: true }));
    app.use(express.json());
    app.use(passport.initialize());

    app.use("/auth", authRouter);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
