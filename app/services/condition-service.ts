import { Service, ServiceError, ServiceStatus, Condition, ConditionType } from "share";
import { Redis } from "ioredis";
import hash from "object-hash";
import Helper from "../helper";

export default class ConditionService extends Service<Condition[]> {
    private redis: Redis;

    public constructor() {
        super("ConditionService", {
            type: "string",
            value: "string"
        });
    }

    public async exec(payload: Condition[], redis: Redis): Promise<any> {
        this.redis = redis;

        this.log(`Finding product[${this.data}] in redis...`);

        const match: {[key: string]: any} = await this.redis.hgetall(`${this.domain}:${this.data}`);

        if (match && payload && payload.length > 0) {
            const redisP: any[] = (payload.map(p => {
                if (p.type === ConditionType.location) {
                    return ["hset", ...this.prepLocationData(p.value, match["uid"])];
                }
            }) as []);

            const results: {} = await this.redis.pipeline(redisP).exec()
                .then(results => this.formatResults(payload, results, match["uid"]));

            if (results && Object.keys(results).filter(k => results[k].status).length === Object.keys(results).length) {
                throw new ServiceError(JSON.stringify(results));
            }

            this.log(`Inserted condition ${JSON.stringify(results)}`);

            return results??Promise.resolve(payload);
        } else {
            throw new ServiceError(`Product with key '${this.domain}:${this.data}' not found in cache`, ServiceStatus.NotFound);
        }
    }

    private async formatResults(payload: Array<Condition>, results: Array<[Error, any]>, uuid: string): Promise<{}> {
        return Promise.resolve(results.reduce((acc, result, idx) => {
            const c: Condition = payload[idx];

            if (result[0] || result[1] === 0) {
                acc[`${this.domain}:${c.type}`] = {
                    status: "failed",
                    err: result[0] ? result[0] : "Could not insert condition"
                };
            } else if (result[1] && result[1] > 0) {
                const {lat, lng, radius} = Helper.formatLocationData(c.value);
                const res: any = {lat, lng, uuid};

                if (radius) {
                    res.radius = radius;
                }

                acc[`${this.domain}:${c.type}`] = res;
            }

            return acc;
        }, {}));
    }

    private prepLocationData(value: string, uuid: string): [string, string, string] {
        const {lat, lng, radius} = Helper.formatLocationData(value);

        const arr: string[] = [this.domain, lat, lng];

        if (radius) {
            arr.push(radius);
        }

        return [hash(arr), uuid, this.data];
    }
}