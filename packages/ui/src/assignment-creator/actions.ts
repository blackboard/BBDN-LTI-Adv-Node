import { AssignmentInput } from "./models"

export const SET_ASSIGNMENT_COMMAND = "SetAssignmentCommand"
export interface SetAssignmentCommand {
    type: typeof SET_ASSIGNMENT_COMMAND,
    assignment: AssignmentInput,
}

export const CREATE_ASSIGNMENT_COMMAND = "CreateAssignmentCommand"
export interface CreateAssignmentCommand {
    type: typeof CREATE_ASSIGNMENT_COMMAND,
    fromPage: "stream" | "error",
    assignment: AssignmentInput,
}

export type AssignmentAction = SetAssignmentCommand | CreateAssignmentCommand
