import { Redis, RedisOptions } from "ioredis";
import express from "express";
import bodyParser from "body-parser";
import { setupRedis } from "share";
import ConditionController from "./controllers/condition-controller";

require("dotenv").config();

const SERVICE_PORT: number = process.env.SERVICE_PORT ? parseInt(process.env.SERVICE_PORT) : 3000;

const app = express();

app.use(bodyParser.json());

async function run() {
    console.log("Powering up Condition Service");

    try {
        const redisOptions: RedisOptions = {
            port: parseInt(process.env.REDIS_PORT),
            host: process.env.REDIS_HOST
        };

        if (process.env.REDIS_PASS) {
            redisOptions.password = process.env.REDIS_PASS;
        }

        const redis: Redis = await setupRedis(redisOptions);

        app.post("/v1/api/condition/:productId(\\d+)", (req, res, next) => new ConditionController({
            req,
            res,
            next,
            redis
        }));

        app.listen(SERVICE_PORT, () => console.log("Condition Service listening on port %d", SERVICE_PORT));
    } catch(ex) {
        console.error("Condition Service error: %s", ex.stack);
        process.exit(1);
    }
}

run();