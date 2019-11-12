import * as Utils from './utils.js';
import {$} from './utils.js';
import Auth from './auth.js';
import ChatsList from './chats_list.js';
import TdClient from './td_client.js';

export default new class App {
  chats = new Map();
  basicGroups = new Map();
  supergroups = new Map();
  users = new Map();
  files = new Map();

  init(params) {
    this.params = params;

    this.emitter = new MessageChannel().port1;

    this.dom = {
      header: $('.header'),
    };

    TdClient.listen(this.onUpdate);
    TdClient.init();
  }

  on(eventType, listener) {
    this.emitter.addEventListener(eventType, listener);
  }

  off(eventType, listener) {
    this.emitter.removeEventListener(eventType, listener);
  }

  trigger(eventType, data = null) {
    this.emitter.dispatchEvent(new CustomEvent(eventType, {detail: data}));
  }

  onUpdate = (update) => {
    switch (update['@type']) {
      case 'updateConnectionState':
        this.updateConnectionState(update.state);
        break;
      case 'updateAuthorizationState':
        this.updateAuthorizationState(update.authorization_state);
        break;
      case 'updateNewChat':
        this.chats.set(update.chat.id, update.chat);
        break;
      case 'updateChatOrder':
        ChatsList.updateChatOrder(update.chat_id, update.order);
        break;
      case 'updateChatLastMessage':
        if (update.order !== '0') {
          ChatsList.updateChatOrder(update.chat_id, update.order);
        }
        this.updateChatLastMessage(update.chat_id, update.last_message);
        break;
      case 'updateChatIsPinned':
        // update.is_pinned
        this.updateChatOrder(update.chat_id, update.order);
        break;
      case 'updateChatReadInbox':
        this.updateChatReadInbox(update.chat_id, update.unread_count, update.last_read_inbox_message_id);
        break;
      case 'updateBasicGroup':
        this.updateBasicGroup(update.basic_group.id, update.basic_group);
        break;
      case 'updateSupergroup':
        this.updateSupergroup(update.supergroup.id, update.supergroup);
        break;
      case 'updateUser':
        this.users.set(update.user.id, update.user);
        break;
      case 'updateUserStatus':
        this.updateUserStatus(update.user_id, update.status);
        break;
      default:
        console.log('update', update);
    }
  };

  updateUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
    }
  }

  updateChatLastMessage(chatId, message) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.last_message = message;
      ChatsList.updateChatPreview(chat);
    }
  }

  updateChatReadInbox(chatId, unreadCount, lastReadInboxMessageId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.unread_count = unreadCount;
      chat.last_read_inbox_message_id = lastReadInboxMessageId;
      ChatsList.updateChatPreview(chat);
    }
  }

  updateBasicGroup(groupId, group) {
    this.basicGroups.set(groupId, group);
  }

  updateSupergroup(groupId, group) {
    this.supergroups.set(groupId, group);
  }

  updateConnectionState(state) {
    let text = '';
    switch (state['@type']) {
      case 'connectionStateConnecting':
        text = 'Connecting...';
        break;
      case 'connectionStateUpdating':
        text = 'Updating...';
        break;
    }
    this.dom.header.textContent = text;
  }

  updateAuthorizationState(state) {
    switch (state['@type']) {
      case 'authorizationStateWaitEncryptionKey':
        this.checkDatabaseEncryptionKey();
        break;
      case 'authorizationStateWaitTdlibParameters':
        this.setTdlibParameters();
        break;
      case 'authorizationStateWaitPhoneNumber':
        this.setAuthenticationPhoneNumber(prompt('Phone number'));
        break;
      case 'authorizationStateWaitCode':
        this.checkAuthenticationCode(prompt('Code'));
        break;
      case 'authorizationStateWaitPassword':
        this.checkAuthenticationPassword(prompt('Password'));
        break;
      case 'authorizationStateReady':
        ChatsList.renderChats();
        break;
    }
  }

  checkDatabaseEncryptionKey() {
    TdClient.send({
      '@type': 'checkDatabaseEncryptionKey'
    });
  }

  setTdlibParameters() {
    TdClient.send({
      '@type': 'setTdlibParameters',
      parameters: {
        '@type': 'tdParameters',
        use_test_dc: false,
        api_id: this.params.api_id,
        api_hash: this.params.api_hash,
        system_language_code: Utils.getSystemLang(),
        device_model: Utils.getBrowser(),
        system_version: Utils.getOSName(),
        application_version: Utils.getAppVersion(),
        use_secret_chats: false,
        use_message_database: true,
        use_file_database: false,
        database_directory: '/db',
        files_directory: '/',
        // enable_storage_optimizer: true,
      }
    });
  }

  setAuthenticationPhoneNumber(phoneNumber) {
    TdClient.send({
      '@type': 'setAuthenticationPhoneNumber',
      phone_number: phoneNumber,
    });
  }

  checkAuthenticationCode(code) {
    TdClient.send({
      '@type': 'checkAuthenticationCode',
      code,
    });
  }

  checkAuthenticationPassword(password) {
    TdClient.send({
      '@type': 'checkAuthenticationPassword',
      password,
    });
  }

}
