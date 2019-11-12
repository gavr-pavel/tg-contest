import {Api} from './api.js';
import {TLDeserialization, TLSerialization} from './tl.js';
import {workerTask} from './utils.js';

class App {
  constructor() {
    this.api = new Api();
    this.workerTask = workerTask;
  }
}

window.app = new App;
window.TLSerialization = TLSerialization;
window.TLDeserialization = TLDeserialization;
