import moment from 'moment';

export interface IUser {
  id: string,
  name?: string,
  email?: string,
  score?: string,
  result?: string
}

export interface AssignmentInput {
  id?: string,
  name: string,
  submission?: string,
  startDateTime: moment.Moment,
  endDateTime: moment.Moment,
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
