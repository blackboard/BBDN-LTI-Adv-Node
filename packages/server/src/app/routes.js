import cookieParser from 'cookie-parser';
import uuid from 'uuid';
import ltiAdv from './lti-adv';
import assignmentService from './assignment-service';
import deepLinkService from './deep-link-service';
import gradeService from './grade-service';
import userService from './user-service';
import config from '../config/config';
import redisUtil from '../util/redisutil';
import ltiTokenService from './lti-token-service';
import restService from './rest-service';

module.exports = function (app) {
  app.use(cookieParser());

  const LMS_INFO_KEY = 'lmsInfo';
  
  const scopes = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly ' +
    'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem ' +
    'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly ' +
    'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly ' +
    'https://purl.imsglobal.org/spec/lti-ags/scope/score';

  //=======================================================
  // LTI Advantage Message processing
  let jwtPayload;

  app.get('/oidclogin', (req, res) => {
    console.log('--------------------\nOIDC login');
    ltiAdv.oidcLogin(req, res);
  });

  app.post('/lti13', async (req, res) => {
    console.log('--------------------\nlti13');

    // Per the OIDC best practices, ensure the state parameter passed in here matches the one in our cookie
    const cookieState = req.cookies['state'];
    if (cookieState !== req.body.state) {
      res.send(`The state field is missing or doesn't match.`);
      return;
    }

    jwtPayload = await ltiAdv.verifyToken(req.body.id_token);
    if (!jwtPayload || !jwtPayload.verified) {
      res.send('An error occurred processing the id_token.');
      return;
    }

    const targetLinkUri = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];
    let returnUrl;
    let deepLinkData;
    let isDeepLinking = false;

    if (targetLinkUri.endsWith('deeplink')) {
      returnUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].deep_link_return_url;
      deepLinkData = jwtPayload.body['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'].data;
      isDeepLinking = true;
    } else if (targetLinkUri.endsWith('lti13')) {
      returnUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'].return_url;
    } else {
      res.send(`We don't recognize that targetLinkUri ${targetLinkUri}`);
    }

    const roles = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/roles'];
    console.log(`Roles are ${JSON.stringify(roles)}`);

    let isStudent = false;
    for (let i = 0; i < roles.length; i++) {
      if (roles[i] === 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner') {
        isStudent = true;
        break;
      }
    }

    const lmsServer = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].url;
    const lmsType = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].product_family_code;
    const custom = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/custom'];
    const nrpsUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'].context_memberships_url + '&groups=true';
    const agsUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitem;

    const lmsInfo = {
      userId: jwtPayload.body['sub'],
      courseUUID: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].id,
      courseId: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].label, // Learn's Course ID
      lmsHost: lmsServer,
      returnUrl: encodeURI(returnUrl),
      courseName: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].title,
      locale: jwtPayload.body['locale'],
      lmsType: lmsType,
      deepLinkData: deepLinkData,
      iss: jwtPayload.body['iss'],
      deployId: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/deployment_id'],
      isStudent: isStudent,
      isDeepLinking: isDeepLinking,
      resourceId: custom['resourceId'],
      nrpsUrl: nrpsUrl,
      agsUrl: agsUrl
    };

    console.log('lmsInfo: ' + JSON.stringify(lmsInfo));
    const lmsInfoKey = uuid.v4();
    ltiAdv.cacheLmsInfo(lmsInfoKey, lmsInfo);
    // Store our LMS info key in a cookie so we can get the data back later
    res.cookie(LMS_INFO_KEY, lmsInfoKey, {sameSite: 'none', secure: true, httpOnly: true});

    // At this point we want to get the 3LO auth code, and then OAuth2 bearer token, and THEN we can send the user
    // to the MS Teams Meeting app UI.

    const redirectUri = `${config.frontendUrl}/tlocode&scope=*&response_type=code&client_id=${config.appKey}&state=${cookieState}`;
    const authcodeUrl = `${lmsServer}/learn/api/public/v1/oauth2/authorizationcode?redirect_uri=${redirectUri}`;

    console.log(`Redirect to get 3LO code ${authcodeUrl}`);
    res.redirect(authcodeUrl);
  });

  // The 3LO redirect route
  app.get('/tlocode', async (req, res) => {
    console.log(`tlocode called with code: ${req.query.code} and state: ${req.query.state}`);

    const cookieState = req.cookies['state'];
    if (cookieState !== req.query.state) {
      res.send(`The state field is missing or doesn't match.`);
      return;
    }

    let lmsHost = '';
    let returnUrl = '';
    let courseName = '';
    let isStudent = true;
    let isDeepLinking = false;
    let lmsLocale = 'en-us';
    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);

    if (lmsInfo) {
      lmsHost = lmsInfo.lmsHost;
      returnUrl = lmsInfo.returnUrl;
      courseName = encodeURIComponent(lmsInfo.courseName);
      lmsLocale = lmsInfo.locale;
      isStudent = lmsInfo.isStudent;
      isDeepLinking = lmsInfo.isDeepLinking;
    }

    const redirectUri = `${config.frontendUrl}/tlocode`;
    const learnUrl = lmsHost + `/learn/api/public/v1/oauth2/token?code=${req.query.code}&redirect_uri=${redirectUri}`;

    // If we have a 3LO auth code, let's get us a bearer token here.
    const nonce = uuid.v4();

    // Cache the nonce
    redisUtil.redisSave(nonce, 'nonce');

    const restToken = restService.getLearnRestToken(learnUrl, nonce);
    console.log(`Learn REST token ${restToken}`);

    // Now get the LTI OAuth 2 bearer token (shame they aren't the same)
    const ltiToken = await ltiTokenService.getLTIToken(config.bbClientId, config.oauthTokenUrl, scopes, nonce);
    console.log(`LMS LTI token ${ltiToken}`);

    // Now finally redirect to the UI
    res.redirect(`/?nonce=${nonce}&returnurl=${returnUrl}&cname=${courseName}&student=${isStudent}&dl=${isDeepLinking}&setLang=${lmsLocale}#/viewAssignment`);
  });

  app.get('/jwtPayloadData', (req, res) => {
    res.send(jwtPayload);
  });

  app.get('/.well-known/jwks.json', (req, res) => {
    res.send(config.publicKeys);
  });

  app.post('/sendAssignment', async (req, res) => {
    let body = req.body;
    console.log(`sendAssignment called: ${JSON.stringify(body)}`);

    // Get the OAuth2 bearer token from our cache based on the nonce. The nonce serves two purposes:
    // 1. Protects against CSRF
    // 2. Is the key for our cached bearer tokens
    const nonce = body.nonce;
    const cachedNonce = await redisUtil.redisGet(nonce);

    if (!cachedNonce) {
      console.log(`Couldn't find nonce...exiting`);
      res.send('Could not find nonce');
    }

    // Remove the nonce so it can't be replayed
    redisUtil.redisDelete(nonce);

    const restToken = await restService.getCachedToken(nonce);
    console.log(`sendAssignment got bearer token ${restToken}`);

    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);

    const deepLinkReturn = await deepLinkService.createDeepContent(body.assignment, lmsInfo, restToken);
    console.log(`sendAssignment got deep link return ${JSON.stringify(deepLinkReturn)}`);
    res.send(deepLinkReturn);
  });

  app.post('/saveAssignment', async (req, res) => {
    const assignment = req.body.assignment;
    console.log(`saveAssignment ${JSON.stringify(assignment)}`);
    const response = await assignmentService.saveAssignment(assignment.id, assignment);
    res.send(response);
  });

  app.post('/saveSubmission', async (req, res) => {
    const nonce = req.body.nonce;
    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);

    console.log(`saveSubmission for ${lmsInfo.userId}`);
    const assignment = req.body.assignment;
    console.log(`saveSubmission ${JSON.stringify(assignment)}`);
    const token = await ltiTokenService.getCachedLTIToken(nonce, config.bbClientId, config.oauthTokenUrl, scopes);

    if (!token) {
      console.log(`saveSubmission no token`);
      res.status(404).send(`Couldn't find LTI token to send grade`);
    }
    const response = await assignmentService.saveSubmission(lmsInfo.courseId, lmsInfo.userId, assignment.id, assignment, lmsInfo.agsUrl, token);
    res.send(response);
  });

  app.get('/assignmentData', async (req, res) => {
    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);

    console.log(`assignmentData for ${lmsInfo.courseId}`)
    const assignment = await assignmentService.loadAssignment(lmsInfo.userId, lmsInfo.resourceId, lmsInfo.isStudent);
    console.log(`returning assignmentData ${JSON.stringify(assignment)}`)
    res.send(assignment);
  });

  app.get('/userData', async (req, res) => {
    const nonce = req.query.nonce;

    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);
    console.log(`userData for ${lmsInfo.courseId} and nonce ${nonce}`);

    const token = await ltiTokenService.getCachedLTIToken(nonce, config.bbClientId, config.oauthTokenUrl, scopes);

    if (!token) return [];

    const users = await userService.loadUsers(lmsInfo.courseId, lmsInfo.resourceId, lmsInfo.nrpsUrl, lmsInfo.agsUrl, token);
    console.log(`returning users ${JSON.stringify(users)}`)
    res.send(users);
  });

  app.post('/sendGrade', async (req, res) => {
    const nonce = req.query.nonce;

    const lmsInfo = await ltiAdv.getLmsInfo(req.cookies[LMS_INFO_KEY]);
    console.log(`sendGrade for ${lmsInfo.courseId} and nonce ${nonce}`);

    const token = await ltiTokenService.getCachedLTIToken(nonce);

    if (!token) {
      res.status(404).send(`Couldn't find LTI token to send grade`);
    }

    const grade = await gradeService.sendGrade(lmsInfo.courseId, lmsInfo.userId, req.body.gradeInfo, lmsInfo.agsUrl, token);
    console.log(`sent grade ${JSON.stringify(grade)}`)
    res.send(grade);
  });

  //=======================================================
  // Catch all
  app.get('*', (req, res) => {
    console.log('catchall - (' + req.url + ')');
    res.redirect('/#/viewAssignment');
  });
};
