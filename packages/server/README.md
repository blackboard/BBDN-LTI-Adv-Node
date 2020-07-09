# Amazon Interactive Video Service Server
This is a Node.js application that allows you to create and select videos to embed in Learn Ultra 

## Requirements
- [Node and npm](http://nodejs.org), preferable Node 10.x or higher.

## Configuration
You can override a number of configuration properties by creating a config_override.json file in ./config. Below is an example:

```js
{
  "frontendUrl": "https://mylocal.example.io",
  "serverPort": "3000",
  "appKey": "12345",
  "appSecret": "12345",
  "bbClientId": "12345",
  "msClientId": "12345",
  "serverUrl": "http://localhost",
  "issuer": "https://blackboard.com",
  "jwksUrl": "https://developer.blackboard.com/api/v1/management/applications/12345/jwks.json",
  "oauthTokenUrl": "https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken",
  "oidcAuthUrl": "https://developer.blackboard.com/api/v1/gateway/oidcauth"
  "redis_host": "localhost",
  "redis_port": 6379
}
```

Override the configuration by creating a `packages/server/config/config_override.json` file

If you want to run under SSL you should reverse proxy via something like nginx.

## How To Run the code
From the root run:

`yarn install`

`yarn start`

Access the application via http://localhost:3000. You can customize the host name and port number by creating a server/config/config_override.json file (see the server/config/config.json file for a template)

The LTI deep link launch link (and Redirect URI) is <host>/deeplink

# Docker

Docker specific files are included (Dockerfile, docker-compose.yml, launch.sh).

Use config_override.json (same entries as config.json) to override redis host name from localhost to redis so it can access the redis docker container.

If running the docker image on the same machine as the learn instance then the docker-compose.yml needs to contain the ip address of the machine being used. Start containers using __docker-compose up__
