import {ApiClient} from './api_client';
import {Emitter} from '../utils';
import {App} from '../app';

const MessagesApiManager = new class {
  dialogs = [];
  messages = new Map();
  chats = new Map();
  users = new Map();
  peerDialogs = new Map();
  chatMessages = new Map();

  emitter = new Emitter();

  constructor() {
    ApiClient.emitter.on('updates', (event) => {
      this.onUpdates(event.detail);
    });
  }

  async initUpdatesState() {
    this.updatesState = await ApiClient.callMethod('updates.getState');
  }

  checkUpdatesSeq(seq, date) {
    return true;
    // const local = this.updatesState;
    // if (local.seq + 1 === seq) {
    //   local.seq = seq;
    //   local.date = date;
    //   console.log(`updates state seq updated to ${seq}`);
    //   return true;
    // }
    // if (local.seq + 1 < seq) {
    //   // there's an updates gap that must be filled
    // }
    // console.warn(`bad updates seq ${seq}, local seq is ${local.seq}`);
    // debugger;
    // return false;
  }

  onUpdates(object) {
    switch (object._) {
      case 'updates':
      case 'updatesCombined':
        this.updateChats(object.chats);
        this.updateUsers(object.users);
        for (const update of object.updates) {
          this.handleUpdate(update);
        }
        break;
      case 'updateShort':
        this.handleUpdate(object.update);
        break;
      case 'updateShortMessage':
      case 'updateShortChatMessage':
        this.handleUpdateShortMessage(object);
    }
  }

  handleUpdate(update) {
    console.log(update._, update);
    switch (update._) {
      case 'updateNewMessage':
      case 'updateNewChannelMessage': {
        const message = update.message;
        this.updateMessages([message]);
        const chatId = this.getMessagePeerId(message);
        const dialog = this.peerDialogs.get(chatId);
        if (dialog) {
          dialog.top_message = message.id;
          if (!message.pFlags.out && message.id > dialog.read_inbox_max_id) {
            dialog.unread_count++;
          }
          this.handleDialogOrder(dialog);
        } else {
          this.handleNewDialog(message);
        }
        this.updateChatMessages(chatId, [message]);
        this.emitter.trigger('chatNewMessage', {chatId, message});
      } break;
      case 'updateEditMessage':
      case 'updateEditChannelMessage':{
        const msgId = update.message.id;
        const message = this.messages.get(msgId);
        if (message) {
          const chatId = this.getPeerId(message.to_id);
          this.updateChatEditedMessage(chatId, message, update.message);
        }
        this.messages.set(msgId, update.message);
      } break;
      case 'updateDeleteMessages':
      case 'updateDeleteChannelMessages': {
        for (let msgId of update.messages) {
          const message = this.messages.get(msgId);
          if (message) {
            this.messages.delete(msgId);
            const chatId = this.getPeerId(message.to_id);
            this.updateChatDeletedMessage(chatId, message);
          }
        }
      } break;
      case 'updateReadHistoryInbox':
      case 'updateReadChannelInbox': {
        const peerId = update.channel_id || this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.unread_count = update.still_unread_count;
          dialog.read_inbox_max_id = update.max_id;
          this.emitter.trigger('updateUnreadCount', {chatId: peerId, dialog});
        }
      } break;
      case 'updateUserStatus': {
        const user = this.users.get(update.user_id);
        if (user) {
          user.status = update.status;
        }
      } break;
      case 'updateDraftMessage': {
        const peerId = this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.draft = update.draft;
        }
      } break;
    }
  }

  handleUpdateShortMessage(update) {
    const isOut = update.pFlags.out;
    const fromId = update.from_id || (isOut ? App.getAuthUserId() : update.user_id);
    let toIdPeer;
    if (update.chat_id) {
      toIdPeer = {_: 'peerChat', chat_id: update.chat_id};
    } else {
      const userId = (isOut ? update.user_id : App.getAuthUserId());
      toIdPeer = {_: 'peerUser', user_id: userId};
    }

    this.handleUpdate({
      _: 'updateNewMessage',
      message: {
        _: 'message',
        flags: update.flags,
        pFlags: update.pFlags,
        id: update.id,
        from_id: fromId,
        to_id: toIdPeer,
        date: update.date,
        message: update.message,
        fwd_from: update.fwd_from,
        reply_to_msg_id: update.reply_to_msg_id,
        entities: update.entities
      },
      pts: update.pts,
      pts_count: update.pts_count
    });
  }

  async handleNewDialog(message) {
    // const peer = this.getMessagePeer(message);
    // const inputDialogPeer = {_: 'inputDialogPeer', peer: this.getInputPeer(peer)};
    // const res = await ApiClient.callMethod('messages.getPeerDialogs', {peers: [inputDialogPeer]});
    //
    // this.updateUsers(res.users);
    // this.updateChats(res.chats);
    // this.updateMessages(res.messages);
    // this.updateDialogs(res.dialogs);
    //
    // for (const dialog of res.dialogs) {
    //   this.handleDialogOrder(res.dialog);
    // }
  }

  handleDialogOrder(dialog) {
    // if (dialog.pFlags.pinned) {
    //   return;
    // }
    // const curIndex = this.dialogs.indexOf(dialog);
    // if (curIndex > -1) {
    //   this.dialogs.splice(index, 1);
    // }
    // const newIndex = this.dialogs.findIndex((item) => {
    //   return !item.pFlags.pinned;
    // });
    // this.dialogs.splice(newIndex, 0, dialog);
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

    if (window.debugMessagesLoader) {
      debugger;
    }

    const response = await ApiClient.callMethod('messages.getHistory', {
      peer: this.getInputPeer(dialog.peer),
      offset_id: offsetId,
      limit: limit,
      offset_date: 0,
    });

    if (window.debugMessagesLoader) {
      debugger;
    }

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

  updateChatEditedMessage(chatId, message, newMessage) {
    const chatMessages = this.chatMessages.get(chatId);
    if (chatMessages) {
      const index = chatMessages.indexOf(message);
      if (index > -1) {
        chatMessages.splice(index, 1, newMessage);
      }
    }
  }

  updateChatDeletedMessage(chatId, message) {
    const chatMessages = this.chatMessages.get(chatId);
    if (chatMessages) {
      const index = chatMessages.indexOf(message);
      if (index > -1) {
        chatMessages.splice(index, 1);
      }
    }
  }

  sendMessage(peer, message) {
    return ApiClient.callMethod('messages.sendMessage', {
      message,
      peer: this.getInputPeer(peer),
      random_id: Math.floor(Math.random() * 1e9)
    })
        .then((res) => {
          this.onUpdates(res);
        });
  }

  saveDraft(peer, message) {
    return ApiClient.callMethod('messages.saveDraft', {
      message,
      peer: this.getInputPeer(peer)
    });
  }

  getDialog(peerId) {
    return this.peerDialogs.get(peerId);
  }

  getMessagePeer(message) {
    if (message.to_id._ === 'peerUser') {
      return message.pFlags.out ? message.to_id : {_: 'peerUser', uaer_id: message.from_id};
    }
    return message.to_id;
  }

  getMessagePeerId(message) {
    return this.getPeerById(this.getMessagePeer(message));
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

  getInputPeerById(peerId) {
    return this.getInputPeer(this.getPeerById(peerId));
  }

  getUserPeer(user) {
    return {_: 'peerUser', user_id: user.id};
  }

  getChatPeer(chat) {
    if (chat._ === 'channel') {
      return {_: 'peerChannel', channel_id: chat.id};
    } else {
      return {_: 'peerChat', chat_id: chat.id};
    }
  }

  getPeerById(peerId) {
    if (this.users.has(peerId)) {
      return this.getUserPeer(this.users.get(peerId));
    } else if (this.chats.has(peerId)) {
      return this.getChatPeer(this.chats.get(peerId));
    }
  }
};

window.MessagesApiManager = MessagesApiManager;

export {MessagesApiManager};
