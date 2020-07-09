import bodyParser from "body-parser";
import express from "express";
import routes from "./app/routes.js";
import config from "./config/config.js";
import redisUtil from './util/redisutil';

const app = express();
const httpProxy = express();

let listenPort =
  process.env.PORT ||
  (config.serverPort !== "NA" ? config.serverPort : 5000);

redisUtil.redisInit(config.redis_host, config.redis_port);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // don't validate ssl cert for posts to ssl sites

app.use(express.static("./lib/ui")); // set the static files location
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);

httpProxy.use(function (err, req, res) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

httpProxy.use(bodyParser.json({type: "*/*"}));
httpProxy.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, key, secret, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  next();
});

// routes ======================================================================
routes(app);

// listen (start app with node server.js) ======================================

const frontEnd = config.frontendUrl;

app.listen(listenPort);
console.log("Home page:  " + frontEnd);
console.log("LTI 1.3 Login URL: " + frontEnd + "/oidclogin");
console.log("LTI 1.3 Redirect URL: " + frontEnd + "/lti13," + frontEnd + "/deeplink");
console.log("LTI 1.3 Target URL: " + frontEnd + "/lti13");
console.log("LTI 1.3 Deep Linking URL: " + frontEnd + "/deeplink");
console.log("JWKS URL: " + frontEnd + "/.well-known/jwks.json");
console.log("Listening on " + listenPort);
