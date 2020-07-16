'use strict';
import axios from 'axios';
import config from '../config/config';
import {JWTPayload} from '../common/restTypes';
import redisUtil from '../util/redisutil';

import jwt from 'jsonwebtoken';
import uuid from 'uuid';
import {jwk2pem} from 'pem-jwk';

exports.cacheLmsInfo = (key, lmsInfo) => {
  console.log(`Caching lmsInfo ${key} ${JSON.stringify(lmsInfo)}`);
  redisUtil.redisSave(key, lmsInfo);
};

exports.getLmsInfo = async (key) => {
  console.log(`Getting lmsInfo with key ${key}`);
  const lmsInfo = await redisUtil.redisGet(key);
  console.log(`returning lmsInfo for ${key} ${JSON.stringify(lmsInfo)}`);
  return lmsInfo ?? {};
};

// Validates the signature and content of the JWT
exports.verifyToken = async (id_token) => {
  let parts = id_token.split('.');

  // Parse and store payload data from launch
  let jwtPayload = new JWTPayload();
  jwtPayload.header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  console.log(`JWT header ${JSON.stringify(jwtPayload.header)}`);
  jwtPayload.body = JSON.parse(Buffer.from(parts[1], 'base64').toString());1
  console.log(`JWT body ${JSON.stringify(jwtPayload.body)}`);
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

  // Get the public keys from the platform JWKS URL
  try {
    console.log(`LMS JWKS URL ${config.jwksUrl}`);
    const response = await axios.get(config.jwksUrl);
    console.log(`Public keys ${JSON.stringify(response.data)}`);

    const key = response.data.keys.find(k => k.kid === jwtPayload.header.kid);

    jwt.verify(id_token, jwk2pem(key));
    jwtPayload.verified = true;
  } catch (err) {
    console.log(`Get public keys failed: ${JSON.stringify(err)}`);
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
