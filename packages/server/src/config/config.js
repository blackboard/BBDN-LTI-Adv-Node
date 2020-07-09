import * as _ from 'lodash';
import configJson from '../../config/config.json';

/**
 * Load the customized config values from the config.json data.
 */

let configJsonOverride = null;
let configResult = {};
try {
  configJsonOverride = require("../../config/config_override.json");
} catch (ex) {
  console.log('No config_override.json found');
  console.log(ex);
  // Ignore error if no override configuration file is present
}

if (configJsonOverride) {
  configResult = _.defaultsDeep(configJsonOverride, configJson);
}

export default _.defaultsDeep(configResult, configJson);

console.log(JSON.stringify(configResult, null, 2));
