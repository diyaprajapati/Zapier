import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });

async function main() {
    while(1) {
        const pendingRows = await client.zapRunOutbox.findMany({
            where: {},
            take: 10,
        });
        pendingRows.forEach((row) => {
            
        });
    }
}

main();