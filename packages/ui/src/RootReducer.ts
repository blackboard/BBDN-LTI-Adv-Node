import { combineReducers } from "redux";
import { connectRouter } from 'connected-react-router'
import { History } from 'history'
import { ApplicationState } from "./assignment-creator/state";
import { assignmentReducer } from "./assignment-creator/reducers";

export interface AppState {
    assignment: ApplicationState,
    router: History<History.PoorMansUnknown>
}

export function createRootReducer(history : History) {
    return combineReducers({
        router: connectRouter(history),
        stream: assignmentReducer
    });
}
