import axios from 'axios';

exports.loadUsers = async (courseId, url, token) => {
  if (!courseId) return [];

  const body = {
    method: 'GET',
    uri: url,
    headers: {
      'content-type': "application/vnd.ims.lti-nprs.v2.membershipcontainer+json",
      Authorization: "Bearer " + token
    }
  };

  console.log(`loadUsers request: ${JSON.stringify(body)}`);
  const response = await axios.get(url, body);

  const members = response.data.members;
  console.log(`loadUsers returning ${JSON.stringify(response.data)}`);

  let users = [];
  for (let i = 0; i < members.length; i++) {
    const user = {
      id: members[i].user_id,
      name: members[i].name,
      email: members[i].email,
      grade: 0 // TODO get the grade from redis
    }

    users.push(user);
  }
  return users;

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