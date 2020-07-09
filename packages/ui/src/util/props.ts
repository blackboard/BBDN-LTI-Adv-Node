import { AssignmentInput } from "../assignment-creator/models";

export interface AssignmentValidationFailures {
  invalidName?: string
}

export interface AssignmentPageProps {
  assignment: AssignmentInput,
  validationFailures: AssignmentValidationFailures
  creationInProgress: boolean
  loading: boolean
  setAssignment: (assignment: AssignmentInput) => void,
  createAssignment: (assignment: AssignmentInput) => void,
  cancel: () => void,
  localize: any,
  location: Location
}
