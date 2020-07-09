import React from 'react';
import ReactDOM from 'react-dom';
import { Locale } from 'react-babelfish';
import App from './App';
import { StandaloneBabelfish, StandaloneBabelfishFormat } from './components/common/babelfish';
import queryString from 'query-string';

let babelfishInstance = new StandaloneBabelfish() as any;
let babelfishFormatInstance = new StandaloneBabelfishFormat(babelfishInstance) as any;

let queryParams = queryString.parse(window.location.search);
let appLocale = queryParams?.setLang as string || 'en';
appLocale = appLocale.toLowerCase();

ReactDOM.render(
  <Locale
    locale={appLocale}
    babelfishInstance={babelfishInstance}
    babelfishFormatInstance={babelfishFormatInstance}
    bundlesToLoad={ ['ui/locales/[locale]/ivs.json'] }>
    <App/>
  </Locale>,
  document.getElementById('root')
);
