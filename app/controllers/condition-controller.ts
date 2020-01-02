import { Controller, Service, Condition, ServiceError, ServiceStatus, ServiceMethod, ConditionType } from "share";
import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import ConditionService from "../services/condition-service";

export default class ConditionController extends Controller {
    private productId: string;

    public constructor(private args: {req: Request, res: Response, next: NextFunction, redis: Redis}) {
        super(args.req.path, {condition: new ConditionService()}, "condition", args.res);

        this.productId = args.req.params.productId;
        this.exec();
    }

    private exec(): void {
        const service: Service = this.getService();

        service.setDomain("test.myshopify.com");
        service.setData(this.productId);

        this.validateBody(service)
            .then(() => service.exec(this.args.req.body, this.args.redis))
            .then(data => this.sendResponse(data, (this.args.req.method as ServiceMethod), ServiceStatus.OK))
            .catch(err => this.sendResponse(err, (this.args.req.method as ServiceMethod)));
    }

    private async validateBody(service: Service): Promise<any> {
        const body: Condition = this.args.req.body;

        if (!body || !service.validateSchema(body)) {
            throw new ServiceError(`Invalid entity schema, requires schema [${Object.keys(service.schema).join()}]`, ServiceStatus.NotAcceptable);
        } else if (!ConditionType[body.type]) {
            throw new ServiceError(`Field 'type' must be one of types [${Object.keys(ConditionType).join()}]`, ServiceStatus.NotAcceptable);
        }

        return Promise.resolve();
    }
}