import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    primaryPhone: { type: String, required: false, unique: false },
    email: {type: String, required: true, unique: true},
    password: { type: String },
    profilePicture: {
      type: String,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
    },
    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },
    department: {
      type: String,
      enum: ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"],
      default: "NA",
    },
    telegramId: { type: String, required: false, unique: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
