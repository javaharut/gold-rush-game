const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
// const redis = require("redis");
// const schedule = require("node-schedule");

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
mongoose.connect(
  "mongodb://root:password@0.0.0.0:27017/goldrush?authSource=admin",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Redis connection
// const redisClient = redis.createClient();
// redisClient
//   .on("error", (err) => {
//     console.error("Redis error:", err);
//   })
//   .connect();

// Mongoose Models
const Event = mongoose.model(
  "Event",
  new mongoose.Schema({
    active: Boolean,
    endsAt: Date,
  })
);

const Bucket = mongoose.model(
  "Bucket",
  new mongoose.Schema({
    event_id: mongoose.Schema.Types.ObjectId,
    bucket_id: String,
    players: Array,
  })
);

const Player = mongoose.model(
  "Player",
  new mongoose.Schema({
    player_id: String,
    event_id: mongoose.Schema.Types.ObjectId,
    bucket_id: String,
    gold: Number,
    rank: String,
    reward: Number,
    eventCompleted: Boolean,
  })
);

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("playerEnter", async (data) => {
    const event = await Event.findOne().sort("-_id");
    let player = await Player.findOne({ player_id: data.token });

    if (!player) {
      console.log("A new player entered the game");

      player = await Player.create({
        player_id: data.token,
        event_id: event.id,
        bucket_id: event.id, // TODO implement bucket id later
        gold: 0,
        rank: data.player_type,
        reward: 0,
        eventCompleted: false,
      });
    }

    socket.emit("playerEntered", { player_id: player._id });
  });

  socket.on("report", async (data) => {
    const gold = data.gold;
    let event = await Event.findOne({ active: true }).exec();
    let event_id = "";
    if (!event) {
      event = await Event.create({
        active: true,
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }
    event_id = event._id;

    const player = await Player.findOne({
      _id: data.player_id,
      event_id: event_id,
    }).exec();

    // console.log(player.gold, data, event_id);

    player.gold = gold;
    await player.save();

    const bucketKey = `bucket:${event_id}`;
  });

  // Send latest leaderboard via socket.io to client
  // setInterval(async () => {
  //   const players = await Player.find({}).exec();

  //   const res = Array.from({ length: 200 }).map((_, i) => ({
  //     _id: i,
  //     player_id: i,
  //     gold: Math.floor(Math.random() * 1000),
  //   }))

  //   console.log(res);

  //   socket.emit("leaderboard", res);
  // }, 3000);
});

// Socket.IO connection handling
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) return next(new Error("Authentication error"));
  // jwt.verify(token, "your_secret_key", (err, decoded) => {
  //   if (err) return next(new Error("Authentication error"));
  //   socket.userId = decoded.id;
  //   socket.userType = decoded.type;
  //   next();
  // });
  next();
});

// TODO update to use bucket id for filtering
app.get("/leaderboard", async (req, res) => {
  const player_id = req.query.player_id;

  const player = await Player.findOne({ player_id: player_id });
  if (!player) {
    return res.status(404).send({ message: "Player not found in any bucket." });
  }

  const bucketId = player.bucketId;

  const players = await Player.find({ bucketId: bucketId })
    .sort({ gold: -1 })
    .exec();
  res.status(200).send(players);
});

app.post("/claim", (req, res) => {
  const player_id = req.query.player_id;

  // Find the player's final ranking
  Player.findOne({ player_id: player_id }, (err, player) => {
    if (err) return res.status(500).send(err);
    if (!player) return res.status(404).send({ message: "Player not found." });

    const rank = player.rank;
    const reward = 200 - rank;

    // Grant reward to player and mark event as completed for the player
    Player.updateOne(
      { player_id: player_id },
      { $set: { reward: reward, eventCompleted: true } },
      (err) => {
        if (err) return res.status(500).send(err);
        res.status(200).send({ reward: reward });
      }
    );
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
