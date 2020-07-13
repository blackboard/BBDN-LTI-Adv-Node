import axios from 'axios';
import moment from 'moment';
import uuid from 'uuid';
import config from '../config/config';
import ltiAdv from './lti-adv';
import assignmentService from './assignment-service';

exports.createDeepContent = async (assignment, learnInfo, token) => {
  // get OAuth token, make REST API call
  console.log(`createDeepContent assignment: ${JSON.stringify(assignment)}`);
  console.log(`createDeepContent learn: ${JSON.stringify(learnInfo)}`);

  const xhrConfig = {
    headers: {Authorization: `Bearer ${token}`}
  };

  // First we need to get what type of course we've got
  try {
    const courseResponse = await axios.get(`${learnInfo.learnHost}/learn/api/public/v2/courses/uuid:${learnInfo.courseUUID}`, xhrConfig);

    console.log(`Got course; Ultra status is ${courseResponse.data.ultraStatus}, and PK1 is: ${courseResponse.data.id}`);

    // TODO??? createCalendarItem(assignment, learnInfo, courseResponse.data.id, xhrConfig);

    // Now create the deep linking response
    return createDeepLinkJwt(assignment, learnInfo);
  } catch (exception) {
    console.log(`Error getting course info ${JSON.stringify(exception)}`);
  }
};

let createCalendarItem = async function (meetingInfo, learnInfo, calendarId, xhrConfig) {
  // We need the course PK1 for the Calendar API
  const calendarOptions = {
    calendarId: calendarId,
    type: 'Course',
    title: meetingInfo.subject,
    location: meetingInfo.description,
    description: meetingInfo.description,
    start: meetingInfo.startDateTime,
    end: meetingInfo.endDateTime
  };

  console.log(`Calendar create options: ${JSON.stringify(calendarOptions)}`);

  const learnUrl = `${learnInfo.learnHost}/learn/api/public/v1/calendars/items`;

  // Create the calendar item
  axios.post(learnUrl, calendarOptions, xhrConfig).then(response => {
    if (response.status === 201) {
      console.log(`Calendar item created successfully!`);
    } else {
      console.log(`Calendar item creation failed ${response.status}`);
    }
  }).catch(error => {
    console.log(`Error creating calendar item: ${JSON.stringify(error?.response?.data)}, from: ${learnInfo.learnHost}`);
  });
};

let createDeepLinkJwt = function (assignment, learnInfo) {
  const assignmentId = uuid.v4();

  // Save this assignment
  assignmentService.saveAssignment(assignmentId, assignment);

  const contentItems = [{
    type: "ltiResourceLink",
    title: assignment.name,
    text: assignment.submission,
    url: `${config.frontendUrl}/lti13`,
    available: {
      endDateTime: assignment.endDateTime,
    },
    submission: {
      endDateTime: assignment.endDateTime,
    },
    iframe: {
      width: 600,
      height: 400
    },
    lineItem: {
      scoreMaximum: 100,
      label: assignment.name,
      resourceId: assignmentId,
      tag: "essay"
    },
    custom: {
      resourceId: assignmentId,
      userName: "$User.username"
    }
  }];

  const now = moment.now() / 1000;
  const deepLinkResponse = {
    iss: config.bbClientId,
    aud: learnInfo.iss,
    sub: config.bbClientId,
    iat: now,
    exp: now + 5 * 60,
    locale: "en_US",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": learnInfo.deployId,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/data": learnInfo.deepLinkData,
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": contentItems
  };

  console.log(`Deep link creator returned: ${JSON.stringify(deepLinkResponse)}`);

  return ltiAdv.signJwt(deepLinkResponse);
}
