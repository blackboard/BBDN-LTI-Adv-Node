import axios from 'axios';
import qs from 'qs';
import crypto from 'crypto';
import ltiAdv from './lti-adv';
import redisUtil from '../util/redisutil';

const oauth2JWT = (clientId, tokenUrl) => {
  let now = Math.trunc(new Date().getTime() / 1000);
  let json = {
    iss: "lti-tool",
    sub: clientId,
    aud: [tokenUrl, 'foo'],
    iat: now,
    exp: now + 5 * 60,
    jti: crypto.randomBytes(16).toString("hex")
  };

  return ltiAdv.signJwt(json);
};

exports.getCachedLTIToken = async (nonce) => {
  const token = await redisUtil.redisGet(`${nonce}:lti`);
  if (!token) {
    console.log(`Couldn't get token for nonce ${nonce}.`);
  }

  return token;
}

exports.getLTIToken = async (clientId, tokenUrl, scope) => {
  console.log(`getLTIToken client ${clientId} tokenUrl: ${tokenUrl} scope: ${scope}`);
  const clientAssertion = oauth2JWT(clientId, tokenUrl);

  const options = {
    method: "POST",
    url: tokenUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  const body = {
    grant_type: "client_credentials",
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: clientAssertion,
    scope: scope
  };

  try {
    const response = await axios.post(tokenUrl, qs.stringify(body), options);
    const token = response.data.access_token;
    console.log(`getLTIToken ${token}`);

    return token;
  } catch (exception) {
    console.log(`getLTIToken exception ${JSON.stringify(exception)}`);
  }
}
