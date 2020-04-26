import {
  $, $$, Tpl,
  buildLoaderElement,
  formatCountShort,
  formatDateFull, formatDateWeekday,
  formatTime
} from './utils';
import {App} from './app';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {SettingsController} from './settings_controller';
import {MDCRipple} from '@material/ripple/component';
import {MDCMenu} from '@material/menu';
import {ContactsController} from "./contacts_controller";
import {GlobalSearchController} from './global_search_controller';
import {ArchivedChatsController} from './archived_chats_conntroller';

const ChatsController = new class {
  chatElements = new Map();

  init() {
    this.container = $('.chats_sidebar');
    this.container.addEventListener('scroll', this.onScroll);

    this.initHeader();

    this.loader = buildLoaderElement(this.container);

    MessagesApiManager.emitter.on('dialogsUpdate', this.onDialogsUpdate);
    MessagesApiManager.emitter.on('dialogOrderUpdate', this.onDialogOrderUpdate);
    MessagesApiManager.emitter.on('dialogTopMessageUpdate', this.onDialogTopMessageUpdate);
    MessagesApiManager.emitter.on('chatNewMessage', this.onDialogNewMessage);
    MessagesApiManager.emitter.on('chatUnreadCountUpdate', this.onDialogUnreadCountUpdate);
    MessagesApiManager.emitter.on('userStatusUpdate', this.onUserStatusUpdate);

    this.loadMore();
  }

  initHeader() {
    this.header = $('.chats_header');
    this.header.innerHTML = `
      <button type="button" class="chats_header_menu_button mdc-icon-button"></button>
      <button type="button" class="mdc-icon-button sidebar_back_button chats_header_back_button" hidden></button>
      <div class="chats_header_menu mdc-menu mdc-menu-surface">
        <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-new_group" role="menuitem">
            <span class="mdc-list-item__text">New Group</span>
          </li>
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-contacts" role="menuitem">
            <span class="mdc-list-item__text">Contacts</span>
          </li>
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-archived" role="menuitem">
            <span class="mdc-list-item__text">Archived</span>
          </li>
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-saved" role="menuitem">
            <span class="mdc-list-item__text">Saved</span>
          </li>
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-settings" role="menuitem">
            <span class="mdc-list-item__text">Settings</span>
          </li>
          <li class="mdc-list-item chats_header_menu_item chats_header_menu_item-help" role="menuitem">
            <span class="mdc-list-item__text">Help</span>
          </li>
        </ul>
      </div>
      <input type="text" placeholder="Search" class="sidebar_search_input chats_header_search_input">
    `;

    this.initHeaderMenu();
    this.initHeaderSearch();
  }

  initHeaderMenu() {
    const menuContainer = $('.chats_header_menu', this.header);
    const mdcMenu = new MDCMenu(menuContainer);

    const menuButton = $('.chats_header_menu_button', this.header);
    menuButton.addEventListener('click', () => {
      if (!mdcMenu.open) {
        mdcMenu.open = true;
        mdcMenu.setAbsolutePosition(14, 60);
      }
    });

    for (const item of $$('.chats_header_menu_item', menuContainer)) {
      new MDCRipple(item).unbounded = true;
    }

    new MDCRipple(menuButton).unbounded = true;

    const contactsButtonEl = $('.chats_header_menu_item-contacts', menuContainer);
    contactsButtonEl.addEventListener('click', () => {
      ContactsController.show();
    });

    const archivedButtonEl = $('.chats_header_menu_item-archived', menuContainer);
    archivedButtonEl.addEventListener('click', () => {
      ArchivedChatsController.show();
    });

    const settingsButtonEl = $('.chats_header_menu_item-settings', menuContainer);
    settingsButtonEl.addEventListener('click', () => {
      SettingsController.show();
    });
  }

  initHeaderSearch() {
    const input = $('.chats_header_search_input');
    input.addEventListener('input', () => {
      GlobalSearchController.show(input);
    });
  }

  onDialogsUpdate = (event) => {
    const {dialogs, folderId} = event.detail;
    if (!folderId) {
      this.renderChats(dialogs);
    }
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
    const {dialog, index, folderId} = event.detail;
    if (folderId) {
      return;
    }
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

  onUserStatusUpdate = (event) => {
    const {user} = event.detail;
    const el = this.chatElements.get(user.id);
    if (el) {
      this.updateChatStatus(el, user.status);
    }
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
    const el = Tpl.html`
      <div class="chats_item ${dialog.pFlags.pinned ? ' chats_item_pinned' : ''}" data-peer-id="${peerId}">
        <div class="chats_item_content mdc-ripple-surface">
          <div class="chats_item_photo"></div>
          <div class="chats_item_text"></div>        
        </div>
      </div>
    `.buildElement();
    this.renderChatPreviewContent(el, dialog);
    this.loadChatPhoto(el, dialog);
    if (dialog.peer._ === 'peerUser') {
      const user = MessagesApiManager.getPeerData(dialog.peer);
      this.updateChatStatus(el, user.status);
    }
    el.addEventListener('click', this.onChatClick);
    new MDCRipple(el.firstElementChild);
    this.chatElements.set(peerId, el);
    return el;
  }

  renderChatPreviewContent(el, dialog) {
    const title = this.isPeerSelf(dialog.peer) ? 'Saved Messages' : MessagesApiManager.getPeerName(dialog.peer);
    const badge = this.getChatBadge(dialog);
    const date = this.formatDate(dialog);
    const lastMessage = MessagesApiManager.messages.get(dialog.top_message);
    const lastMessagePreview = lastMessage ? this.getMessagePreview(lastMessage) : '';
    $('.chats_item_text', el).innerHTML = Tpl.html`
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
    if (message) {
      return this.formatMessageDate(message);
    }
    return '';
  }

  formatMessageDate(message) {
    const messageDate = new Date(message.date * 1000);
    const now = Date.now();
    if (messageDate.getTime() > now - 86400000) {
      return formatTime(message.date);
    } else if (messageDate.getTime() > now - 86400000 * 6) {
      return formatDateWeekday(message.date);
    } else {
      return formatDateFull(message.date, {
        longMonth: false,
        withYear: messageDate.getFullYear() !== new Date().getFullYear()
      });
    }
  }

  getChatBadge(dialog) {
    if (dialog.unread_count) {
      let badgeClass = 'chats_item_badge chats_item_badge-unread';
      if (dialog.notify_settings.mute_until) {
        badgeClass += ' chats_item_badge-unread_muted';
      }
      return Tpl.html`<span class="${badgeClass}">${formatCountShort(dialog.unread_count)}</span>`;
    } else if (dialog.pFlags.pinned) {
      return Tpl.html`<span class="chats_item_badge chats_item_badge-pinned"></span>`;
    }
    return '';
  }

  getMessagePreview(message) {
    if (message._ === 'messageService') {
      return MessagesController.getServiceMessageText(message);
    }
    let result = '';
    if (message.message) {
      result = Tpl.html`${message.message}`;
    } else {
      const label = MessagesController.getMessageContentTypeLabel(message.media);
      result = Tpl.html`<span class="chats_item_message_content_label">${label}</span>`;
    }
    if (message.to_id._ === 'peerChannel' && message.from_id) {
      const user = MessagesApiManager.users.get(message.from_id);
      const userName = MessagesApiManager.getUserName(user, false);
      result = Tpl.html`<span class="chats_item_message_author_label">${userName}:</span> ${result}`;
    } else if (message.pFlags.out) {
      result = Tpl.html`<span class="chats_item_message_author_label">You:</span> ${result}`;
    }
    return result;
  }

  updateChatStatus(el, userStatus) {
    const isOnline = !!userStatus && userStatus._ === 'userStatusOnline';
    const photoEl = $('.chats_item_photo', el);
    photoEl.classList.toggle('chats_item_photo-online', isOnline);
  }

  loadChatPhoto(el, dialog) {
    const photoEl = $('.chats_item_photo', el);
    if (this.isPeerSelf(dialog.peer)) {
      photoEl.classList.add('chats_item_photo_saved_messages');
    } else {
      this.loadPeerPhoto(photoEl, dialog.peer);
    }
  }

  loadPeerPhoto(el, peer, big = false) {
    const peerId = MessagesApiManager.getPeerId(peer);
    const peerData = MessagesApiManager.getPeerData(peer);
    const photo = peerData.photo;
    if (peerData.pFlags.deleted) {
      this.setChatPhotoDeletedPlaceholder(el, peerId);
      return;
    }
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

  setChatPhotoDeletedPlaceholder(photoEl) {
    photoEl.style.backgroundColor = '#ACB2B6';
    photoEl.innerHTML = '<div class="peer_photo_deleted_placeholder"></div>';
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

  isPeerSelf(peer) {
    return peer._ === 'peerUser' && peer.user_id === App.getAuthUserId();
  }

};

window.ChatsController = ChatsController;

export {ChatsController};
