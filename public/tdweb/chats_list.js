import TdClient from './td_client.js';
import FileLoader from './file_loader.js';
import MessagesList from './messages_list.js';
import {$, cmpStrNum} from './utils.js';

export default new class ChatsList {
  chatsList = [];

  chatsElements = new Map();

  photosChats = new Map();

  container = $('.chats_sidebar');

  constructor() {
    TdClient.listen(this.onUpdate);
  }

  onUpdate = (update) => {

  };

  updateChatOrder(chatId, order) {
    const chat = App.chats.get(chatId);
    if (!chat) {
      return;
    }
    if (chat.order === order) {
      return;
    }
    chat.order = order;

    if (order === '0') {
      App.chats.delete(chatId);
      const el = this.chatsElements.get(chatId);
      if (el) {
        el.remove();
      }
      return;
    }

    if (!this.chatsList.length) {
      return;
    }

    const lastChat = this.chatsList[this.chatsList.length - 1];
    if (order < lastChat.order) {
      return;
    }

    const index = this.chatsList.indexOf(chat);
    if (index > -1) {
      this.chatsList.splice(index, 1);
    } else {
      this.buildChatPreviewElement(chat);
    }

    let newIndex = this.chatsList.findIndex((item) => {
      return cmpStrNum(order, item.order) > 0;
    });
    if (newIndex === -1) {
      newIndex = this.chatsList.length;
    }

    this.chatsList.splice(newIndex, 0, chat);
    const nextChat = this.chatsList[newIndex + 1];
    const chatEl = this.chatsElements.get(chatId);
    if (nextChat) {
      const nextChatEl = this.chatsElements.get(nextChat.id);
      this.container.insertBefore(chatEl, nextChatEl);
    } else {
      this.container.appendChild(chatEl);
    }
  }

  async renderChats() {
    const response = await TdClient.send({
      '@type': 'getChats',
      offset_order: '9223372036854775807', // 2^63
      limit: 30,
    });

    const frag = document.createDocumentFragment();
    for (const chatId of response.chat_ids) {
      const chat = App.chats.get(chatId);
      const el = this.buildChatPreviewElement(chat);
      frag.appendChild(el);
      this.chatsList.push(chat);
    }
    this.container.appendChild(frag);
  }

  buildChatPreviewElement(chat) {
    const el = document.createElement('div');
    el.className = 'chats_item';
    el.dataset.chatId = chat.id;
    el.innerHTML = `
      <div class="chats_item_photo"></div>
      <div class="chats_item_text"></div>
    `;
    this.renderChatPreviewContent(el, chat);
    this.loadChatPhoto(el, chat);
    el.addEventListener('click', this.onChatClick);
    this.chatsElements.set(chat.id, el);
    return el;
  }

  renderChatPreviewContent(el, chat) {
    const title = chat.title + this.getChatBadge(chat);
    const lastMessage = chat.last_message ? this.getMessagePreview(chat.last_message) : '';
    $('.chats_item_text', el).innerHTML = `
      <div class="chats_item_title">${title}</div>
      <div class="chats_item_message">${lastMessage}</div>
    `;
  }

  getChatBadge(chat) {
    if (chat.unread_count) {
      let badgeClass = 'chats_item_badge_unread';
      if (chat.notification_settings.mute_for) {
        badgeClass += ' chats_item_badge_unread_muted';
      }
      return `<span class="${badgeClass}">${chat.unread_count}</span>`;
    }
    return '';
  }

  getMessagePreview(message) {
    let text = '';
    if (message.content.text) {
      text = message.content.text.text
    } else if (message.content.caption) {
      text = message.content.caption.text;
    }
    const label = this.getMessageContentTypeLabel(message.content['@type']);
    if (label) {
      text = `<span class="chats_item_message_content_label">${label}</span> ${text}`;
    }
    return text;
  }

  getMessageContentTypeLabel(type) {
    switch (type) {
      case 'messageAnimation':
        return 'Gif';
      case 'messageAudio':
        return 'Audio';
      case 'messageVideo':
      case 'messageExpiredVideo':
        return 'Video';
      case 'messagePhoto':
      case 'messageExpiredPhoto':
        return 'Photo';
      case 'messageDocument':
        return 'File';
      case 'messageSticker':
        return 'Sticker';
      case 'messagePoll':
        return 'Poll';
      case 'messageUnsupported':
        return 'Message unsupported';
    }
    return '';
  }

  updateChatPreview(chat) {
    const el = this.chatsElements.get(chat.id);
    if (el) {
      this.renderChatPreviewContent(el, chat);
    }
  }

  loadChatPhoto(el, chat) {
    if (!chat.photo) {
      return;
    }
    const file = chat.photo.small;

    FileLoader.download(file.id, 2)
        .then((file) => FileLoader.getUrl(file))
        .then((url) => {
          $('.chats_item_photo', el).innerHTML = `<img src="${url}" alt class="chats_item_photo_img">`;
        });
  }

  onChatClick = (event) => {
    const el = event.currentTarget;
    const chat = App.chats.get(+el.dataset.chatId);
    MessagesList.setChat(chat);
  };

}