import { Service, ServiceError, ServiceStatus } from "share";
import { Redis } from "ioredis";

export default class ConditionService extends Service {
    public constructor() {
        super("ConditionService", {
            type: "string",
            value: "string"
        });
    }

    public async exec(payload: {[key: string]: any}, redis: Redis): Promise<any> {
        this.log(`Finding product[${this.data}] in redis...`);

        const match: {[key: string]: any} = await redis.hgetall(`${this.domain}:${this.data}`);

        if (match) {
            return match;
        } else {
            throw new ServiceError(`Product with key '${this.domain}:${this.data}' not found in cache`, ServiceStatus.NotFound);
        }
    }
}