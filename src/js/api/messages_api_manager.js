import {ApiClient} from './api_client';
import {Emitter} from '../utils';

const MessagesApiManager = new class {
  dialogs = [];
  messages = new Map();
  chats = new Map();
  users = new Map();
  peerDialogs = new Map();
  chatMessages = new Map();

  emitter = new Emitter();

  getInputUser(id) {
    const user = this.users.get(id);
    if (!user) {
      return {_: 'inputUserEmpty'};
    }
    if (user.pFlags.self) {
      return {_: 'inputUserSelf'}
    }
    return {
      _: 'inputUser',
      user_id: id,
      access_hash: user.access_hash || 0
    }
  }

  constructor() {
    ApiClient.emitter.on('updates', (event) => {
      this.handleUpdates(event.detail);
    });
  }

  handleUpdates(object) {
    switch (object._) {
      case 'updates':
        this.updateChats(object.chats);
        this.updateUsers(object.users);
        for (const update of object.updates) {
          this.handleUpdate(update);
        }
        break;
      case 'updateShort':
        this.handleUpdateShort(object.update);
        break;
      case 'updateShortMessage':
        this.handleUpdateShortMessage(object);
    }
  }

  handleUpdateShort(update) {
    switch (update._) {
      case 'updateUserStatus': {
        const user = this.users.get(update.user_id);
        if (user) {
          user.status = update.status;
        }
      } break;
    }
  }

  handleUpdate(update) {
    switch (update._) {
      case 'updateNewMessage':
      case 'updateNewChannelMessage': {
        const message = update.message;
        this.updateMessages([message]);
        const chatId = this.getPeerId(message.to_id);
        const dialog = this.peerDialogs.get(chatId);
        if (dialog) {
          dialog.top_message = message.id;
        }
        this.updateChatMessages(chatId, [message]);
        this.emitter.trigger('chatNewMessage', {chatId, message});
      } break;
      // case 'updateDeleteMessages':
      //   for (const msgId of update.messages) {
      //     this.emitter.trigger('messageDelete', {id: msgId});
      //   }
      //   break;
      case 'updateReadHistoryInbox':
      case 'updateReadChannelInbox': {
        const peerId = update._ === 'updateReadChannelInbox' ? update.channel_id : this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.unread_count = Math.max(0, dialog.unread_count - 1);
          this.emitter.trigger('updateUnreadCount', {chatId: peerId, dialog});
        }
      } break;
    }
  }

  handleUpdateShortMessage(update) {
    const message = {
      _: 'message',
      id: update.id,
      date: update.date,
      message: update.message,
      to_id: {_: 'peerUser', user_id: update.user_id},
      pFlags: {}
    };
    this.updateMessages([message]);
    const chatId = update.user_id;
    const dialog = this.peerDialogs.get(chatId);
    if (dialog) {
      dialog.top_message = message.id;
    }
    this.updateChatMessages(chatId, [message]);
    this.emitter.trigger('chatNewMessage', {chatId, message});
  }

  async loadDialogs(offset = {}, limit = 20) {
    await ApiClient.connectionDefered.promise;
    const response = await ApiClient.callMethod('messages.getDialogs', {
      offset_date: offset.date || 0,
      offset_id: offset.id || 0,
      offset_peer: this.getInputPeer(offset.peer),
      limit: limit
    });

    if (response._ === 'messages.dialogsNotModified') {
      return;
    } else if (response._ === 'messages.dialogsSlice') {
      // this.totalCount = response.count;
    } else if (response._ === 'messages.dialogs') {
      // this.totalCount = response.dialogs.length;
    }

    const {dialogs, messages, chats, users} = response;

    this.updateUsers(users);
    this.updateChats(chats);
    this.updateMessages(messages);
    this.updateDialogs(dialogs);
  }

  async loadChatMessages(dialog, offsetId, limit) {
    const chatId = this.getPeerId(dialog.peer);

    let chatMessages;

    if (this.chatMessages.has(chatId)) {
      chatMessages = this.chatMessages.get(chatId);
      if (!offsetId || offsetId > chatMessages[chatMessages.length - 1].id) {
        this.emitter.trigger('chatMessagesUpdate', {chatId, messages: chatMessages});
        return;
      }
    } else {
      chatMessages = [];
      const lastMessage = this.messages.get(dialog.top_message);
      if (lastMessage) {
        chatMessages.push(lastMessage);
        if (!offsetId) {
          offsetId = lastMessage.id;
        }
      }
      this.chatMessages.set(chatId, chatMessages);
      this.emitter.trigger('chatMessagesUpdate', {chatId, messages: chatMessages});
    }

    const response = await ApiClient.callMethod('messages.getHistory', {
      peer: this.getInputPeer(dialog.peer),
      offset_id: offsetId,
      limit: limit,
      offset_date: 0,
    });

    this.updateMessages(response.messages);
    this.updateUsers(response.users);
    this.updateChats(response.chats);

    this.updateChatMessages(chatId, response.messages, true);
  }

  updateDialogs(dialogs) {
    for (const dialog of dialogs) {
      const peerId = this.getPeerId(dialog.peer);
      this.peerDialogs.set(peerId, dialog);
    }
    this.dialogs = this.dialogs.concat(dialogs);
    this.emitter.trigger('dialogsUpdate', this.dialogs);

    this.preloadDialogsMessages(dialogs);
  }

  async preloadDialogsMessages(dialogs) {
    if (this.dialogsPreloaded) {
      return;
    }
    this.dialogsPreloaded = true;
    for (const dialog of dialogs) {
      if (!this.chatMessages.has(this.getPeerId(dialog.peer))) {
        await this.loadChatMessages(dialog, 0, 10);
      }
    }
  }

  updateUsers(users) {
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }

  updateChats(chats) {
    for (const chat of chats) {
      this.chats.set(chat.id, chat);
    }
  }

  updateMessages(messages) {
    for (const message of messages) {
      this.messages.set(message.id, message);
    }
  }

  updateChatMessages(chatId, newMessages, history = false) {
    const chatMessages = this.chatMessages.get(chatId);
    if (!chatMessages) {
      return;
    }
    if (history) {
      chatMessages.push(...newMessages);
    } else {
      chatMessages.unshift(...newMessages);
    }
    this.emitter.trigger('chatMessagesUpdate', {chatId, messages: chatMessages});
  }

  sendMessage(peer, message) {
    return ApiClient.callMethod('messages.sendMessage', {
      message,
      peer: this.getInputPeer(peer),
      random_id: Math.floor(Math.random() * 1e9),
    })
        .then((res) => {
          this.handleUpdates(res);
        });
  }

  getDialog(peerId) {
    return this.peerDialogs.get(peerId);
  }

  getPeerId(peer) {
    switch (peer._) {
      case 'peerUser':
        return peer.user_id;
      case 'peerChat': // Group
        return peer.chat_id;
      case 'peerChannel': // Channel/supergroup
        return peer.channel_id;
    }
  }

  getPeerData(peer) {
    switch (peer._) {
      case 'peerUser':
        return this.users.get(peer.user_id);
      case 'peerChat':
        return this.chats.get(peer.chat_id);
      case 'peerChannel':
        return this.chats.get(peer.channel_id);
    }
  }

  getPeerName(peer, full = true) {
    const peerData = this.getPeerData(peer);
    if (!peerData) {
      return '';
    }

    if (peer._ === 'peerUser') {
      if (peerData.pFlags.deleted) {
        return 'Deleted Account';
      } else if (full) {
        return [peerData.first_name, peerData.last_name].join(' ').trim();
      } else {
        return peerData.first_name || peerData.last_name || '';
      }
    } else {
      return peerData.title || '';
    }
  }

  getPeerPhoto(peer) {
    const peerData = this.getPeerData(peer);
    return peerData ? peerData.photo : false;
  }

  getInputPeer(peer) {
    if (!peer) {
      return {_: 'inputPeerEmpty'};
    }
    const peerData = this.getPeerData(peer);
    switch (peer._) {
      case 'peerUser':
        return {_: 'inputPeerUser', user_id: peer.user_id, access_hash: peerData.access_hash || 0};
      case 'peerChat':
        return {_: 'inputPeerChat', chat_id: peer.chat_id, access_hash: peerData.access_hash || 0};
      case 'peerChannel':
        return {_: 'inputPeerChannel', channel_id: peer.channel_id, access_hash: peerData.access_hash || 0};
    }
  }
};

window.MessagesApiManager = MessagesApiManager;

export {MessagesApiManager};
