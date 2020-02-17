import {$, buildHtmlElement, encodeHtmlEntities} from './utils';
import {App} from './app';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {SettingsController} from './settings_controller';
import {MDCRipple} from '@material/ripple/component';
import {MDCMenu} from '@material/menu';
import {ContactsController} from "./contacts_controller";

const ChatsController = new class {
  chatElements = new Map();

  init() {
    this.container = $('.chats_sidebar');
    this.container.addEventListener('scroll', this.onScroll);

    this.initMenu();

    MessagesApiManager.emitter.on('dialogsUpdate', this.onDialogsUpdate);
    MessagesApiManager.emitter.on('dialogOrderUpdate', this.onDialogOrderUpdate);
    MessagesApiManager.emitter.on('dialogTopMessageUpdate', this.onDialogTopMessageUpdate);
    MessagesApiManager.emitter.on('chatNewMessage', this.onDialogNewMessage);
    MessagesApiManager.emitter.on('chatUnreadCountUpdate', this.onDialogUnreadCountUpdate);

    this.loader = buildHtmlElement('<div class="lds-ring"><div></div><div></div><div></div><div></div></div>');
    this.container.append(this.loader);

    this.loadMore();
  }

  initMenu() {
    const menuContainer = $('.chats_header_menu');
    this.mainMenu = new MDCMenu(menuContainer);

    this.menuButton = $('.chats_header_menu_button');
    this.menuButton.addEventListener('click', this.onMainMenuClick);

    for (const item of menuContainer.querySelectorAll('.chats_header_menu_item')) {
      new MDCRipple(item).unbounded = true;
    }

    new MDCRipple(this.menuButton).unbounded = true;

    const contactsButtonEl = $('.chats_header_menu_item-contacts', menuContainer);
    contactsButtonEl.addEventListener('click', this.onMenuContactsClick);

    const settingsButtonEl = $('.chats_header_menu_item-settings', menuContainer);
    settingsButtonEl.addEventListener('click', this.onMenuSettingsClick);
  }

  onDialogsUpdate = (event) => {
    const {dialogs} = event.detail;
    this.renderChats(dialogs);
  };

  onDialogNewMessage = (event) => {
    const {dialog, message} = event.detail;
    if (message._ === 'messageService') {
      return;
    }
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    let el = this.chatElements.get(chatId);
    if (el) {
      this.renderChatPreviewContent(el, dialog);
    } else {
      this.buildChatPreviewElement(dialog);
    }
  };

  onDialogOrderUpdate = (event) => {
    const {dialog, index} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    let el = this.chatElements.get(chatId);
    if (!el) {
      el = this.buildChatPreviewElement(dialog);
    }
    this.container.insertBefore(el, this.container.children[index]);
  };

  onDialogTopMessageUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    if (el) {
      this.renderChatPreviewContent(el, dialog);
    }
  };

  onDialogUnreadCountUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    this.renderChatPreviewContent(el, dialog);
  };

  onScroll = () => {
    const container = this.container;
    if (!this.loading && !this.noMore && container.scrollTop + container.offsetHeight > container.scrollHeight - 150) {
      this.loadMore();
    }
  };

  loadMore() {
    this.loading = true;
    MessagesApiManager.loadDialogs(this.offset, 20)
        .then((dialogs) => {
          if (!dialogs.length) {
            this.noMore = true;
          }
        })
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
        })
        .finally(() => {
          this.loading = false;
        });
  }

  renderChats(dialogs) {
    this.loader.remove();

    const frag = document.createDocumentFragment();
    for (const dialog of dialogs) {
      const peerId = MessagesApiManager.getPeerId(dialog.peer);
      if (this.chatElements.has(peerId)) {
        continue;
      }
      const el = this.buildChatPreviewElement(dialog);
      frag.append(el);
    }
    this.container.append(frag);

    const lastDialog = dialogs[dialogs.length - 1];
    const lastDialogMessage = MessagesApiManager.messages.get(lastDialog.top_message);
    this.offset = {
      id: lastDialog.top_message,
      peer: lastDialog.peer,
      date: lastDialogMessage.date,
    };
  }

  buildChatPreviewElement(dialog) {
    const peerId = MessagesApiManager.getPeerId(dialog.peer);
    const el = buildHtmlElement(`
      <div class="chats_item ${dialog.pFlags.pinned ? ' chats_item_pinned' : ''}" data-peer-id="${peerId}">
        <div class="chats_item_content mdc-ripple-surface">
          <div class="chats_item_photo"></div>
          <div class="chats_item_text"></div>        
        </div>
      </div>
    `);
    this.renderChatPreviewContent(el, dialog);
    this.loadChatPhoto(el, dialog);
    el.addEventListener('click', this.onChatClick);
    new MDCRipple(el.firstElementChild);
    this.chatElements.set(peerId, el);
    return el;
  }

  renderChatPreviewContent(el, dialog) {
    const title = this.isPeerMe(dialog.peer) ? 'Saved Messages' : MessagesApiManager.getPeerName(dialog.peer);
    const badge = this.getChatBadge(dialog);
    const date = this.formatDate(dialog);
    const lastMessage = MessagesApiManager.messages.get(dialog.top_message);
    const lastMessagePreview = lastMessage ? this.getMessagePreview(lastMessage) : '';
    $('.chats_item_text', el).innerHTML = `
      <div class="chats_item_text_row">
        <div class="chats_item_title">${encodeHtmlEntities(title)}</div>
        <div class="chats_item_date">${date}</div>
      </div>
      <div class="chats_item_text_row">
        <div class="chats_item_message">${lastMessagePreview}</div>
        ${badge}
      </div>
    `;
  }

  formatDate(dialog) {
    const message = MessagesApiManager.messages.get(dialog.top_message);
    if (message) {
      return this.formatMessageDate(message);
    }
    return '';
  }

  formatMessageDate(message) {
    const messageDate = new Date(message.date * 1000);
    const now = Date.now();
    if (messageDate.getTime() > now - 86400000) {
      return MessagesController.formatMessageTime(message.date);
    } else if (messageDate.getTime() > now - 86400000 * 6) {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][messageDate.getDay()];
    } if (messageDate.getFullYear() === new Date().getFullYear()) {
      return [messageDate.getDate(), messageDate.getMonth() + 1].join('/');
    } else {
      return [messageDate.getDate(), messageDate.getMonth() + 1, messageDate.getFullYear()].join('/');
    }
  }

  getChatBadge(dialog) {
    if (dialog.unread_count) {
      let badgeClass = 'chats_item_badge chats_item_badge-unread';
      if (dialog.notify_settings.mute_until) {
        badgeClass += ' chats_item_badge-unread_muted';
      }
      let unreadCount;
      if (dialog.unread_count > 1e6) {
        unreadCount = (dialog.unread_count / 1e6).toFixed(1) + 'M';
      } else if (dialog.unread_count > 1e3) {
        unreadCount = (dialog.unread_count / 1e3).toFixed(1) + 'K';
      } else {
        unreadCount = dialog.unread_count;
      }
      return `<span class="${badgeClass}">${unreadCount}</span>`;
    } else if (dialog.pFlags.pinned) {
      return `<span class="chats_item_badge chats_item_badge-pinned"></span>`;
    }
    return '';
  }

  getMessagePreview(message) {
    if (message._ === 'messageService') {
      return MessagesController.getServiceMessageText(message);
    }
    let text = encodeHtmlEntities(message.message);
    if (!text) {
      const label = this.getMessageContentTypeLabel(message.media);
      text = `<span class="chats_item_message_content_label">${label}</span>`;
    }
    if (message.to_id._ === 'peerChannel' && message.from_id) {
      const user = MessagesApiManager.users.get(message.from_id);
      text = encodeHtmlEntities(user.first_name) + ': ' + text;
    } else if (message.pFlags.out) {
      text = 'You: ' + text;
    }
    return text;
  }

  getMessageContentTypeLabel(media) {
    if (!media) {
      return '';
    }
    switch (media._) {
      // case 'messageSticker':
      //   return 'Sticker';
      // case 'messageAnimation':
      //   return 'Gif';
      // case 'messageAudio':
      //   return 'Audio';
      // case 'messageVideo':
      //   return 'Video';
      case 'messageMediaPhoto':
        return 'Photo';
      case 'messageMediaDocument':
        return this.getMessageContentDocumentLabel(media.document);
      case 'messageMediaWebPage':
        return 'Link';
      case 'messageMediaPoll':
        return 'Poll';
      case 'messageMediaGeo':
        return 'Geo';
      case 'messageMediaGeoLive':
        return 'Live Geo';
      case 'messageMediaContact':
        return 'Contact';
      case 'messageMediaUnsupported':
        return 'Message unsupported';
    }
    return '';
  }

  getMessageContentDocumentLabel(document) {
    const attrs = MediaApiManager.getDocumentAttributes(document);
    switch (attrs.type) {
      case 'video':
        return 'Video';
      case 'gif':
        return 'Gif';
      case 'sticker':
        return 'Sticker' + (attrs.stickerEmoji ? ' ' + attrs.stickerEmoji : '');
      case 'voice':
        return 'Voice';
      case 'audio':
        return 'Audio';
    }
    return 'File';
  }

  loadChatPhoto(el, dialog) {
    const photoEl = $('.chats_item_photo', el);
    if (this.isPeerMe(dialog.peer)) {
      photoEl.classList.add('chats_item_photo_saved_messages');
    } else {
      this.loadPeerPhoto(photoEl, dialog.peer);
    }
  }

  loadPeerPhoto(el, peer, big = false) {
    const peerId = MessagesApiManager.getPeerId(peer);
    const photo = MessagesApiManager.getPeerPhoto(peer);
    if (!photo || photo._ === 'chatPhotoEmpty') {
      this.setChatPhotoPlaceholder(el, peerId);
      return;
    }

    FileApiManager.loadPeerPhoto(peer, photo, big, photo.dc_id, {priority: 10, cache: true})
        .then((url) => {
          el.innerHTML = `<img src="${url}" alt class="peer_photo_img">`;
        })
        .catch((error) => {
          console.warn('chat photo load error', error);
          this.setChatPhotoPlaceholder(el, peerId);
        });
  }

  setChatPhotoPlaceholder(photoEl, peerId) {
    const peer = MessagesApiManager.getPeerById(peerId);
    const peerTitle = MessagesApiManager.getPeerName(peer);

    photoEl.style.backgroundColor = this.getPlaceholderColor(peerId);
    photoEl.innerHTML = '<div class="peer_photo_placeholder">' + peerTitle.charAt(0) + '</div>';
  }

  getPlaceholderColor(peerId) {
    const colors = ['#FFBF69', '#247BA0', '#EA526F', '#2EC4B6', '#F79256', '#662C91', '#049A8F', '#06D6A0', '#F25C54'];
    return colors[peerId % colors.length];
  }

  onChatClick = (event) => {
    const el = event.currentTarget;
    const peerId = +el.dataset.peerId;
    const dialog = MessagesApiManager.getDialog(peerId);
    MessagesController.setChat(dialog);
  };

  onMainMenuClick = () => {
    if (!this.mainMenu.open) {
      this.mainMenu.open = true;
      this.mainMenu.setAbsolutePosition(14, 60);
    }
  };

  onMenuContactsClick = () => {
    ContactsController.show();
  };

  onMenuSettingsClick = () => {
    SettingsController.show();
  };

  isPeerMe(peer) {
    return peer._ === 'peerUser' && peer.user_id === App.getAuthUserId();
  }

};

window.ChatsController = ChatsController;

export {ChatsController};
