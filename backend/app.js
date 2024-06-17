import express from "express";
import cors from "cors";
import { connect } from "mongoose";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { scheduleJob } from "node-schedule";
import { hash, compare } from "bcrypt";
import auth from "./auth.js";
import { Event, Bucket, User } from "./models.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

connect("mongodb://root:password@mongodb:27017/goldrush?authSource=admin", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// register endpoint
app.post("/register", (req, res) => {
  // hash the password
  hash(req.body.password, 10)
    .then((hashedPassword) => {
      // create a new user instance and collect the data
      const user = new User({
        email: req.body.email,
        password: hashedPassword,
      });

      // save the new user
      user
        .save()
        // return success if the new user is added to the database successfully
        .then((result) => {
          res.status(201).send({
            message: "User Created Successfully",
            result,
          });
        })
        // catch error if the new user wasn't added successfully to the database
        .catch((error) => {
          res.status(500).send({
            message: "Error creating user",
            error,
          });
        });
    })
    // catch error if the password hash isn't successful
    .catch((e) => {
      res.status(500).send({
        message: "Password was not hashed successfully",
        e,
      });
    });
});

// login endpoint
app.post("/login", (req, res) => {
  // check if email exists
  User.findOne({ email: req.body.email })

    // if email exists
    .then((user) => {
      // compare the password entered and the hashed password found
      compare(req.body.password, user.password)
        // if the passwords match
        .then((passwordCheck) => {
          // check if password matches
          if (!passwordCheck) {
            return res.status(400).send({
              message: "Passwords does not match",
              error,
            });
          }

          //   create JWT token
          const token = jwt.sign(
            {
              user_id: user._id,
              userEmail: user.email,
            },
            "RANDOM-TOKEN",
            { expiresIn: "24h" }
          );

          //   return success res
          res.status(200).send({
            message: "Login Successful",
            email: user.email,
            token,
          });
        })
        // catch error if password does not match
        .catch((error) => {
          res.status(400).send({
            message: "Passwords does not match",
            error,
          });
        });
    })
    // catch error if email does not exist
    .catch((e) => {
      res.status(404).send({
        message: "Email not found",
        e,
      });
    });
});

app.get("/event", auth, async (req, res) => {
  let currentEvent = await Event.findOne({ state: "active" }).lean();

  if (!currentEvent) {
    currentEvent = await Event.create({
      state: "active",
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
      buckets: [],
    });
  }

  if (!currentEvent) return res.status(404).send("No event found");

  res.json({
    _id: currentEvent._id,
    state: currentEvent.state,
    endsAt: currentEvent.endsAt,
  });
});

app.post("/report", auth, async (req, res) => {
  const { gold, event_id, type } = req.body;
  const currentEvent = await Event.findOne({ _id: event_id });

  if (!currentEvent) return res.status(400).send("No active event");

  if (currentEvent.state === "ended") {
    return res.json({
      status: "success",
      message: "Event finished, claim your rewards",
    });
  }

  const player_id = req.user.user_id;

  let playerBucket = await Bucket.findOne({
    _id: { $in: currentEvent.buckets },
    "players.player_id": player_id,
  }).exec();

  // If the player is not found in any bucket, find an available bucket
  if (!playerBucket) {
    playerBucket = await Bucket.findOne({
      _id: { $in: currentEvent.buckets },
      $and: [
        type === "whale" && {
          whales: { $lt: 10 },
          "players.type": "whale",
        },
        type === "dolphins" && {
          dolphins: { $lt: 40 },
          "players.type": "dolphin",
        },
        type === "fish" && { fish: { $lt: 150 }, "players.type": "fish" },
      ].filter(Boolean),
    });

    if (!playerBucket) {
      // Create a new bucket if no available bucket is found
      playerBucket = new Bucket();
      playerBucket.players.push({
        player_id,
        type,
        gold,
      });
      playerBucket[type]++;
      await playerBucket.save();

      currentEvent.buckets.push(playerBucket._id);
      await currentEvent.save();
    } else {
      // Add player to the found available bucket
      playerBucket.players.push({
        player_id,
        type,
        gold,
      });
      playerBucket[type]++;
      await playerBucket.save();
    }
  } else {
    // If the player is already in a bucket, update their gold
    const player = playerBucket.players.find((p) => p.player_id === player_id);
    player.gold = gold;
    await playerBucket.save();
  }

  res.json({ status: "success", message: "Score reported successfully" });
});

app.get("/leaderboard", auth, async (req, res) => {
  const event_id = req.query.event_id;
  let currentEvent = await Event.findOne({ _id: event_id }).lean();

  const player_id = req.user.user_id;

  let playerBucket = await Bucket.findOne({
    _id: { $in: currentEvent.buckets },
    "players.player_id": player_id,
  }).exec();

  if (!playerBucket) return res.status(400).send("No active event");

  const leaderboard = playerBucket.players.sort((a, b) => b.gold - a.gold);
  res.json(leaderboard);
});

app.post("/claim", auth, async (req, res) => {
  const { event_id } = req.body;
  const currentEvent = await Event.findOne({ _id: event_id, state: "ended" });

  if (!currentEvent)
    return res.status(400).send("No event to claim rewards from");

  const player_id = req.user.user_id;

  const playerBucket = await Bucket.findOne({
    _id: { $in: currentEvent.buckets },
    "players.player_id": player_id,
  }).exec();

  if (!playerBucket)
    return res.status(404).send("Player not found in any bucket");

  const leaderboard = playerBucket.players.sort((a, b) => b.gold - a.gold);
  const rank = leaderboard.findIndex((p) => p.player_id === player_id) + 1;
  const reward = 200 - rank;

  res.json({ reward: `${reward} silver nuggets` });
});

const startEvent = async () => {
  const end_time = new Date(Date.now() + 60 * 60 * 1000); // Example: 1-hour event

  const newEvent = new Event({
    state: "active",
    end_time,
    buckets: [],
  });
  await newEvent.save();

  scheduleJob(end_time, async () => {
    newEvent.state = "ended";
    await newEvent.save();
  });
};

scheduleJob("0 * * * *", startEvent); // Start a new event at the start of every hour

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
