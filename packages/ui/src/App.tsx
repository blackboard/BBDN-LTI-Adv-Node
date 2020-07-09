import React from 'react';
import { createHashHistory } from 'history'
import { applyMiddleware, createStore, compose } from 'redux'
import { Provider } from 'react-redux'
import { Route, Switch } from 'react-router'
import { ConnectedRouter, routerMiddleware } from 'connected-react-router'
import { createRootReducer } from './RootReducer'
import ErrorPage from './ErrorPage';
import { localizedComponentWrapper } from 'react-babelfish';
import moment from 'moment';
import 'moment/min/locales.min';
import { initializeIcons } from 'office-ui-fabric-react';
import { parameters } from './util/parameters';
import queryString from 'query-string';
import ViewAssignmentPage from './AssignmentList';
import { createStreamMiddleware } from './assignment-creator/middleware';

moment.locale(navigator.language);

initializeIcons();

const hist = createHashHistory();

const store = createStore(
  createRootReducer(hist),
  compose(
    applyMiddleware(
      routerMiddleware(hist),
      createStreamMiddleware()
    )
  )
);

const queryParams = queryString.parse(location.search);
const nonce = queryParams?.nonce;
let params = parameters.getInstance();
params.setNonce(nonce as string);

const returnUrl = queryParams?.returnurl;
params.setReturnUrl(returnUrl as string);

const courseName = queryParams?.cname;
params.setCourseName(decodeURIComponent(courseName as string));

const isStudent = queryParams?.student;
params.setStudent(isStudent === 'true');

function App() {
  return (
    <Provider store={store}>
      <ConnectedRouter history={hist}>
        <Switch>
          <Route exact path="/viewAssignment" component={ViewAssignmentPage} />
          <Route exact path="/error" component={ErrorPage} />
          <Route component={ViewAssignmentPage} />
        </Switch>
      </ConnectedRouter>
    </Provider>
  );
}

export default localizedComponentWrapper(App);
