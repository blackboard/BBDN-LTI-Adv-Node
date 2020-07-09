import { AssignmentInput } from "./models";

export function createAssignmentService() {
    return {
        async createAssignment(assignment: AssignmentInput) {
            const requestBody = {
                "startDateTime": assignment.startDateTime?.toISOString(),
                "endDateTime": assignment.endDateTime?.toISOString(),
                "name": assignment.name,
                "submission": assignment.submission
            };

            return null;
        }
    }
}
