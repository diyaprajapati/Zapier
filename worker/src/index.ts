import "dotenv/config";
// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "./generated/prisma";
import { Kafka } from "kafkajs";

const TOPIC_NAME = process.env.KAFKA_TOPIC || "zap-events";
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"];

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);
// const client = new PrismaClient({ adapter });

const kafka = new Kafka({
    clientId: "zap-worker",
    brokers: KAFKA_BROKERS,
    retry: {
        initialRetryTime: 100,
        retries: 5,
    },
});

let consumer: ReturnType<typeof kafka.consumer> | null = null;

async function main() {
    consumer = kafka.consumer({ groupId: "main-worker" });
    
    try {
        console.log(`Connecting to Kafka brokers: ${KAFKA_BROKERS.join(", ")}`);
        await consumer.connect();
        console.log("Successfully connected to Kafka");
        
        console.log(`Subscribing to topic: ${TOPIC_NAME}`);
        await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });

        console.log("Starting to consume messages...");
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log({
                    topic,
                    partition,
                    offset: message.offset,
                    value: message.value?.toString(),
                });

                await new Promise(r => setTimeout(r, 1000));

                // await consumer.done();
            }
        });
    } catch (error: any) {
        console.error("Kafka connection error:", error.message);
        
        if (error.code === "ECONNREFUSED") {
            console.error("\n❌ Cannot connect to Kafka broker!");
            console.error(`   Make sure Kafka is running at: ${KAFKA_BROKERS.join(", ")}`);
            console.error("   You can set KAFKA_BROKERS environment variable to change the broker address.");
        }
        
        console.error("\nFull error:", error);
        if (consumer) {
            await consumer.disconnect().catch(() => {});
        }
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");
    if (consumer) {
        // await consumer.disconnect();
        await consumer.commitOffsets([{
            topic: TOPIC_NAME,
            partition: 0,
            offset: "0",
        }])
    }
    process.exit(0);
});

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});