import moment from "moment";
import {Moment} from "moment";

export interface AssignmentInput {
  name: string,
  submission?: string,
  startDateTime: Moment,
  endDateTime: Moment,
  grade: string
}

export function createDefaultAssignmentInput(): AssignmentInput {
  return {
    name: '',
    submission: '',
    startDateTime: moment().startOf('hour').add(1, 'hour'),
    endDateTime: moment().startOf('hour').add(2, 'hour'),
    grade: ''
  };
}
