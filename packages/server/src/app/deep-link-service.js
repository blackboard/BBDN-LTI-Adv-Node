import axios from 'axios';
import moment from 'moment';
import uuid from 'uuid';
import config from '../config/config';
import ltiAdv from './lti-adv';
import assignmentService from './assignment-service';

exports.createDeepContent = async (assignment, lmsInfo, token) => {
  // get OAuth token, make REST API call
  console.log(`createDeepContent assignment: ${JSON.stringify(assignment)}`);
  console.log(`createDeepContent LMS: ${JSON.stringify(lmsInfo)}`);

  try {
    await createCalendarItem(assignment, lmsInfo, token);

    // Now create the deep linking response
    return createDeepLinkJwt(assignment, lmsInfo);
  } catch (exception) {
    console.log(`Error getting course info ${JSON.stringify(exception)}`);
  }
};

const createCalendarItem = async (assignment, lmsInfo, token) => {
  const xhrConfig = {
    headers: {Authorization: `Bearer ${token}`}
  };

  try {
    // First we need to get what type of course we've got so we can get the calendar ID
    const courseResponse = await axios.get(`${lmsInfo.lmsHost}/learn/api/public/v2/courses/uuid:${lmsInfo.courseUUID}`, xhrConfig);

    console.log(`Got course; Ultra status is ${courseResponse.data.ultraStatus}, and PK1 is: ${courseResponse.data.id}`);

    // We need the course PK1 for the Calendar API
    const calendarOptions = {
      calendarId: courseResponse.data.id,
      type: 'Course',
      title: assignment.name,
      location: assignment.submission,
      description: assignment.submission,
      start: moment().startOf('hour').add(1, 'hour').toISOString(),
      end: moment().startOf('hour').add(2, 'hour').toISOString()
    };

    console.log(`Calendar create options: ${JSON.stringify(calendarOptions)}`);

    const learnUrl = `${lmsInfo.lmsHost}/learn/api/public/v1/calendars/items`;

    // Create the calendar item
    const response = await axios.post(learnUrl, calendarOptions, xhrConfig);
    console.log(`Created calendar item!!! ${JSON.stringify(response.data)}`);
  } catch (exception) {
    console.log(`Error creating calendar item: ${JSON.stringify(exception)}, from: ${lmsInfo.lmsHost}`);
  }
};

const createDeepLinkJwt = function (assignment, lmsInfo) {
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
    aud: lmsInfo.iss,
    sub: config.bbClientId,
    iat: now,
    exp: now + 5 * 60,
    locale: "en_US",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": lmsInfo.deployId,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/data": lmsInfo.deepLinkData,
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": contentItems
  };

  console.log(`Deep link creator returned: ${JSON.stringify(deepLinkResponse)}`);

  return ltiAdv.signJwt(deepLinkResponse);
}
