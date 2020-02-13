import {$, buildHtmlElement} from './utils';
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
    MessagesApiManager.emitter.on('dialogNewMessage', this.onDialogNewMessage);
    MessagesApiManager.emitter.on('dialogUnreadCountUpdate', this.onDialogUnreadCountUpdate);
    MessagesApiManager.emitter.on('dialogOrderUpdate', this.onDialogOrderUpdate);

    this.loadMore();
  }

  initMenu() {
    this.mainMenu = new MDCMenu($('.main_menu_list'));

    this.menuButton = $('.left_sidebar_menu_button');
    this.menuButton.addEventListener('click', this.onMainMenuClick);

    new MDCRipple(this.menuButton).unbounded = true;

    const contactsButtonEl = $('.main_menu_item-contacts');
    contactsButtonEl.addEventListener('click', this.onMenuContactsClick);

    const settingsButtonEl = $('.main_menu_item-settings');
    settingsButtonEl.addEventListener('click', this.onMenuSettingsClick);
  }

  onDialogsUpdate = (event) => {
    const dialogs = event.detail;
    this.renderChats(dialogs);
  };

  onDialogNewMessage = (event) => {
    const {dialog} = event.detail;
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
    if (el) {
      this.renderChatPreviewContent(el, dialog);
    } else {
      el = this.buildChatPreviewElement(dialog);
    }
    this.container.insertBefore(el, this.container.children[index]);
  };

  onDialogUnreadCountUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    this.renderChatPreviewContent(el, dialog);
  };

  onScroll = (event) => {
    const container = this.container;
    if (!this.loading && container.scrollTop + container.offsetHeight > container.scrollHeight - 150) {
      this.loadMore();
    }
  };

  loadMore() {
    this.loading = true;
    MessagesApiManager.loadDialogs(this.offset, 20)
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
        })
        .finally(() => {
          this.loading = false;
        });
  }

  renderChats(dialogs) {
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
        <div class="chats_item_title">${title}</div>
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
    if (!message) {
      return '';
    }
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
    let text = message.message;
    if (!text) {
      const label = this.getMessageContentTypeLabel(message.media);
      text = `<span class="chats_item_message_content_label">${label}</span>`;
    }
    if (message.to_id._ === 'peerChannel' && message.from_id) {
      const user = MessagesApiManager.users.get(message.from_id);
      text = user.first_name + ': ' + text;
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
    const attrs = MessagesController.getDocumentAttributes(document);
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

  updateChatPreview(chat) {
    const el = this.chatsElements.get(chat.id);
    if (el) {
      this.renderChatPreviewContent(el, chat);
    }
  }

  loadChatPhoto(el, dialog) {
    const photoEl = $('.chats_item_photo', el);

    if (this.isPeerMe(dialog.peer)) {
      photoEl.classList.add('chats_item_photo_saved_messages');
      return;
    }

    const photo = MessagesApiManager.getPeerPhoto(dialog.peer);
    if (!photo || photo._ === 'chatPhotoEmpty') {
      this.setChatPhotoPlaceholder(photoEl, dialog);
      return;
    }

    FileApiManager.loadPeerPhoto(dialog.peer, photo.photo_small, false, photo.dc_id, {priority: 10, cache: true})
      .then((url) => {
        photoEl.innerHTML = `<img src="${url}" alt class="chats_item_photo_img">`;
      })
      .catch((error) => {
        console.warn('chat photo load error', error);
        this.setChatPhotoPlaceholder(photoEl, dialog);
      });
  }

  setChatPhotoPlaceholder(photoEl, dialog) {
    const peerId = MessagesApiManager.getPeerId(dialog.peer);
    const peerTitle = MessagesApiManager.getPeerName(dialog.peer);
    photoEl.style.backgroundColor = this.getPlaceholderColor(peerId);
    photoEl.innerHTML = '<div class="chats_item_photo_placeholder">' + peerTitle.charAt(0) + '</div>';
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
    ContactsController.init();
  };

  onMenuSettingsClick = () => {
    SettingsController.init();
  };

  isPeerMe(peer) {
    return peer._ === 'peerUser' && peer.user_id === App.getAuthUserId();
  }

};

window.ChatsController = ChatsController;

export {ChatsController};
