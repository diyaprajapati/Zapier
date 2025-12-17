import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });

app.use(express.json());

// password logic
app.post("/hooks/catch/:userId/:zapId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const zapId = req.params.zapId;
    const body = req.body;

    //store in db a new trigger
    await client.$transaction(async tx => {
      const run = await tx.zapRun.create({
          data: {
              zapId: zapId,
              metadata: body,
          }
      });
      await tx.zapRunOutbox.create({
          data: {
              zapRunId: run.id,
          }
      });
    });
    res.json({
        message: "Hook processed successfully",
        success: true,
    })
  } catch (error) {
    console.error("Error processing hook:", error);
    res.json({
        message: "Error processing hook",
        success: false,
    })
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});