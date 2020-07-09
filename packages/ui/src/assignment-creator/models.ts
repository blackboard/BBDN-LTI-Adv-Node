import moment from "moment";
import {Moment} from "moment";

export interface AssignmentInput {
  id?: string,
  name: string,
  submission?: string,
  startDateTime: Moment,
  endDateTime: Moment,
  grade?: string
}

export function createDefaultAssignmentInput(): AssignmentInput {
  return {
    id: '',
    name: '',
    submission: '',
    startDateTime: moment().startOf('hour').add(1, 'hour'),
    endDateTime: moment().startOf('hour').add(49, 'hour'),
    grade: ''
  };
}
