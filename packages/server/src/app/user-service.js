import axios from 'axios';
import redisUtil from '../util/redisutil';

exports.loadUsers = async (courseId, resourceId, url, token) => {
  if (!courseId) return [];

  const body = {
    method: 'GET',
    uri: url,
    headers: {
      'content-type': "application/vnd.ims.lti-nprs.v2.membershipcontainer+json",
      Authorization: "Bearer " + token
    }
  };

  console.log(`loadUsers for ${resourceId}, request: ${JSON.stringify(body)}`);
  try {
    const response = await axios.get(url, body);

    const members = response.data.members;
    console.log(`loadUsers returning ${JSON.stringify(response.data)}`);

    let users = [];
    for (let i = 0; i < members.length; i++) {
      const submission = await redisUtil.redisGet(`${resourceId}:${members[i].user_id}`);
      console.log(`Submission for ${members[i].user_id}: ${JSON.stringify(submission)}`);

      const user = {
        id: members[i].user_id,
        name: members[i].name,
        email: members[i].email,
        grade: submission ? submission.grade : '0'
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