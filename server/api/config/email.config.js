import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

export const nodemailerClient = nodemailer.createTransport({
  secure: true,
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});
