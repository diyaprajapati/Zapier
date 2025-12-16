import express from "express";
import { PrismaClient } from "./generated/prisma/client";

const app = express();
const client = new PrismaClient();

app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
  const userId = req.params.userId;
  const zapId = req.params.zapId;

  //store in db a new trigger
  await client.zapRun.create({
    data: {
        zapId: zapId,
    }
  })

  //push it on to queue (kafka/redis)

});
