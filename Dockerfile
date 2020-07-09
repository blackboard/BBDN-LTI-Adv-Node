FROM node:10.16.1 AS builder

# Create app directory
RUN mkdir -p /usr/app
RUN mkdir cldrdata.build
RUN mkdir locales.build
WORKDIR /usr/app

# Install app dependencies
COPY package.json yarn.lock gulpfile.js /usr/app/
COPY packages/server/package.json /usr/app/packages/server/package.json
COPY packages/ui/package.json /usr/app/packages/ui/package.json
RUN CI=1 yarn install

COPY lerna.json /usr/app/
COPY packages/ /usr/app/packages/
COPY locales/ /usr/app/locales/

RUN yarn build:locales
RUN yarn build

FROM node:10.16.1
USER node
WORKDIR /usr/app

COPY launch.sh /usr/app/
COPY --from=builder --chown=node:node /usr/app/ /usr/app/

EXPOSE 9010
CMD ./launch.sh
