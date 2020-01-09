import { Service, ServiceError, ServiceStatus, Condition, ConditionType } from "share";
import { Redis, BooleanResponse } from "ioredis";
import hash from "object-hash";

export default class ConditionService extends Service<Condition> {
    private redis: Redis;

    public constructor() {
        super("ConditionService", {
            type: "string",
            value: "string"
        });
    }

    public async exec(payload: Condition, redis: Redis): Promise<any> {
        this.redis = redis;

        this.log(`Finding product[${this.data}] in redis...`);

        const match: {[key: string]: any} = await this.redis.hgetall(`${this.domain}:${this.data}`);

        if (match) {
            if (payload.type === ConditionType.location) {
                const latlng: string[] = payload.value.split(",");
                const hash: string = await this.insertLocationCondition(latlng[0], latlng[1], match["uid"]);

                this.log(`Inserted ${ConditionType.location} condition, against entity '${this.data}'`);

                this.redisSave(this.redis, hash);

                return {
                    lat: latlng[0],
                    lng: latlng[1],
                    uuid: match["uid"]
                };
            }

            return match;
        } else {
            throw new ServiceError(`Product with key '${this.domain}:${this.data}' not found in cache`, ServiceStatus.NotFound);
        }
    }

    private async insertLocationCondition(lat: string, lng: string, uuid: string): Promise<any> {
        const hashLatLng: string = hash([this.domain, lat, lng]);
        
        const insert: BooleanResponse = await this.redis.hset(hashLatLng, uuid, this.data);

        if (insert > 0) {
            return Promise.resolve(hashLatLng);
        } else {
            throw new ServiceError(`Failed to insert location '${lat},${lng}' under domain ${this.domain}`);
        }
    }
}