import {AssignmentInput} from "./models";

export function hasValidName(assignment: AssignmentInput) {
    return !!assignment.name && assignment.name.length >= 0
}
