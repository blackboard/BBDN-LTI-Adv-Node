import { ApplicationState } from './state';
import { SET_ASSIGNMENT_COMMAND, AssignmentAction, CREATE_ASSIGNMENT_COMMAND } from './actions'
import _ from 'lodash';
import { createDefaultAssignmentInput } from './models';
import { LOCATION_CHANGE, LocationChangeAction, LocationChangePayload } from 'connected-react-router';

const loadInitialState = () => {
    return {
        inputAssignment: createDefaultAssignmentInput(),
        creationInProgress: false
    } as ApplicationState
}

export const assignmentReducer = (state: ApplicationState, action : AssignmentAction | LocationChangeAction<LocationChangePayload>) => {
    if (!state) return loadInitialState();
    switch (action.type)
    {
        case SET_ASSIGNMENT_COMMAND:
            return {
                ...state,
                inputStream: _.cloneDeep(action.assignment),
            };
        case CREATE_ASSIGNMENT_COMMAND:
            return {
                ...state,
                creationInProgress: true
            };
        case LOCATION_CHANGE:
            if (action.payload.location.pathname === "/createStream") {
                return {
                    ...state, 
                    creationInProgress: false
                }
            }
            // falls through
        default: 
            return state;
    }
};
