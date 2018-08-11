// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const root = document.getElementById('root');
if (!root) {
  throw new Error("Can't find `root`");
}

ReactDOM.render(<App />, root);
registerServiceWorker();
