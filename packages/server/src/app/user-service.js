import axios from 'axios';
import redisUtil from '../util/redisutil';
import gradeService from './grade-service';

exports.loadUsers = async (courseId, resourceId, nrpsUrl, agsUrl, token) => {
  if (!courseId) return [];

  const body = {
    method: 'GET',
    uri: nrpsUrl,
    headers: {
      'content-type': "application/vnd.ims.lti-nprs.v2.membershipcontainer+json",
      Authorization: "Bearer " + token
    }
  };

  console.log(`loadUsers for ${resourceId}, request: ${JSON.stringify(body)}`);
  try {
    const response = await axios.get(nrpsUrl, body);

    const members = response.data.members;
    console.log(`loadUsers returning ${JSON.stringify(response.data)}`);

    // Get the grade result from the LMS for this user/item
    const results = await gradeService.getResults(agsUrl, token);

    let users = [];
    for (let i = 0; i < members.length; i++) {
      const submission = await redisUtil.redisGet(`${resourceId}:${members[i].user_id}`);
      console.log(`Submission for ${members[i].user_id}: ${JSON.stringify(submission)}`);

      const result = results.find(res => res.userId === members[i].user_id);

      const user = {
        id: members[i].user_id,
        name: members[i].name,
        email: members[i].email,
        score: submission ? submission.grade : '0',
        result: result ? result.resultScore : '0'
      }

      users.push(user);
    }
    return users;
  } catch (exception) {
    console.log(`Error loading users ${JSON.stringify(exception)}`);
    return [];
  }

  /*
  return [
    {
      id: '1234',
      name: 'Fred',
      email: 'fred@example.com'
    },
    {
      id: '2346',
      name: 'Sue',
      email: 'sue@example.com'
    }
  ];

   */
}