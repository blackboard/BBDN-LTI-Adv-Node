import { Babelfish } from 'bb-babelfish';
import BabelfishFormat from 'bb-babelfish-format';

export { localizedComponentWrapper } from 'react-babelfish';

export class StandaloneBabelfish extends Babelfish {
    /**
     * @param {string} url path of locale file
     * @return {Promise<*>} data
     */
    fetch(url) { // eslint-disable-line class-methods-use-this
      return JSON.parse(url);
    }

    /**
     * We simply return locale code as a path, to get passed to `load` method below
     *
     * @param {string} locale locale code
     * @param {string} pathTemplate original path template
     * @return {string} locale code
     */
    getBundlePath(locale) { // eslint-disable-line class-methods-use-this
        return locale;
    }

    /**
     * This will load combined locale bundle
     *
     * @param {string} path in this case path will be set to locale code
     *
     * @return {Promise<any>} promise which resolves with locale data
     */
    load(path) {
        if (this.loadedBundles[path] == null) {
            const filename = `${path}-combined`;

            try {
                const url = require(`../../../../../../locales.build/${filename}.json`); // eslint-disable-line global-require,import/no-dynamic-require
                this.loadedBundles[path] = Promise.resolve(url);
            } catch (e) {
                this.loadedBundles[path] = Promise.resolve({});
            }
        }

        return this.loadedBundles[path];
    }
}

export class StandaloneBabelfishFormat extends BabelfishFormat {
    /**
     * @param {string} locale locale code
     * @return {Promise<{}>} promise resolving with object containing cldr data
     */
    _load(locale) {
        try {
            const url = require(`../../../../../../cldrdata.build/${locale}-combined.json`); // eslint-disable-line global-require,import/no-dynamic-require
            return this.babelfishInstance.fetch(url);
        } catch (e) {
            return Promise.resolve({});
        }
    }
}
