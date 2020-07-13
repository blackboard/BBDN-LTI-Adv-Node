'use strict';
import config from '../config/config';
import {JWTPayload} from '../common/restTypes';
import redisUtil from '../util/redisutil';

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import uuid from 'uuid';
import {jwk2pem} from 'pem-jwk';
import srequest from 'sync-request'; // TODO replace with axios

exports.cacheLearnInfo = (key, learnInfo) => {
  console.log(`Caching learnInfo ${key} ${JSON.stringify(learnInfo)}`);
  redisUtil.redisSave(key, learnInfo);
};

exports.getLearnInfo = async (key) => {
  console.log(`Getting learnInfo with key ${key}`);
  const learnInfo = await redisUtil.redisGet(key);
  console.log(`returning learnInfo for ${key} ${JSON.stringify(learnInfo)}`);
  return learnInfo;
};

exports.toolLaunch = function(req, res, jwtPayload) {
  let id_token = req.body.id_token;

  this.verifyToken(id_token, jwtPayload);
};

// Validates the signature and content of the JWT
exports.verifyToken = function(id_token) {
  let parts = id_token.split('.');

  // Parse and store payload data from launch
  let jwtPayload = new JWTPayload();
  jwtPayload.header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  jwtPayload.body = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  jwtPayload.verified = false;

  // Verify launch is from correct party
  // aud could be an array or a single entry
  let clientId;
  if (jwtPayload.body.aud instanceof Array) {
    clientId = jwtPayload.body.aud[0];
  } else {
    clientId = jwtPayload.body.aud;
  }

  if (clientId !== config.bbClientId) {
    console.log('Client ID passed in does not match configured client ID');
    return null;
  }

  // Do a synchronous call to dev portal to get the public key for Learn
  let res;
  try {
    // TODO change to use axios?
    res = srequest('GET', config.jwksUrl);
  } catch (err) {
    console.log('Verify Error - request failed: ' + err);
    return null;
  }

  if (res.statusCode !== 200) {
    console.log('Verify Error - jwks.json call failed: ' + res.statusCode + '\n' + url);
    return null;
  }

  try {
    jwt.verify(id_token, jwk2pem(JSON.parse(res.getBody('UTF-8')).keys[0]));
    jwtPayload.verified = true;
    console.log('JWT verified ' + jwtPayload.verified);
    console.log('JWT User ID: ' + jwtPayload.body['sub']);
    console.log('JWT custom params: ' + JSON.stringify(jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/custom']));
    console.log('JWT launch pres: ' + JSON.stringify(jwtPayload.body['https://purl.imsglobal.org/spec/lti/claim/launch_presentation']));
  } catch (err) {
    console.log('Verify Error - verify failed: ' + err);
    jwtPayload.verified = false;
  }
  return jwtPayload;
};

exports.oidcLogin = function(req, res) {
  let state = uuid.v4();
  let nonce = uuid.v4();
  let url =
    config.oidcAuthUrl +
    '?response_type=id_token' +
    '&scope=openid' +
    '&login_hint=' +
    req.query.login_hint +
    '&lti_message_hint=' +
    req.query.lti_message_hint +
    '&state=' +
    state +
    '&redirect_uri=' +
    encodeURIComponent(`${config.frontendUrl}/lti13`) +
    '&client_id=' +
    config.bbClientId +
    '&nonce=' +
    nonce;

  // Per the OIDC best practices, save the state in a cookie, and check it on the way back in
  res.cookie('state', state,  { sameSite: 'none', secure: true, httpOnly: true });

  console.log('LTI JWT login init; redirecting to: ' + url);
  res.redirect(url);
};

exports.signJwt = function(json) {
  try {
    let privateKey = jwk2pem(config.privateKey);
    const signedJwt = jwt.sign(json, privateKey, {algorithm: 'RS256', keyid: '12345'});
    console.log(`signedJwt ${signedJwt}`);
    return signedJwt
  } catch (exception) {
    console.log(`Something bad happened in signing ${exception}`);
  }
};
