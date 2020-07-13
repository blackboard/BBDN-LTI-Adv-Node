"use strict";
import config from "../config/config";
import {JWTPayload} from "../common/restTypes";

let srequest = require("sync-request");
let jwt = require("jsonwebtoken");
let crypto = require("crypto");
let request = require("request");
let uuid = require("uuid");
let jwk2pem = require('pem-jwk').jwk2pem

exports.toolLaunch = function(req, res, jwtPayload) {
  let id_token = req.body.id_token;

  this.verifyToken(id_token, jwtPayload);
};

// Pass in JWT and jwtPayload will be populated with results
exports.verifyToken = function(id_token) {
  let parts = id_token.split(".");

  // Parse and store payload data from launch
  let jwtPayload = new JWTPayload();
  jwtPayload.header = JSON.parse(Buffer.from(parts[0], "base64").toString());
  jwtPayload.body = JSON.parse(Buffer.from(parts[1], "base64").toString());
  jwtPayload.verified = false;

  if (
    jwtPayload.body[
      "https://purl.imsglobal.org/spec/lti/claim/launch_presentation"
    ] !== undefined
  ) {
    jwtPayload.return_url =
      jwtPayload.body[
        "https://purl.imsglobal.org/spec/lti/claim/launch_presentation"
      ].return_url;
    jwtPayload.error_url = jwtPayload.return_url;
  }
  if (
    jwtPayload.body[
      "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice"
    ] !== undefined
  ) {
    jwtPayload.names_roles = true;
  }
  if (
    jwtPayload.body[
      "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
    ] !== undefined
  ) {
    jwtPayload.grading = true;
  }
  if (
      jwtPayload.body[
          "https://purl.imsglobal.org/spec/lti-gs/claim/groupsservice"
          ] !== undefined
  ) {
    jwtPayload.groups = true;
  }

  // Verify launch is from correct party
  // aud could be an array or a single entry
  let clientId;
  if (jwtPayload.body.aud instanceof Array) {
    clientId = jwtPayload.body.aud[0];
  } else {
    clientId = jwtPayload.body.aud;
  }

  if (clientId !== config.bbClientId) {
    console.log("Client ID passed in doesn't match configured client ID");
    return null;
  }

  // Do a synchronous call to dev portal
  let res;
  try {
    // TODO change to use axios?
    res = srequest("GET", config.jwksUrl);
  } catch (err) {
    console.log("Verify Error - request failed: " + err);
    return null;
  }

  if (res.statusCode !== 200) {
    console.log("Verify Error - jwks.json call failed: " + res.statusCode + "\n" + url);
    return null;
  }

  try {
    jwt.verify(id_token, jwk2pem(JSON.parse(res.getBody("UTF-8")).keys[0]));
    jwtPayload.verified = true;
    console.log("JWT verified " + jwtPayload.verified);
    console.log("JWT User ID: " + jwtPayload.body["sub"]);
    console.log("JWT custom params: " + JSON.stringify(jwtPayload.body["https://purl.imsglobal.org/spec/lti/claim/custom"]));
    console.log("JWT launch pres: " + JSON.stringify(jwtPayload.body["https://purl.imsglobal.org/spec/lti/claim/launch_presentation"]));
  } catch (err) {
    console.log("Verify Error - verify failed: " + err);
    jwtPayload.verified = false;
  }
  return jwtPayload;
};

exports.getOauth2Token = function(scope) {
  return new Promise(function(resolve, reject) {
    let options = {
      method: "POST",
      uri: config.oauthTokenUrl,
      headers: {
        content_type: "application/x-www-form-urlencoded"
      },
      form: {
        grant_type: "client_credentials",
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: oauth2JWT(),
        scope: scope
      }
    };

    request(options, function(err, response, body) {
      if (err) {
        console.log("Get Token Error - request failed: " + err.message);
        reject(body);
      } else if (response.statusCode !== 200) {
        console.log(
          "Get Token Error - Service call failed:  " +
            response.statusCode +
            "\n" +
            response.statusMessage +
            "\n" +
            options.uri
        );
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

exports.tokenGrab = function(req, res) {
  let scope =
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly";
  this.getOauth2Token(scope).then(
    function(token) {
      res.send(token);
    },
    function(error) {
      res.send(error);
    }
  );
};

exports.oidcLogin = function(req, res) {
  let state = uuid.v4();
  let nonce = uuid.v4();
  let url =
    config.oidcAuthUrl +
    "?response_type=id_token" +
    "&scope=openid" +
    "&login_hint=" +
    req.query.login_hint +
    "&lti_message_hint=" +
    req.query.lti_message_hint +
    "&state=" +
    state +
    "&redirect_uri=" +
    encodeURIComponent(`${config.frontendUrl}/lti13`) +
    "&client_id=" +
    config.bbClientId +
    "&nonce=" +
    nonce;

  // Per the OIDC best practices, save the state in a cookie, and check it on the way back in
  res.cookie("state", state,  { sameSite: 'none', secure: true, httpOnly: true });

  console.log("LTI JWT login init; redirecting to: " + url);
  res.redirect(url);
};

exports.signJwt = function(json) {
  try {
    let privateKey = jwk2pem(config.privateKey);
    const signedJwt = jwt.sign(json, privateKey, {algorithm: "RS256", keyid: "12345"});
    console.log(`signedJwt ${signedJwt}`);
    return signedJwt
  } catch (exception) {
    console.log(`Something bad happened in signing ${exception}`);
  }
};

let oauth2JWT = function() {
  let now = Math.trunc(new Date().getTime() / 1000);
  let json = {
    iss: "lti-tool",
    sub: config.bbClientId,
    aud: config.oauthTokenUrl,
    iat: now,
    exp: now + 5 * 60,
    jti: crypto.randomBytes(16).toString("hex")
  };

  return signJwt(json);
};
