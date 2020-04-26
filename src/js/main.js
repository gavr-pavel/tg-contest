import {App} from './app.js';

window.App = App;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
