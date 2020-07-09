import redisUtil from '../util/redisutil';

exports.loadAssignment = async (userId, resourceId, isStudent) => {
  if (!resourceId) {
    return {};
  }

  let assignment = {
    id: resourceId,
    name: '',
    submission: '',
    startDateTime: null,
    endDateTime: null
  };

  const data = await redisUtil.redisGet(resourceId);
  console.log(`loadAssignment assignment: ${JSON.stringify(data)}`);
  assignment.name = data?.name;
  if (!isStudent) {
    assignment.submission = data?.submission;
  }
  assignment.startDateTime = data?.startDateTime;
  assignment.endDateTime = data?.endDateTime;

  if (isStudent) {
    const submission = await redisUtil.redisGet(`${resourceId}:${userId}`)
    console.log(`loadAssignment submission: ${JSON.stringify(submission)}`);
    // The student's submission
    if (submission) {
      assignment.submission = submission.text;
      assignment.grade = submission.grade;
    }
  }
  console.log(`loadAssignment returning: ${JSON.stringify(assignment)}`);
  return assignment;
};

exports.saveAssignment = async (resourceId, assignment) => {
  console.log(`saveAssignment ${JSON.stringify(assignment)}`);
  redisUtil.redisSave(resourceId, assignment);
}

exports.saveSubmission = async (studentId, resourceId, assignment) => {
  const submission = {
    text: assignment.submission,
    grade: assignment.grade
  }
  console.log(`saveSubmission ${JSON.stringify(assignment)}`);
  redisUtil.redisSave(`${resourceId}:${studentId}`, submission);
}