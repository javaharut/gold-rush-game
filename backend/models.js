import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide an Email!"],
    unique: [true, "Email Exist"],
  },

  password: {
    type: String,
    required: [true, "Please provide a password!"],
    unique: false,
  },
});

const eventSchema = new mongoose.Schema({
  state: String,
  end_time: Date,
  buckets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bucket",
    },
  ],
});

const bucketSchema = new mongoose.Schema({
  players: [
    {
      player_id: { type: String },
      type: { type: String },
      gold: { type: Number, default: 0 },
    },
  ],
  whales: { type: Number, default: 0 },
  dolphins: { type: Number, default: 0 },
  fish: { type: Number, default: 0 },
});

export const Event = mongoose.model("Event", eventSchema);
export const Bucket = mongoose.model("Bucket", bucketSchema);
export const User = mongoose.model("User", UserSchema);

export default { Event, Bucket: Bucket, User };
