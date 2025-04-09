import cors from "cors";
import express from "express";
import { router as controller } from "./utils/controller";
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()) ;

app.use(express.urlencoded({ extended: true }));
app.use("/api", controller);

app.listen(3000, () =>
  console.log(`🚀 Server ready at: http://localhost:3000`)
);
