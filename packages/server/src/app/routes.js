import cookieParser from 'cookie-parser';
import ltiAdv from './lti-adv';
import assignmentService from './assignment-service';
import deepLinkService from './deep-link-service';
import userService from './user-service';
import config from '../config/config';
import axios from 'axios';
import redisUtil from '../util/redisutil';
import uuid from 'uuid';
import ltiTokenService from "./lti-token-service";

module.exports = function (app) {
  app.use(cookieParser());

  //=======================================================
  // LTI Advantage Message processing
  let jwtPayload;

  app.get('/oidclogin', (req, res) => {
    console.log('--------------------\nOIDC login');
    ltiAdv.oidcLogin(req, res);
  });

  app.post('/lti13', (req, res) => {
    console.log('--------------------\nlti13');

    // Per the OIDC best practices, ensure the state parameter passed in here matches the one in our cookie
    const cookieState = req.cookies['state'];
    if (cookieState !== req.body.state) {
      res.send(`The state field is missing or doesn't match.`);
      return;
    }

    jwtPayload = ltiAdv.verifyToken(req.body.id_token);
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

    const learnServer = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].url;
    const lmsType = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].product_family_code;
    const custom = jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/custom'];
    const nrpsUrl = jwtPayload.body['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'].context_memberships_url + '&groups=true';

    const learnInfo = {
      userId: jwtPayload.body['sub'],
      courseUUID: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].id,
      courseId: jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/context'].label, // Learn's Course ID
      learnHost: learnServer,
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
      nrpsUrl: nrpsUrl
    };

    console.log('learnInfo: ' + JSON.stringify(learnInfo));
    res.cookie('learnInfo', JSON.stringify(learnInfo), {sameSite: 'none', secure: true, httpOnly: true});

    // At this point we want to get the 3LO auth code, and then OAuth2 bearer token, and THEN we can send the user
    // to the MS Teams Meeting app UI.

    const redirectUri = `${config.frontendUrl}/tlocode&scope=*&response_type=code&client_id=${config.appKey}&state=${cookieState}`;
    const authcodeUrl = `${learnServer}/learn/api/public/v1/oauth2/authorizationcode?redirect_uri=${redirectUri}`;

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

    let learnHost = '';
    let returnUrl = '';
    let courseName = '';
    let isStudent = true;
    let isDeepLinking = false;
    let learnLocale = 'en-us';
    const learnInfo = req.cookies['learnInfo'];

    if (learnInfo) {
      const learn = JSON.parse(learnInfo)
      learnHost = learn.learnHost;
      returnUrl = learn.returnUrl;
      courseName = encodeURIComponent(learn.courseName);
      learnLocale = learn.locale;
      isStudent = learn.isStudent;
      isDeepLinking = learn.isDeepLinking;
    }

    const redirectUri = `${config.frontendUrl}/tlocode`;
    const learnUrl = learnHost + `/learn/api/public/v1/oauth2/token?code=${req.query.code}&redirect_uri=${redirectUri}`;

    // If we have a code, let's get us a bearer token here.
    const auth_hash = new Buffer.from(`${config.appKey}:${config.appSecret}`).toString('base64');
    const auth_string = `Basic ${auth_hash}`;
    console.log(`Auth string: ${auth_string}`);
    const options = {
      headers: {
        Authorization: auth_string,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    console.log(`Getting REST bearer token at ${learnUrl}`);
    const response = await axios.post(learnUrl, 'grant_type=authorization_code', options);
    if (response.status === 200) {
      const token = response.data.access_token;
      console.log(`Got bearer token`);

      const nonce = uuid.v4();

      // Cache the nonce
      redisUtil.redisSave(nonce, 'nonce');

      // Cache the REST token
      redisUtil.redisSave(`${nonce}:rest`, token);

      // Now get the LTI OAuth 2 bearer token (shame they aren't the same)
      const ltiToken = await ltiTokenService.getLTIToken(config.bbClientId, config.oauthTokenUrl, 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly');

      // Cache the LTI token
      redisUtil.redisSave(`${nonce}:lti`, ltiToken);

      // Now finally redirect to the IVS app
      res.redirect(`/?nonce=${nonce}&returnurl=${returnUrl}&cname=${courseName}&student=${isStudent}&dl=${isDeepLinking}&setLang=${learnLocale}#/viewAssignment`);
    } else {
      console.log(`Failed to get token with response ${response.status}`);
      res.send(`An error occurred getting OAuth2 token ${response.status}`);
    }
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
    // 2. Is the key for our cached bearer token
    const nonce = body.nonce;
    const token = await redisUtil.redisGet(`${nonce}:rest`);
    if (!token) {
      console.log(`Couldn't get token for nonce ${nonce}:rest...exiting.`);
      res.status(404).send(`Couldn't find nonce`);
      return;
    }
    console.log(`sendAssignment got bearer token`);

    // Remove the nonce so it can't be replayed
    redisUtil.redisDelete(nonce);

    let learnInfo = {};
    if (req.cookies['learnInfo']) {
      learnInfo = JSON.parse(req.cookies['learnInfo']);
    }

    const deepLinkReturn = await deepLinkService.createDeepContent(body.assignment, learnInfo, token);
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
    let learnInfo = {};
    if (req.cookies['learnInfo']) {
      learnInfo = JSON.parse(req.cookies['learnInfo']);
    }

    console.log(`saveSubmission for ${learnInfo.userId}`);
    const assignment = req.body.assignment;
    console.log(`saveSubmission ${JSON.stringify(assignment)}`);
    const response = await assignmentService.saveSubmission(learnInfo.userId, assignment.id, assignment);
    res.send(response);
  });

  app.get('/assignmentData', async (req, res) => {
    let learnInfo = {};
    if (req.cookies['learnInfo']) {
      learnInfo = JSON.parse(req.cookies['learnInfo']);
    }

    console.log(`assignmentData for ${learnInfo.courseId}`)
    const assignment = await assignmentService.loadAssignment(learnInfo.userId, learnInfo.resourceId, learnInfo.isStudent);
    console.log(`returning assignmentData ${JSON.stringify(assignment)}`)
    res.send(assignment);
  })

  app.get('/userData', async (req, res) => {
    const nonce = req.query.nonce;

    let learnInfo = {};
    if (req.cookies['learnInfo']) {
      learnInfo = JSON.parse(req.cookies['learnInfo']);
    }
    console.log(`userData for ${learnInfo.courseId} and nonce ${nonce}`);

    const token = await ltiTokenService.getCachedLTIToken(nonce);

    if (!token) return [];

    const users = await userService.loadUsers(learnInfo.courseId, learnInfo.nrpsUrl, token);
    console.log(`returning users ${JSON.stringify(users)}`)
    res.send(users);
  })

  //=======================================================
  // Catch all
  app.get('*', (req, res) => {
    console.log('catchall - (' + req.url + ')');
    res.redirect('/#/viewAssignment');
  });
};
