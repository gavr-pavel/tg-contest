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

  chats = new Map();
  users = new Map();

  constructor() {
    this.auth_user_id = Utils.Storage.get('api_auth');
    if (this.auth_user_id) {
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

  logOut() {
    Utils.Storage.remove('api_auth');
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

  // init(params) {
  //   this.params = params;
  //
  //   this.emitter = new MessageChannel().port1;
  //
  //   this.dom = {
  //     header: $('.header'),
  //   };
  //
  //   TdClient.listen(this.onUpdate);
  //   TdClient.init();
  // }

  // on(eventType, listener) {
  //   this.emitter.addEventListener(eventType, listener);
  // }
  //
  // off(eventType, listener) {
  //   this.emitter.removeEventListener(eventType, listener);
  // }
  //
  // trigger(eventType, data = null) {
  //   this.emitter.dispatchEvent(new CustomEvent(eventType, {detail: data}));
  // }
  //
  // updateUserStatus(userId, status) {
  //   const user = this.users.get(userId);
  //   if (user) {
  //     user.status = status;
  //   }
  // }
  //
  // updateChatLastMessage(chatId, message) {
  //   const chat = this.chats.get(chatId);
  //   if (chat) {
  //     chat.last_message = message;
  //     ChatsList.updateChatPreview(chat);
  //   }
  // }
  //
  // updateChatReadInbox(chatId, unreadCount, lastReadInboxMessageId) {
  //   const chat = this.chats.get(chatId);
  //   if (chat) {
  //     chat.unread_count = unreadCount;
  //     chat.last_read_inbox_message_id = lastReadInboxMessageId;
  //     ChatsList.updateChatPreview(chat);
  //   }
  // }
  //
  // updateBasicGroup(groupId, group) {
  //   this.basicGroups.set(groupId, group);
  // }
  //
  // updateSupergroup(groupId, group) {
  //   this.supergroups.set(groupId, group);
  // }
  //
  // updateConnectionState(state) {
  //   let text = '';
  //   switch (state['@type']) {
  //     case 'connectionStateConnecting':
  //       text = 'Connecting...';
  //       break;
  //     case 'connectionStateUpdating':
  //       text = 'Updating...';
  //       break;
  //   }
  //   this.dom.header.textContent = text;
  // }
  //
  // updateAuthorizationState(state) {
  //   switch (state['@type']) {
  //     case 'authorizationStateWaitEncryptionKey':
  //       this.checkDatabaseEncryptionKey();
  //       break;
  //     case 'authorizationStateWaitTdlibParameters':
  //       this.setTdlibParameters();
  //       break;
  //     case 'authorizationStateWaitPhoneNumber':
  //       this.setAuthenticationPhoneNumber(prompt('Phone number'));
  //       break;
  //     case 'authorizationStateWaitCode':
  //       this.checkAuthenticationCode(prompt('Code'));
  //       break;
  //     case 'authorizationStateWaitPassword':
  //       this.checkAuthenticationPassword(prompt('Password'));
  //       break;
  //     case 'authorizationStateReady':
  //       ChatsList.renderChats();
  //       break;
  //   }
  // }
  //
  // checkDatabaseEncryptionKey() {
  //   TdClient.send({
  //     '@type': 'checkDatabaseEncryptionKey'
  //   });
  // }
  //
  // setTdlibParameters() {
  //   TdClient.send({
  //     '@type': 'setTdlibParameters',
  //     parameters: {
  //       '@type': 'tdParameters',
  //       use_test_dc: false,
  //       api_id: this.params.api_id,
  //       api_hash: this.params.api_hash,
  //       system_language_code: Utils.getSystemLang(),
  //       device_model: Utils.getBrowser(),
  //       system_version: Utils.getOSName(),
  //       application_version: Utils.getAppVersion(),
  //       use_secret_chats: false,
  //       use_message_database: true,
  //       use_file_database: false,
  //       database_directory: '/db',
  //       files_directory: '/',
  //       // enable_storage_optimizer: true,
  //     }
  //   });
  // }
  //
  // setAuthenticationPhoneNumber(phoneNumber) {
  //   TdClient.send({
  //     '@type': 'setAuthenticationPhoneNumber',
  //     phone_number: phoneNumber,
  //   });
  // }
  //
  // checkAuthenticationCode(code) {
  //   TdClient.send({
  //     '@type': 'checkAuthenticationCode',
  //     code,
  //   });
  // }
  //
  // checkAuthenticationPassword(password) {
  //   TdClient.send({
  //     '@type': 'checkAuthenticationPassword',
  //     password,
  //   });
  // }
};

export {App};
