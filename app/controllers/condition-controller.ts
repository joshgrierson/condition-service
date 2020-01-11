import { Controller, Service, Condition, ServiceError, ServiceStatus, ServiceMethod, ConditionType } from "share";
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import ConditionService from "../services/condition-service";
import Helper from "../helper";

export default class ConditionController extends Controller {
    private productId: string;

    public constructor(private args: {req: Request, res: Response, next: NextFunction, redis: Redis}) {
        super(args.req.path, {condition: new ConditionService()}, "condition", args.res);

        this.productId = args.req.params.productId;
        this.exec();
    }

    private exec(): void {
        const service: Service<Condition[]> = this.getService();

        service.setDomain("test.myshopify.com");
        service.setData(this.productId);

        this.validateBody(service)
            .then(() => service.exec(this.args.req.body, this.args.redis))
            .then(data => this.sendResponse(data, (this.args.req.method as ServiceMethod), ServiceStatus.OK))
            .catch(err => this.sendResponse(err, (this.args.req.method as ServiceMethod)));
    }

    private async validateBody(service: Service<Condition[]>): Promise<any> {
        const body: Condition[] = this.args.req.body;

        if (!body || !Array.isArray(body)) {
            throw new ServiceError(`Post body requires array with schema [${Object.keys(service.schema).join()}]`, ServiceStatus.NotAcceptable);
        } else if (body && Array.isArray(body) && !service.validateSchema(body[0])) {
            throw new ServiceError(`Invalid entity schema, requires schema [${Object.keys(service.schema).join()}]`, ServiceStatus.NotAcceptable);
        } else if (body.filter(e => ConditionType[e.type]).length === 0) {
            throw new ServiceError(`Field 'type' must be one of types [${Object.keys(ConditionType).join()}]`, ServiceStatus.NotAcceptable);
        } else if (body.filter(e => this.isValidValue(e.type, e.value)).length === 0) {
            throw new ServiceError(`Field 'value' is invalid with type '${body.find(e => !this.isValidValue(e.type, e.value)).type}'`);
        }

        return Promise.resolve();
    }

    private isValidValue(type: ConditionType, value: string): boolean {
        if (value && type === ConditionType.location) {
            const {lat, lng, radius} = Helper.formatLocationData(value);

            return !isNaN(parseInt(lat)) && lng && !isNaN(parseInt(lng)) && (radius === undefined ? true : !isNaN(parseInt(radius)));
        }

        return false;
    }
}