import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma";
import { Kafka } from "kafkajs";

const TOPIC_NAME = "zap-events"
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });

const kafka = new Kafka({
    clientId: "outbox-processor",
    brokers: ["localhost:9092"],
})

async function main() {
    const producer = kafka.producer();
    await producer.connect();

    while(1) {
        const pendingRows = await client.zapRunOutbox.findMany({
            where: {},
            take: 10,
        });

        /*
            [{
                id: "1",
                zapRunId: "2",
            },
            {
                id: "3",
                zapRunId: "4",
            },
            ]
        */

        pendingRows.forEach((row) => {
            producer.send({
                topic: TOPIC_NAME,
                messages: pendingRows.map((row) => ({
                    value: row.zapRunId,
                })),
            })
        });
        await client.zapRunOutbox.deleteMany({
            where: {
                id: {
                    in: pendingRows.map((row) => row.id),
                },
            },
        })
    }
}

main();