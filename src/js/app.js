import * as Utils from './utils.js';
import {LoginController} from './login_controller.js';
import {ChatsController} from './chats_controller';
import {MessagesController} from './messages_controller.js';
import {FileApiManager} from './api/file_api_manager';
import {MDCSnackbar} from '@material/snackbar/component';

const App = new class {
  API_ID = 884322;
  API_HASH = '77498db3367014eec55b317377f52779';
  APP_VERSION = '0.0.1';

  auth_user_id = 0;

  constructor() {
    const apiAuth = Utils.Storage.get('api_auth');

    if (apiAuth) {
      this.auth_user_id = apiAuth.user_id;
      this.initMainView();
    } else {
      LoginController.init();
    }

    ApiClient.emitter.on('updateConnectionState', (event) => {
      const header = Utils.$('.header');
      if (!header) {
        return;
      }
      const state = event.detail;
      if (state === 'connecting') {
        header.innerText = 'Connecting...';
      } else if (state === 'connected') {
        header.innerText = '';
      }
    });

    window.FileApiManager = FileApiManager;
  }

  authDone(auth) {
    this.auth_user_id = auth.user.id;
    Utils.Storage.set('api_auth', {user_id: auth.user.id});
    LoginController.destroy();
    this.initMainView();
  }

  getAuthUserId() {
    return this.auth_user_id;
  }

  logOut() {
    ApiClient.callMethod('auth.logOut', {}).then((res) => {
      if (res._ === 'boolTrue') {
        this.logOutDone();
      } else {
        this.alert('logout error');
      }
    });
  }

  logOutDone() {
    localStorage.clear();
    location.reload();
  }

  initMainView() {
    const mainContainer = Utils.importTemplate('main');
    document.body.append(mainContainer);

    ChatsController.init();
    MessagesController.init();
  }

  alert(text) {
    if (this.snackbar) {
      this.snackbar.destroy();
    }

    const el = Utils.buildHtmlElement(`
      <div class="mdc-snackbar">
        <div class="mdc-snackbar__surface">
          <div class="mdc-snackbar__label">${text}</div>
        </div>
      </div>
    `);

    document.body.append(el);

    this.snackbar = new MDCSnackbar(el);
    this.snackbar.open();
  }
};

export {App};
