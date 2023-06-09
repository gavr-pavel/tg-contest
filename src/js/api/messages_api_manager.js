import {ApiClient} from './api_client';
import {Emitter, randomLong, wait} from '../utils';
import {App} from '../app';

const MessagesApiManager = new class {
  dialogs = [];
  archivedDialogs = [];
  messages = new Map();
  chats = new Map();
  users = new Map();
  peerDialogs = new Map();
  chatMessages = new Map();
  chatsFull = new Map();
  usersFull = new Map();
  typingUsers = new Map();

  emitter = ApiClient.emitter;

  constructor() {
    ApiClient.emitter.on('updates', (event) => {
      this.onUpdates(event.detail);
    });
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
        break;
    }
  }

  handleUpdate(update) {
    switch (update._) {
      case 'updateNewMessage':
      case 'updateNewChannelMessage': {
        const message = update.message;
        this.updateMessages([message]);
        const chatId = this.getMessageDialogPeerId(message);
        const dialog = this.peerDialogs.get(chatId);
        if (dialog) {
          dialog.top_message = message.id;
          if (!message.out && message.id > dialog.read_inbox_max_id) {
            dialog.unread_count++;
          }
          this.updateChatMessages(dialog, [message]);
          this.handleDialogOrder(dialog);
          this.emitter.trigger('dialogNewMessage', {dialog, message});
        } else {
          this.handleNewDialog(message);
        }
      } break;
      case 'updateEditMessage':
      case 'updateEditChannelMessage': {
        const msgId = update.message.id;
        const message = this.messages.get(msgId);
        if (message) {
          this.messages.set(msgId, update.message);
          const chatId = this.getMessageDialogPeerId(message);
          this.updateChatEditedMessage(chatId, message, update.message);
        }
      } break;
      case 'updateDeleteMessages':
      case 'updateDeleteChannelMessages': {
        for (let msgId of update.messages) {
          const message = this.messages.get(msgId);
          if (message) {
            this.messages.delete(msgId);
            const chatId = this.getMessageDialogPeerId(message);
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
          // console.log('dialogUnreadCountUpdate', {dialog}, dialog.read_inbox_max_id, dialog.unread_count);
          this.emitter.trigger('dialogUnreadCountUpdate', {dialog});
        }
      } break;
      case 'updateReadHistoryOutbox': {
        const peerId = this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.read_outbox_max_id = update.max_id;
          this.emitter.trigger('dialogOutboxReadUpdate', {dialog});
        }
      } break;
      case 'updateUserStatus': {
        const user = this.users.get(update.user_id);
        if (user) {
          user.status = update.status;
          this.emitter.trigger('userStatusUpdate', {user});
        }
      } break;
      case 'updatePinnedDialogs': {
        if (update.order) {
          this.handlePinnedDialogsOrder(update.order, update.folder_id);
        }
      } break;
      case 'updateDialogPinned': {
        const peerId = this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.pinned = update.pinned;
          this.handleDialogOrder(dialog);
          this.emitter.trigger('dialogPinnedUpdate', {dialog});
        }
      } break;
      case 'updateDraftMessage': {
        const peerId = this.getPeerId(update.peer);
        const dialog = this.peerDialogs.get(peerId);
        if (dialog) {
          dialog.draft = update.draft;
        }
      } break;
      case 'updateMessagePoll': {
        this.emitter.trigger('messagePollUpdate', update);
      } break;
      case 'updateNotifySettings': {
        if (update.peer._ === 'notifyPeer') {
          const peer = update.peer.peer;
          const peerId = this.getPeerId(update.peer);
          const dialog = this.peerDialogs.get(peerId);
          if (dialog) {
            dialog.notify_settings = update.notify_settings;
            this.emitter.trigger('dialogNotifySettingsUpdate', {dialog});
          }
        }
      } break;
      case 'updateFolderPeers': {
        for (const {peer, folder_id: folderId} of update.folder_peers) {
          const peerId = this.getPeerId(peer);
          const dialog = this.peerDialogs.get(peerId);
          if (dialog) {
            const oldFolderId = dialog.folder_id;
            dialog.folder_id = folderId;
            delete dialog.pinned;
            this.emitter.trigger('dialogFolderChange', {dialog, oldFolderId});
            for (const list of [this.dialogs, this.archivedDialogs]) {
              const index = list.indexOf(dialog);
              if (index > -1) {
                list.splice(index, 1);
              }
            }
            this.handleDialogOrder(dialog);
          }
        }
      } break;
      case 'updateUserTyping':
      case 'updateChatUserTyping': {
        const chatId = update.chat_id || update.user_id;
        const dialog = this.peerDialogs.get(chatId);
        if (dialog) {
          this.handleDialogUserTyping(dialog, chatId, update.user_id, update.action);
        }
      } break;
      case 'updateDialogFilter': {
        this.emitter.trigger('dialogFilterUpdate', {id: update.id, filter: update.filter});
      } break;
      case 'updateDialogFilterOrder': {
        this.emitter.trigger('dialogFilterOrderUpdate', {order: update.order});
      } break;
      default: {
        console.log('Unhandled update', update._, update);
      }
    }
  }

  handleUpdateShortMessage(update) {
    const isOut = update.out;
    const fromId = update.from_id || (isOut ? App.getAuthUserId() : update.user_id);
    let toIdPeer;
    if (update.chat_id) {
      toIdPeer = {_: 'peerChat', chat_id: update.chat_id};
    } else {
      const userId = (isOut ? update.user_id : App.getAuthUserId());
      toIdPeer = {_: 'peerUser', user_id: userId};
    }

    const message = {_: 'message', from_id: fromId, to_id: toIdPeer};
    const copyFields = ['flags', 'out', 'mentioned', 'media_unread', 'silent', 'id', 'message', 'date', 'fwd_from', 'via_bot_id', 'reply_to_msg_id', 'entities'];
    for (const field of copyFields) {
      message[field] = update[field];
    }

    this.handleUpdate({
      _: 'updateNewMessage',
      message,
      pts: update.pts,
      pts_count: update.pts_count
    });
  }

  handleUpdateShortSentMessage(updates, peer, text, randomId) {
    this.handleUpdate({
      _: 'updateMessageID',
      random_id: randomId,
      id: updates.id
    });

    const isChannel = !!peer.channel_id;
    const isMegagroup = isChannel && this.isMegagroup(peer);

    const message = {
      _: 'message',
      flags: updates.flags,
      out: updates.out,
      id: updates.id,
      date: updates.date,
      entities: updates.entities,
      from_id: isChannel && !isMegagroup ? 0 : App.getAuthUserId(),
      to_id: peer,
      message: text,
    };
    if (updates.media && updates.media._ !== 'messageMediaEmpty') {
      message.media = updates.media;
    }

    this.handleUpdate({
      _: isChannel ? 'updateNewChannelMessage' : 'updateNewMessage',
      message: message,
      pts: updates.pts,
      pts_count: updates.pts_count
    });
  }

  async handleNewDialog(message) {
    if (message.to_id._ === 'peerChannel') {
      // workaround for broken channel access_hash in updates
      await this.loadChannels([message.to_id.channel_id]);
    }
    const dialog = await this.loadPeerDialog(this.getMessageDialogPeer(message));
    if (dialog) {
      this.handleDialogOrder(dialog);
      this.emitter.trigger('dialogNewMessage', {dialog, message});
    }
  }

  async handlePinnedDialogsOrder(order, folderId) {
    const unpinnedDialogs = [];
    const pinnedDialogs = [];
    const folderDialogs = folderId === 1 ? this.archivedDialogs : this.dialogs;

    for (const item of order) {
      let dialog = this.peerDialogs.get(this.getPeerId(item.peer));
      if (!dialog) {
        debugger;
        dialog = await this.loadPeerDialog(item.peer);
      }
      dialog.pinned = true;
      pinnedDialogs.push(dialog);
    }

    let prevPinnedCount = 0;
    for (const dialog of folderDialogs) {
      if (!dialog.pinned) {
        break;
      }
      prevPinnedCount++;
      if (pinnedDialogs.indexOf(dialog) === -1) {
        delete dialog.pinned;
        unpinnedDialogs.push(dialog);
      }
    }

    folderDialogs.splice(0, prevPinnedCount, ...pinnedDialogs);

    pinnedDialogs.forEach((dialog, index) => {
      this.emitter.trigger('dialogOrderUpdate', {dialog, index, folderId: folderId});
    });

    unpinnedDialogs.forEach((dialog) => {
      this.handleDialogOrder(dialog);
    });
  }

  handleDialogOrder(dialog, force = false) {
    if (dialog.pinned && !force) {
      return;
    }

    const lastMessage = dialog.top_message && this.messages.get(dialog.top_message);
    if (!lastMessage) {
      return;
    }

    const folderId = dialog.folder_id;
    const dialogs = folderId === 1 ? this.archivedDialogs : this.dialogs;

    const curIndex = this.getDialogIndex(dialog, dialogs);
    if (curIndex > -1) {
      dialogs.splice(curIndex, 1);
    }

    let newIndex = dialogs.findIndex((item) => {
      if (!item.pinned && item.top_message) {
        const itemMessage = this.messages.get(item.top_message);
        return itemMessage && itemMessage.date < lastMessage.date;
      }
      return false;
    });
    if (newIndex < 0) {
      newIndex = dialogs.length;
    }
    dialogs.splice(newIndex, 0, dialog);

    this.emitter.trigger('dialogOrderUpdate', {dialog, index: newIndex, folderId});
  }

  handleDialogUserTyping(dialog, chatId, userId, action) {
    let map = this.typingUsers.get(chatId);
    if (!map) {
      map = new Map();
      this.typingUsers.set(chatId, map);
    }
    if (action._ === 'sendMessageCancelAction') {
      map.delete(userId);
    } else {
      map.set(userId, action);
      setTimeout(() => {
        if (map.get(userId) === action) {
          map.delete(userId);
        }
      }, 6000);
    }
    this.emitter.trigger('dialogUserTypingUpdate', {dialog, userId, action});
  }

  async loadDialogs(offset = {}, limit = 20, folderId = 0, saveList = true) {
    const {dialogs, messages, chats, users} = await ApiClient.callMethod('messages.getDialogs', {
      folder_id: folderId,
      exclude_pinned: !!folderId,
      offset_date: offset.date || 0,
      offset_id: offset.id || 0,
      offset_peer: this.getInputPeer(offset.peer),
      limit: limit
    });

    this.updateUsers(users);
    this.updateChats(chats);
    this.updateMessages(messages);
    this.updateDialogs(dialogs);

    if (saveList) {
      for (const dialog of dialogs) {
        if (dialog.folder_id === 1) {
          this.archivedDialogs.push(dialog);
        } else {
          this.dialogs.push(dialog);
        }
      }
    }

    return dialogs;
  }

  async loadPinnedDialogs() { // fix read_inbox_max_id = 0
    let {dialogs} = await ApiClient.callMethod('messages.getPinnedDialogs');
    dialogs = dialogs.filter(dialog => dialog._ === 'dialog'); // messages.getPinnedDialogs returns dialogFolder
    this.updateDialogs(dialogs);
    for (const dialog of dialogs) {
      this.emitter.trigger('dialogUnreadCountUpdate', {dialog});
    }
  }

  loadArchivedDialogs(offset = {}, limit = 20) {
    return this.loadDialogs(offset, limit, 1);
  }

  async loadChatHistory(dialog, offsetId, limit) {
    const chatId = this.getPeerId(dialog.peer);

    let chatMessages;

    if (this.chatMessages.has(chatId)) {
      chatMessages = this.chatMessages.get(chatId);
      if (!offsetId || offsetId > chatMessages[chatMessages.length - 1].id) {
        this.emitter.trigger('chatMessagesUpdate', {dialog, messages: chatMessages});
        return chatMessages;
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
      this.emitter.trigger('chatMessagesUpdate', {dialog, messages: chatMessages});
    }

    const messages = await this.loadMessages(dialog.peer, offsetId, limit);

    this.updateChatMessages(dialog, messages, true);

    return messages;
  }

  async loadMessages(peer, offsetId, limit = 20, addOffset = 0) {
    const response = await ApiClient.callMethod('messages.getHistory', {
      peer: this.getInputPeer(peer),
      offset_id: offsetId,
      limit: limit,
      add_offset: addOffset
    });

    this.updateMessages(response.messages);
    this.updateUsers(response.users);
    this.updateChats(response.chats);

    return response.messages;
  }

  async preloadDialogsMessages(dialogs) {
    if (this.dialogsPreloaded) {
      return;
    }
    this.dialogsPreloaded = true;
    for (const dialog of dialogs) {
      if (!this.chatMessages.has(this.getPeerId(dialog.peer))) {
        await this.loadChatHistory(dialog, 0, 20);
        await wait(500);
      }
    }
  }

  async loadPeerDialog(peer) {
    const res = await ApiClient.callMethod('messages.getPeerDialogs', {
      peers: [this.getInputDialogPeer(peer)],
    });

    this.updateUsers(res.users);
    this.updateChats(res.chats);
    this.updateMessages(res.messages);
    this.updateDialogs(res.dialogs);

    return this.peerDialogs.get(this.getPeerId(peer));
  }

  updateDialogs(dialogs) {
    for (const dialog of dialogs) {
      const peerId = this.getPeerId(dialog.peer);
      const dialogRef = this.peerDialogs.get(peerId);
      if (dialogRef) {
        Object.keys(dialogRef).forEach(key => delete dialogRef[key]);
        Object.assign(dialogRef, dialog);
      } else {
        this.peerDialogs.set(peerId, dialog);
      }
    }
  }

  updateUsers(users) {
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }

  updateChats(chats, force = false) {
    for (const chat of chats) {
      if (!force && chat._ === 'channel' && this.chats.has(chat.id)) {
        // fix for wrong channel access_hash coming from updates
        continue;
      }
      this.chats.set(chat.id, chat);
    }
  }

  updateMessages(messages) {
    for (const message of messages) {
      this.messages.set(message.id, message);
    }
  }

  updateChatMessages(dialog, newMessages, history = false) {
    const peerId = this.getPeerId(dialog.peer);
    const chatMessages = this.chatMessages.get(peerId);
    if (!chatMessages) {
      return;
    }
    if (history) {
      chatMessages.push(...newMessages);
    } else {
      chatMessages.unshift(...newMessages);
    }
    this.emitter.trigger('chatMessagesUpdate', {dialog, messages: chatMessages});
  }

  updateChatEditedMessage(chatId, message, newMessage) {
    const dialog = this.peerDialogs.get(chatId);
    if (!dialog) {
      return;
    }
    const chatMessages = this.chatMessages.get(chatId);
    if (chatMessages) {
      const index = chatMessages.indexOf(message);
      if (index > -1) {
        chatMessages.splice(index, 1, newMessage);
      }
      this.emitter.trigger('chatEditMessage', {dialog, message: newMessage});
    }
    if (dialog.top_message === message.id) {
      this.emitter.trigger('dialogTopMessageUpdate', {dialog});
    }
  }

  updateChatDeletedMessage(chatId, message) {
    const dialog = this.peerDialogs.get(chatId);
    if (!dialog) {
      return;
    }
    const chatMessages = this.chatMessages.get(chatId);
    if (chatMessages) {
      const index = chatMessages.indexOf(message);
      if (index > -1) {
        chatMessages.splice(index, 1);
      }
      this.emitter.trigger('chatDeleteMessage', {dialog, message});
    }

    if (dialog.top_message === message.id) {
      if (chatMessages && chatMessages.length) {
        dialog.top_message = chatMessages[0].id;
      } else {
        console.log('delete dialog.top_message', {dialog, chatMessages, chatId, message});
        delete dialog.top_message;
      }
      this.emitter.trigger('dialogTopMessageUpdate', {dialog});
    }
  }

  async deleteMessages(peer, ids) {
    if (peer._ === 'peerChannel') {
      const channel = this.chats.get(peer.channel_id);
      await ApiClient.callMethod('channels.deleteMessages', {
        channel: this.getInputChannel(channel),
        id: ids
      });
    } else {
      await ApiClient.callMethod('messages.deleteMessages', {
        id: ids
      });
    }
    const chatId = this.getPeerId(peer);
    for (const msgId of ids) {
      const message = this.messages.get(msgId);
      if (message) {
        this.messages.delete(msgId);
        this.updateChatDeletedMessage(chatId, message);
      }
    }
  }

  async sendMessage(peer, text) {
    const randomId = randomLong();

    const updates = await ApiClient.callMethod('messages.sendMessage', {
      message: text,
      peer: this.getInputPeer(peer),
      random_id: randomId
    });

    if (updates._ === 'updateShortSentMessage') {
      this.handleUpdateShortSentMessage(updates, peer, text, randomId);
    } else {
      this.onUpdates(updates);
    }
  }

  async sendMedia(peer, inputMedia, text = '') {
    const randomId = randomLong();

    const updates = await ApiClient.callMethod('messages.sendMedia', {
      message: text,
      media: inputMedia,
      peer: this.getInputPeer(peer),
      random_id: randomId
    });

    if (updates._ === 'updateShortSentMessage') {
      this.handleUpdateShortSentMessage(updates, peer, text, randomId);
    } else {
      this.onUpdates(updates);
    }
  }

  async sendMultiMedia(peer, mediaList, caption = '') {
    const multiMedia = mediaList.map((inputMedia) => {
      return {_: 'inputSingleMedia', media: inputMedia, random_id: randomLong(), message: caption};
    });

    try {
      const updates = await ApiClient.callMethod('messages.sendMultiMedia', {
        multi_media: multiMedia,
        peer: this.getInputPeer(peer)
      });
      console.log(updates);
      if (updates._ === 'updateShortSentMessage') {
        this.handleUpdateShortSentMessage(updates, peer, text, randomId);
      } else {
        this.onUpdates(updates);
      }
    } catch (e) {
      debugger;
      throw e;
    }
  }

  uploadMedia(peer, inputMedia) {
    return ApiClient.callMethod('messages.uploadMedia', {
      media: inputMedia,
      peer: this.getInputPeer(peer),
    });
  }

  async readHistory(dialog, maxId, readCount) {
    if (dialog.peer.channel_id) {
      await ApiClient.callMethod('channels.readHistory', {
        channel: this.getInputPeer(dialog.peer),
        max_id: maxId
      });
    } else {
      await ApiClient.callMethod('messages.readHistory', {
        peer: this.getInputPeer(dialog.peer),
        max_id: maxId
      });
    }
    dialog.unread_count = Math.max(0, dialog.unread_count - readCount);
    dialog.read_inbox_max_id = maxId;
    this.emitter.trigger('dialogUnreadCountUpdate', {dialog});
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

  getDialogIndex(dialog, list) {
    return list.indexOf(dialog);
    // return list.findIndex((item) => this.cmpDialogs(item, dialog));
  }

  // replaceDialog(dialog) {
  //   const folderId = dialog.folder_id;
  //   const index = this.getDialogIndex(dialog, folderId);
  //   if (index > -1) {
  //     const list = folderId === 1 ? this.archivedDialogs : this.dialogs;
  //     list.splice(index, 1, dialog);
  //   }
  // }

  cmpDialogs(a, b) {
    return a.peer._ === b.peer._ && this.getPeerId(a.peer) === this.getPeerId(b.peer);
  }

  getMessageAuthorPeer(message) {
    return message.from_id ? this.getPeerById(message.from_id) : message.to_id;
  }

  getMessageAuthorPeerId(message) {
    return this.getPeerId(this.getMessageAuthorPeer(message));
  }

  getMessageDialogPeer(message) {
    if (message.to_id._ === 'peerUser') {
      return message.out ? message.to_id : {_: 'peerUser', user_id: message.from_id};
    }
    return message.to_id;
  }

  getMessageDialogPeerId(message) {
    return this.getPeerId(this.getMessageDialogPeer(message));
  }

  getPeerId(peer) {
    switch (peer._) {
      case 'peerUser':
      case 'inputPeerUser':
        return peer.user_id;
      case 'peerChat':
      case 'inputPeerChat':
        return peer.chat_id;
      case 'peerChannel':
      case 'inputPeerChannel':
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
      return this.getUserName(peerData, full);
    } else {
      return this.getChatName(peerData);
    }
  }

  getUserName(user, full = true) {
    if (!user || user.deleted) {
      return 'Deleted Account';
    } else if (user.first_name || user.last_name) {
      if (full) {
        return [user.first_name, user.last_name].join(' ').trim();
      } else {
        return user.first_name || user.last_name;
      }
    } else if (user.phone) {
      return '+' + user.phone;
    }
    return '';
  }

  getChatName(chat) {
    return chat.title || ''
  }

  getInputPeer(peer) {
    if (!peer) {
      return {_: 'inputPeerEmpty'};
    }
    const peerData = this.getPeerData(peer);
    switch (peer._) {
      case 'peerUser':
        // if (peer.user_id === App.getAuthUserId()) {
        //   return {_: 'inputPeerSelf'};
        // }
        return {_: 'inputPeerUser', user_id: peer.user_id, access_hash: peerData && peerData.access_hash || 0};
      case 'peerChat':
        return {_: 'inputPeerChat', chat_id: peer.chat_id, access_hash: peerData && peerData.access_hash || 0};
      case 'peerChannel':
        return {_: 'inputPeerChannel', channel_id: peer.channel_id, access_hash: peerData && peerData.access_hash || 0};
    }
  }

  getInputUser({id, access_hash = 0}) {
    return {_: 'inputUser', user_id: id, access_hash};
  }

  getInputChat({id, access_hash = 0}) {
    return {_: 'inputChat', chat_id: id, access_hash};
  }

  getInputChannel({id, access_hash = 0}) {
    return {_: 'inputChannel', channel_id: id, access_hash};
  }

  getInputPeerById(peerId) {
    return this.getInputPeer(this.getPeerById(peerId));
  }

  getInputDialogPeer(peer) {
    return {_: 'inputDialogPeer', peer: this.getInputPeer(peer)};
  }

  getInputMessagesFilter(type) {
    switch (type) {
      case 'media':
        return {_: 'inputMessagesFilterPhotoVideo'};
      case 'docs':
        return {_: 'inputMessagesFilterDocument'};
      case 'links':
        return {_: 'inputMessagesFilterUrl'};
      case 'audio':
        return {_: 'inputMessagesFilterMusic'};
    }
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

  getPeerById(peerId, type = '') {
    if (this.chats.has(peerId)) {
      return this.getChatPeer(this.chats.get(peerId));
    } else if (type === 'channel') {
      return {_: 'peerChannel', channel_id: peerId};
    } else if (type === 'chat') {
      return {_: 'peerChat', chat_id: peerId};
    } else {
      return {_: 'peerUser', user_id: peerId};
    }
  }

  getPeerByInputPeer(inputPeer) {
    switch (inputPeer._) {
      case 'inputPeerChannel':
        return {_: 'peerChannel', channel_id: inputPeer.channel_id};
      case 'inputPeerChat':
        return {_: 'peerChat', chat_id: inputPeer.chat_id};
      case 'inputPeerUser':
        return {_: 'peerUser', user_id: inputPeer.user_id};
    }
    return inputPeer;
  }

  isMegagroup(peer) {
    const channel = this.chats.get(peer.channel_id);
    return !!channel.megagroup;
  }

  async loadChannels(channels, forceReload = false) {
    channels = channels.map(channel => typeof channel === 'number' ? {id: channel} : channel);
    if (!forceReload) {
      channels = channels.filter(channel => !this.chats.has(channel.id));
    }
    if (channels.length) {
      const res = await ApiClient.callMethod('channels.getChannels', {
        id: channels.map(channel => this.getInputChannel(channel))
      });
      this.updateChats(res.chats, forceReload);
    }
  }

  async loadChats(chats, forceReload = false) {
    chats = chats.map(chat => typeof chat === 'number' ? {id: chat} : chat);
    if (!forceReload) {
      chats = chats.filter(chat => !this.chats.has(chat.id));
    }
    if (chats.length) {
      const res = await ApiClient.callMethod('messages.getChats', {
        id: chats.map(chat => chat.id)
      });
      this.updateChats(res.chats);
    }
  }

  async loadUsers(users, forceReload = false) {
    users = users.map(user => typeof user === 'number' ? {id: user} : user);
    if (!forceReload) {
      users = users.filter(user => !this.users.has(user.id));
    }
    if (users.length) {
      const res = await ApiClient.callMethod('users.getUsers', {
        id: users.map(user => this.getInputUser(user))
      });
      this.updateUsers(res);
    }
  }

  loadPeers(peers) {
    const channels = [];
    const chats = [];
    const users = [];
    for (const peer of peers) {
      switch (peer._) {
        case 'peerChannel':
        case 'inputPeerChannel':
          channels.push({id: peer.channel_id, access_hash: peer.access_hash});
          break;
        case 'peerChat':
        case 'inputPeerChat':
          chats.push({id: peer.chat_id, access_hash: peer.access_hash});
          break;
        case 'peerUser':
        case 'inputPeerUser':
          users.push({id: peer.user_id, access_hash: peer.access_hash});
          break;
      }
    }
    return Promise.all([
      this.loadChannels(channels),
      this.loadChats(chats),
      this.loadUsers(users)
    ]);
  }

  async loadChatFull(peer) {
    const chatId = this.getPeerId(peer);
    if (this.chatsFull.has(chatId)) {
      return this.chatsFull.get(chatId);
    }

    const inputPeer = this.getInputPeerById(chatId);
    let res;
    if (inputPeer._ === 'inputPeerChannel') {
      res = await ApiClient.callMethod('channels.getFullChannel', {
        channel: inputPeer
      });
    } else {
      res = await ApiClient.callMethod('messages.getFullChat', {
        chat_id: chatId
      });
    }

    this.updateUsers(res.users);
    this.updateChats(res.chats);
    const fullChat = res.full_chat;
    this.chatsFull.set(chatId, fullChat);
    return fullChat;
  }

  async loadUserFull(peer) {
    const userId = this.getPeerId(peer);
    if (this.usersFull.has(userId)) {
      return this.usersFull.get(userId);
    }

    const inputPeer = this.getInputPeer(peer);
    const user = await ApiClient.callMethod('users.getFullUser', {
      id: inputPeer,
    });

    this.usersFull.set(userId, user);

    return user;
  }

  async loadMessagesById(peer, ...messageIds) {
    let res;
    if (peer && peer.channel_id) {
      const channel = this.chats.get(peer.channel_id);
      res = await ApiClient.callMethod('channels.getMessages', {
        channel: this.getInputChannel(channel),
        id: messageIds.map((id) => {return {_: 'inputMessageID', id}})
      });
    } else {
      res = await ApiClient.callMethod('messages.getMessages', {
        id: messageIds.map((id) => {return {_: 'inputMessageID', id}})
      });
    }

    this.updateUsers(res.users);
    this.updateChats(res.chats);
    this.updateMessages(res.messages);

    return res.messages;
  }

  generateIdsHash(items, extractId) {
    let hash = 0;
    for (const item of items) {
      hash = (((hash * 0x4F25) & 0x7FFFFFFF) + extractId(item)) & 0x7FFFFFFF;
    }
    return hash;
  }
};

window.MessagesApiManager = MessagesApiManager;

export {MessagesApiManager};
