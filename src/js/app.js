import * as Utils from './utils.js';
import {LoginController} from './login_controller.js';
import {ChatsController} from './chats_controller';
import {MessagesController} from './messages_controller.js';
import {MDCSnackbar} from '@material/snackbar/component';
import {isIosSafari, Tpl} from './utils';

const App = new class {
  API_ID = 884322;
  API_HASH = '77498db3367014eec55b317377f52779';
  APP_VERSION = '0.3.0';

  auth_user_id = 0;

  constructor() {
    const apiAuth = Utils.Storage.get('api_auth');

    if (apiAuth) {
      this.auth_user_id = apiAuth.user_id;
      this.initMainView();
    } else {
      LoginController.init();
    }

    window.addEventListener('resize', this.onResize);
    this.onResize();

    document.addEventListener('visibilitychange', this.onDocumentVisibilityChange);

    window.addEventListener('hashchange', this.onLocationChange);
    setTimeout(this.onLocationChange);

    if (isIosSafari()) {
      document.body.classList.add('ios_safari');
    }
    // ApiClient.emitter.on('updateConnectionState', (event) => {
    //   const header = Utils.$('.header');
    //   if (!header) {
    //     return;
    //   }
    //   const state = event.detail;
    //   if (state === 'connecting') {
    //     header.innerText = 'Connecting...';
    //   } else if (state === 'connected') {
    //     header.innerText = '';
    //   }
    // });
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
    this.stopOnlineInterval();
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

    this.startOnlineInterval();
  }

  startOnlineInterval() {
    if (!this._onlineInterval) {
      const tick = () => {
        ApiClient.callMethod('account.updateStatus', {offline: false});
      };
      this._onlineInterval = setInterval(tick, 5 * 60 * 1000);
      tick();
    }
  }

  stopOnlineInterval()  {
    if (this._onlineInterval) {
      clearInterval(this._onlineInterval);
      this._onlineInterval = null;
    }
  }

  onDocumentVisibilityChange = () => {
    if (!this.getAuthUserId()) {
      return;
    }
    if (document.visibilityState !== 'visible') {
      this.stopOnlineInterval();
      this._offlineTimeout = setTimeout(() => {
        ApiClient.callMethod('account.updateStatus', {offline: true});
      }, 5000);
    } else {
      this.startOnlineInterval();
      if (this._offlineTimeout) {
        clearTimeout(this._offlineTimeout);
        this._offlineTimeout = null;
      }
    }
  };

  onResize = () => {
    document.body.classList.toggle('mobile_view', window.innerWidth < 1160);
  };

  isMobileView() {
    return document.body.classList.contains('mobile_view');
  }

  onRightSidebarOpen() {
    if (!this.isMobileView()) {
      document.body.classList.add('right_offset');
    }
  }

  onRightSidebarClose() {
    document.body.classList.remove('right_offset');
  }

  onLocationChange = () => {
    if (this.getAuthUserId()) {
      const loc = location.hash;
      if (!loc || loc === '#') {
        MessagesController.exitChat(false);
        return;
      }
      let match;
      match = loc.match(/^#@(.+)$/);
      if (match) {
        MessagesController.setChatByUsername(match[1]);
        return;
      }
      match = loc.match(/^#(user|channel|chat)(\d+)$/);
      if (match) {
        MessagesController.setChatByPeerType(match[2], match[1]);
        return;
      }
      debugger;
    }
    this.setLocation('');
  };

  setLocation(loc) {
    history.pushState(null, '', location.pathname + (loc ? `#${loc}` : ''));
  }

  alert(text) {
    if (this.snackbar) {
      this.snackbar.destroy();
    }

    const el = Tpl.html`
      <div class="mdc-snackbar">
        <div class="mdc-snackbar__surface">
          <div class="mdc-snackbar__label">${text}</div>
        </div>
      </div>
    `.buildElement();

    document.body.append(el);

    this.snackbar = new MDCSnackbar(el);
    this.snackbar.open();
  }
};

export {App};
