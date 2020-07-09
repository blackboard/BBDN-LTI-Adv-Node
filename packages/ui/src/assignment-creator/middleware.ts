import { Middleware } from "redux";
import { createAssignmentService } from "./service";

export function createStreamMiddleware() : Middleware
{
    const service = createAssignmentService();

    return store => next => action => {
        next(action);
    }
}
