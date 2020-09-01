import {
  $,
  Tpl,
  buildLoaderElement,
  formatCountShort,
  formatDateFull,
  formatDateWeekday,
  formatTime,
  isTouchDevice,
  attachMenuListener,
  attachRipple,
  initMenu,
  getEventPageXY,
  wait,
  buildMenu,
  getStringFirstUnicodeChar, getClassesString, initHorizontalScroll
} from './utils';
import {App} from './app';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {GlobalSearchController} from './global_search_controller';
import {DialogsApiManager} from './api/dialogs_api_manager';
import {FileApiManager} from './api/file_api_manager';

const ChatsController = new class {
  chatElements = new Map();
  elementsOrder = [];
  typingAnimations = new Map();

  init() {
    this.scrollContainer = $('.chats_sidebar');
    this.scrollContainer.addEventListener('scroll', this.onScroll);

    this.listContainer = Tpl.html`<div class="chats_list"></div>`.buildElement();
    this.scrollContainer.appendChild(this.listContainer);

    this.initHeader();

    this.tabsContainer = $('.chats_tabs');
    this.initTabs();

    this.loader = buildLoaderElement(this.listContainer);

    this.newChatButton = Tpl.html`<button class="chats_new_chat_button mdc-icon-button"></button>`.buildElement();
    attachRipple(this.newChatButton);
    this.scrollContainer.appendChild(this.newChatButton);

    MessagesApiManager.emitter.on('dialogOrderUpdate', this.onDialogOrderUpdate);
    MessagesApiManager.emitter.on('dialogPinnedUpdate', this.onDialogPreviewUpdate);
    MessagesApiManager.emitter.on('dialogTopMessageUpdate', this.onDialogPreviewUpdate);
    MessagesApiManager.emitter.on('dialogUnreadCountUpdate', this.onDialogPreviewUpdate);
    MessagesApiManager.emitter.on('dialogNotifySettingsUpdate', this.onDialogPreviewUpdate);
    MessagesApiManager.emitter.on('dialogFolderChange', this.onDialogFolderChange);
    MessagesApiManager.emitter.on('dialogNewMessage', this.onDialogNewMessage);
    MessagesApiManager.emitter.on('userStatusUpdate', this.onUserStatusUpdate);
    MessagesApiManager.emitter.on('dialogUserTypingUpdate', this.onDialogUserTypingUpdate);
    MessagesApiManager.emitter.on('dialogOutboxReadUpdate', this.onDialogOutboxReadUpdate);
    MessagesApiManager.emitter.on('dialogFilterUpdate', this.onDialogFilterUpdate);
    MessagesApiManager.emitter.on('dialogFilterOrderUpdate', this.onDialogFilterOrderUpdate);

    this.loadMore()
        .then((dialogs) => {
          MessagesApiManager.preloadDialogsMessages(dialogs);
          MessagesApiManager.loadPinnedDialogs();
          MessagesApiManager.loadArchivedDialogs();
          this.preloadMoreDialogs();
        });
  }

  async preloadMoreDialogs() {
    for (let i = 0; i < 5; i++) {
      const dialogs = await this.loadMore(20, false);
      if (!dialogs || !dialogs.length) {
        break;
      }
      for (const dialog of dialogs) {
        const peerId = MessagesApiManager.getPeerId(dialog.peer);
        if (!this.chatElements.has(peerId)) {
          this.buildChatPreviewElement(dialog, true);
        }
      }
      await wait(1000);
    }
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
      <input type="text" placeholder="Telegram Search" class="sidebar_search_input chats_header_search_input">
    `;

    this.initHeaderMenu();
    this.initHeaderSearch();
  }

  initHeaderMenu() {
    const menuContainer = $('.chats_header_menu', this.header);
    const mdcMenu = initMenu(menuContainer);

    const menuButton = $('.chats_header_menu_button', this.header);
    if (!isTouchDevice()) {
      attachRipple(menuButton);
    }
    let clickCancelled = false;
    menuButton.addEventListener('click', () => {
      if (!mdcMenu.open && !clickCancelled) {
        mdcMenu.open = true;
      mdcMenu.setAbsolutePosition(14, 60);
      }
    });

    if (isTouchDevice()) {
      document.addEventListener('touchstart', (event) => {
        clickCancelled = false;
        if (mdcMenu.open && !menuContainer.contains(event.target)) {
          mdcMenu.open = false;
          clickCancelled = true;
        }
      });
    }

    const contactsButtonEl = $('.chats_header_menu_item-contacts', menuContainer);
    contactsButtonEl.addEventListener('click', () => {
      import('./contacts_controller.js')
          .then(({ContactsController}) => {
            ContactsController.show();
          });
    });

    const savedButtonEl = $('.chats_header_menu_item-saved', menuContainer);
    savedButtonEl.addEventListener('click', () => {
      const dialog = MessagesApiManager.getDialog(App.getAuthUserId());
      MessagesController.setChat(dialog);
    });

    const archivedButtonEl = $('.chats_header_menu_item-archived', menuContainer);
    archivedButtonEl.addEventListener('click', () => {
      import('./archived_chats_controller.js')
          .then(({ArchivedChatsController}) => {
            ArchivedChatsController.show();
          });
    });

    const settingsButtonEl = $('.chats_header_menu_item-settings', menuContainer);
    settingsButtonEl.addEventListener('click', () => {
      import('./settings_controller.js')
          .then(({SettingsController}) => {
            SettingsController.show();
          });
    });
  }

  initHeaderSearch() {
    const input = $('.chats_header_search_input');
    input.addEventListener('focus', () => {
      GlobalSearchController.show(input);
    });
  }

  async initTabs() {
    this.filters = await ApiClient.callMethod('messages.getDialogFilters');
    this.renderTabs();
    initHorizontalScroll(this.tabsContainer);
  }

  renderTabs() {
    this.tabsContainer.innerHTML = '';
    if (!this.filters.length) {
      return;
    }
    const container = Tpl.html`<div class="nav_tabs_container chats_tabs_list"></div>`.buildElement();
    {
      const el = Tpl.html`
        <div class="nav_tabs_item chats_tabs_item nav_tabs_item-active" data-id="0">
          <div class="nav_tabs_item_label">All</div>
        </div>
      `.buildElement();
      el.addEventListener('click', this.onTabClick);
      container.appendChild(el);
    }
    for (const filter of this.filters) {
      const el = Tpl.html`
        <div class="nav_tabs_item chats_tabs_item" data-id="${filter.id}">
          <div class="nav_tabs_item_label">${filter.title}</div>
        </div>
      `.buildElement();
      el.addEventListener('click', this.onTabClick);
      container.appendChild(el);
    }
    this.tabsContainer.appendChild(container);
  }

  onTabClick = (event) => {
    const prevTab = $('.chats_tabs_item.nav_tabs_item-active');
    prevTab.classList.remove('nav_tabs_item-active');
    const tab = event.currentTarget;
    tab.classList.add('nav_tabs_item-active');
    const filterId = +tab.dataset.id;
    this.setFilter(filterId);
  };

  setFilter(filterId) {
    const filter = this.filters.find(f => f.id === filterId);
    this.currentFilter = filter;
    this.listContainer.innerHTML = '';
    let renderedCount = 0;
    const frag = document.createDocumentFragment();
    for (const el of this.elementsOrder) {
      const peerId = +el.dataset.peerId;
      const dialog = MessagesApiManager.getDialog(peerId);
      const visible = this.checkDialogFilter(dialog, filter);
      el.hidden = !visible;
      if (visible && renderedCount < 20) {
        this.loadChatPhoto(el, dialog);
        frag.appendChild(el);
        renderedCount++;
      }
    }
    this.listContainer.appendChild(frag);
    this.scrollContainer.scrollTop = 0;
    if (this.scrollContainer.scrollHeight <= this.scrollContainer.offsetHeight) {
      this.showMore();
    }
  }

  checkDialogFilter(dialog, filter) {
    if (!filter) {
      return true;
    }

    // exclude
    const peerData = MessagesApiManager.getPeerData(dialog.peer);
    if (filter.exclude_muted && dialog.notify_settings.mute_until) {
      return false;
    }
    if (filter.exclude_read && !dialog.unread_count) {
      return false;
    }
    if (filter.exclude_archived && dialog.folder_id === 1) {
      return false;
    }
    for (const excludePeer of filter.exclude_peers) {
      if (excludePeer._ === 'inputPeerChat' && peerData._ === 'chat' && excludePeer.chat_id === peerData.id) {
        return false;
      }
      if (excludePeer._ === 'inputPeerUser' && peerData._ === 'user' && excludePeer.user_id === peerData.id) {
        return false;
      }
      if (excludePeer._ === 'inputPeerChannel' && peerData._ === 'channel' && excludePeer.channel_id === peerData.id) {
        return false;
      }
    }

    // include
    if (filter.contacts && peerData._ === 'user' && !peerData.bot && peerData.contact) {
      return true;
    }
    if (filter.non_contacts && peerData._ === 'user' && !peerData.bot && !peerData.contact) {
      return true;
    }
    if (filter.groups && (peerData._ === 'chat' || peerData._ === 'channel' && peerData.megagroup)) {
      return true;
    }
    if (filter.broadcasts && peerData._ === 'channel' && !peerData.megagroup) {
      return true;
    }
    if (filter.bots && peerData._ === 'user' && peerData.bot) {
      return true;
    }
    for (const includePeer of filter.include_peers) {
      if (includePeer._ === 'inputPeerChat' && peerData._ === 'chat' && includePeer.chat_id === peerData.id) {
        return true;
      }
      if (includePeer._ === 'inputPeerUser' && peerData._ === 'user' && includePeer.user_id === peerData.id) {
        return true;
      }
      if (includePeer._ === 'inputPeerChannel' && peerData._ === 'channel' && includePeer.channel_id === peerData.id) {
        return true;
      }
    }

    return false;
  }

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
      if (this.placeholder) {
        this.placeholder.remove();
        this.placeholder = null;
      }
    }
  };

  onDialogOrderUpdate = (event) => {
    const {dialog, index, folderId} = event.detail;
    if (folderId) {
      return;
    }
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    let el = this.chatElements.get(chatId);
    if (el) {
      el.hidden = !this.checkDialogFilter(dialog, this.currentFilter);
      this.detachElement(el);
      this.renderChatPreviewContent(el, dialog);
      if (!el.hidden) {
        this.loadChatPhoto(el, dialog);
      }
    } else {
      el = this.buildChatPreviewElement(dialog);
      if (this.placeholder) {
        this.placeholder.remove();
        this.placeholder = null;
      }
    }
    if (!folderId) {
      this.elementsOrder.splice(index, 0, el);
    }
    if (!el.hidden) {
      for (let i = index + 1; ; i++) {
        if (i >= this.elementsOrder.length) {
          this.listContainer.appendChild(el);
          break;
        } else {
          const nextEl = this.elementsOrder[i];
          if (!nextEl.hidden) {
            nextEl.before(el);
            break;
          }
        }
      }
    }
  };

  onDialogPreviewUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    if (el) {
      el.classList.toggle('chats_item-pinned', !!dialog.pinned);
      this.renderChatPreviewContent(el, dialog);
      el.hidden = !this.checkDialogFilter(dialog, this.currentFilter);
      if (el.hidden) {
        el.remove();
      }
    }
  };

  onDialogFolderChange = (event) => {
    const {dialog, oldFolderId} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    if (!oldFolderId) {
      this.detachElement(el);
      this.renderChatPreviewContent(el, dialog); // update pinned badge
    }
  };

  onUserStatusUpdate = (event) => {
    const {user} = event.detail;
    const el = this.chatElements.get(user.id);
    if (el) {
      this.updateChatStatus(el, user.status);
    }
  };

  onDialogUserTypingUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    if (el) {
      let typingAnimation = this.typingAnimations.get(chatId);
      let typingEl;
      if (typingAnimation) {
        typingAnimation.abort();
        typingEl = $('.chats_item_typing', el);
      }
      if (!typingEl) {
        typingEl = Tpl.html`<div class="chats_item_typing"></div>`.buildElement();
        $('.chats_item_message', el).before(typingEl);
      }
      typingAnimation = this.runTypingAnimation(dialog, (text) => {
        if (text) {
          typingEl.innerText = text;
        } else {
          typingEl.remove();
          this.typingAnimations.delete(chatId);
        }
      });
      this.typingAnimations.set(chatId, typingAnimation);
    }
  };

  onDialogOutboxReadUpdate = (event) => {
    const {dialog} = event.detail;
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const el = this.chatElements.get(chatId);
    if (el) {
      this.renderChatPreviewContent(el, dialog);
    }
  };

  onDialogFilterUpdate = (event) => {
    const {id, filter} = event.detail;
    const index = this.filters.findIndex(f => f.id === id);
    if (filter) {
      if (index > -1) {
        this.filters.splice(index, 1, filter);
      } else {
        this.filters.push(filter);
      }
    } else {
      this.filters.splice(index, 1);
    }
    this.renderTabs();
  };

  onDialogFilterOrderUpdate = (event) => {
    const {order} = event.detail;
    const map = new Map(this.filters.map(filter => [filter.id, filter]));
    this.filters = [];
    for (const id of order) {
      const filter = map.get(id);
      if (filter) {
        this.filters.push(filter);
      }
    }
    this.renderTabs();
  };

  onScroll = () => {
    const container = this.scrollContainer;
    if (container.scrollTop + container.offsetHeight > container.scrollHeight - 500) {
      this.showMore();
    }
  };

  showMore() {
    const lastEl = this.listContainer.lastElementChild;
    let renderedCount = 0;
    if (lastEl) {
      const index = this.elementsOrder.indexOf(lastEl);
      const frag = document.createDocumentFragment();
      for (let i = index + 1; renderedCount < 20 && i < this.elementsOrder.length; i++) {
        const el = this.elementsOrder[i];
        if (!el.hidden) {
          this.loadChatPhoto(el);
          frag.appendChild(el);
          renderedCount++;
        }
      }
      if (renderedCount) {
        this.listContainer.appendChild(frag);
      }
    }
    if (renderedCount < 20 && !this.noMore) {
      this.loadMore();
    }
  }

  loadMore(limit = 20, render = true) {
    if (this.loading || this.noMore) {
      return;
    }
    this.loading = true;
    return MessagesApiManager.loadDialogs(this.offset, limit)
        .then((dialogs) => {
          if (!dialogs.length) {
            this.noMore = true;
            if (!this.elementsOrder.length) {
              this.showPlaceholder();
            }
          } else {
            render && this.renderChats(dialogs, render);
            const lastDialog = dialogs[dialogs.length - 1];
            this.saveOffset(lastDialog)
          }
          return dialogs;
        })
        .catch((error) => {
          console.log(error);
          if (error.error_message) {
            const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
            App.alert(errorText);
          }
          if (error.error_code === 420) {
            const timeout = +error.error_message.match(/^FLOOD_WAIT_(\d+)$/);
            console.log('chats load more timeout', timeout, error);
            return wait(timeout * 1000)
                .then(() => this.loadMore(limit, render));
          }
        })
        .finally(() => {
          this.loading = false;
        });
  }

  saveOffset(lastDialog) {
    if (lastDialog) {
      const lastDialogMessage = MessagesApiManager.messages.get(lastDialog.top_message);
      this.offset = {
        id: lastDialog.top_message,
        peer: lastDialog.peer,
        date: lastDialogMessage.date,
      };
    } else {
      this.offset = {
        id: 0,
        peer: 0,
        date: 0,
      };
    }
  }

  renderChats(dialogs) {
    this.loader.remove();

    const frag = document.createDocumentFragment();
    for (const dialog of dialogs) {
      const peerId = MessagesApiManager.getPeerId(dialog.peer);
      if (dialog.folder_id || this.chatElements.has(peerId)) {
        continue;
      }
      const el = this.buildChatPreviewElement(dialog);
      if (!el.hidden) {
        frag.append(el);
      }
    }
    this.listContainer.append(frag);

    if (this.scrollContainer.scrollHeight <= this.scrollContainer.offsetHeight) {
      setTimeout(() => this.showMore());
    }
  }

  buildChatPreviewElement(dialog, preload = false) {
    const peerId = MessagesApiManager.getPeerId(dialog.peer);
    const el = Tpl.html`
      <div class="chats_item ${dialog.pinned ? ' chats_item-pinned' : ''}" data-peer-id="${peerId}">
        <div class="chats_item_content ${ getClassesString({'mdc-ripple-surface': !isTouchDevice()}) }">
          <div class="chats_item_photo"></div>
          <div class="chats_item_text"></div>        
        </div>
      </div>
    `.buildElement();
    this.renderChatPreviewContent(el, dialog);
    if (!preload) {
      this.loadChatPhoto(el, dialog);
    }
    if (dialog.peer._ === 'peerUser') {
      const user = MessagesApiManager.getPeerData(dialog.peer);
      this.updateChatStatus(el, user.status);
    }
    el.addEventListener(isTouchDevice() ? 'click' : 'mousedown', this.onChatClick);
    el.hidden = !this.checkDialogFilter(dialog, this.currentFilter);
    if (!isTouchDevice()) {
      attachRipple(el.firstElementChild);
    }
    attachMenuListener(el, this.onChatMenu);
    this.chatElements.set(peerId, el);
    if (!dialog.folder_id) {
      this.elementsOrder.push(el);
    }
    return el;
  }

  renderChatPreviewContent(el, dialog) {
    const title = this.isPeerSelf(dialog.peer) ? 'Saved Messages' : MessagesApiManager.getPeerName(dialog.peer);
    const badge = this.getChatBadge(dialog);
    const date = this.formatDate(dialog);
    const lastMessage = MessagesApiManager.messages.get(dialog.top_message);
    const lastMessagePreview = lastMessage ? this.getMessagePreview(lastMessage) : '';
    const typingEl = $('.chats_item_typing', el);
    $('.chats_item_text', el).innerHTML = Tpl.html`
      <div class="chats_item_text_row">
        <div class="chats_item_title">${title}</div>
        ${MessagesController.formatMessageStatus(lastMessage, dialog)}
        <div class="chats_item_date">${date}</div>
      </div>
      <div class="chats_item_text_row">
        <div class="chats_item_message">${lastMessagePreview}</div>
        ${badge}
      </div>
    `;
    if (typingEl) {
      $('.chats_item_message', el).before(typingEl);
    }
    el.classList.toggle('chats_item-pinned', !!dialog.pinned);
  }

  detachElement(el) {
    el.remove();
    const index = this.elementsOrder.indexOf(el);
    if (index > -1) {
      this.elementsOrder.splice(index, 1);
    }
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
    } else if (dialog.pinned) {
      return Tpl.html`<span class="chats_item_badge chats_item_badge-pinned"></span>`;
    }
    return '';
  }

  getMessagePreview(message, highlightText = null) {
    if (message._ === 'messageService') {
      return MessagesController.getServiceMessageText(message);
    }
    let result = '';
    if (message.message) {
      let text = Tpl.sanitize(message.message);
      if (highlightText) {
        highlightText = Tpl.sanitize(highlightText);
        text = text.replace(RegExp(highlightText, 'i'), '<span class="chats_item_message_highlight">$&</span>');
      }
      result = Tpl.raw`${text}`;
    } else {
      const label = MessagesController.getMessageContentTypeLabel(message.media);
      result = Tpl.html`<span class="chats_item_message_content_label">${label}</span>`;
    }
    if (message.to_id._ === 'peerChannel' && message.from_id) {
      const user = MessagesApiManager.users.get(message.from_id);
      const userName = MessagesApiManager.getUserName(user, false);
      result.prependHtml`<span class="chats_item_message_author_label">${userName}:</span> `;
    } else if (message.out && message.from_id) {
      result.prependHtml`<span class="chats_item_message_author_label">You:</span> `;
    }
    return result;
  }

  updateChatStatus(el, userStatus) {
    const isOnline = !!userStatus && userStatus._ === 'userStatusOnline';
    const photoEl = $('.chats_item_photo', el);
    photoEl.classList.toggle('chats_item_photo-online', isOnline);
  }

  loadChatPhoto(el, dialog = null) {
    if (el.dataset.photoLoaded) {
      return;
    }
    if (dialog === null) {
      dialog = MessagesApiManager.getDialog(+el.dataset.peerId);
    }
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
    if (peerData.deleted) {
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
    let shortTitle;
    if (peer._ === 'peerUser') {
      const user = MessagesApiManager.getPeerData(peer);
      shortTitle = getStringFirstUnicodeChar(user.first_name) + getStringFirstUnicodeChar(user.last_name);
    } else {
      shortTitle = getStringFirstUnicodeChar(MessagesApiManager.getPeerName(peer));
    }
    photoEl.style.backgroundColor = this.getPhotoPlaceholderColor(peerId);
    photoEl.innerHTML = Tpl.html`<div class="peer_photo_placeholder">${shortTitle}</div>`;
  }

  getPhotoPlaceholderColor(peerId) {
    const colors = ['#FFBF69', '#247BA0', '#EA526F', '#2EC4B6', '#F79256', '#662C91', '#049A8F', '#06D6A0', '#F25C54'];
    return colors[peerId % colors.length];
  }

  onChatClick = (event) => {
    if (event.button) {
      return;
    }
    event.preventDefault();
    const el = event.currentTarget;
    const peerId = +el.dataset.peerId;
    const dialog = MessagesApiManager.getDialog(peerId);
    MessagesController.setChat(dialog);
  };

  isPeerSelf(peer) {
    return peer._ === 'peerUser' && peer.user_id === App.getAuthUserId();
  }

  onChatMenu = (event) => {
    let target = event.target;
    while (target && !target.classList.contains('chats_item')) {
      target = target.parentNode;
    }
    if (!target) {
      return;
    }
    const peerId = +target.dataset.peerId;
    const dialog = MessagesApiManager.getDialog(peerId);

    const actions = [
      dialog.pinned ? ['unpin', 'Unpin'] : ['pin', 'Pin'],
      dialog.notify_settings.mute_until ? ['unmute', 'Unmute'] : ['mute', 'Mute'],
    ];
    if (peerId !== App.getAuthUserId()) {
      actions.push(dialog.folder_id === 1 ? ['unarchive', 'Unarchive'] : ['archive', 'Archive']);
    }
    actions.push(['delete', 'Delete']);
    const menu = buildMenu(actions, {
      container: target,
      menuClass: 'chats_dialog_menu',
      itemClass: 'chats_dialog_menu_item',
      itemCallback: (action) => this.onChatMenuAction(dialog, action),
    });

    if (isTouchDevice()) {
      const {pageX} = getEventPageXY(event);
      const toLeft = pageX > target.offsetWidth / 2;
      menu.setAnchorElement(target);
      menu.setAnchorCorner(toLeft ? 4 : 0);
      menu.setAnchorMargin({left: pageX + (toLeft ? -50: 50), bottom: 0});
      menu.setFixedPosition(true);
    } else {
      menu.setAnchorElement(target);
      menu.setAnchorCorner(4);
      menu.setAnchorMargin({right: 200, bottom: 0});
    }
    menu.open = true;
  };

  onChatMenuAction(dialog, action) {
    switch (action) {
      case 'pin':
      case 'unpin': {
        DialogsApiManager.toggleDialogPin(dialog, action === 'pin');
      } break;
      case 'mute':
      case 'unmute': {
        DialogsApiManager.toggleDialogMute(dialog, action === 'mute');
      } break;
      case 'archive':
      case 'unarchive': {
        DialogsApiManager.toggleDialogArchive(dialog, action === 'archive');
      } break;
      case 'delete': {
        confirm('Are you sure?');
      } break;
    }
  }

  showPlaceholder() {
    this.loader.remove();
    this.placeholder = Tpl.html`
      <div class="chats_placeholder">
        <tgs-player src="tgs/ChickEgg.tgs" class="chats_placeholder_image"></tgs-player>
        <span>You have no conversations yet</span>
      </div>
    `.buildElement();
    this.listContainer.append(this.placeholder);
    const player = $('tgs-player', this.placeholder);
    player.addEventListener('ready', () => {
      player.getLottie().playSegments([0, 150], true);
    });
  }

  runTypingAnimation(dialog, callback) {
    let timeoutId;
    const abort = () => {
      clearTimeout(timeoutId);
    };
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    const isChat = dialog.peer._ !== 'peerUser';
    const loop = (i) => {
      let text = '';
      const typingUsers = MessagesApiManager.typingUsers.get(chatId);
      if (typingUsers && typingUsers.size) {
        if (isChat) {
          const entries = Array.from(typingUsers.entries()).filter(([, action]) => action._ === 'sendMessageTypingAction');
          if (entries.length) {
            const [userId] = entries[0];
            const user = MessagesApiManager.users.get(userId);
            const name = MessagesApiManager.getUserName(user);
            if (entries.length === 1) {
              text = name + ' is typing';
            } else {
              text = name + ' and ' + (entries.length - 1) + ' are typing';
            }
          }
        } else {
          const entries = Array.from(typingUsers.entries());
          const [, action] = entries[0];
          text = this.getTypingActionText(action);
        }
      }
      if (text) {
        text += '.'.repeat(i % 4);
        callback(text);
        timeoutId = setTimeout(() => loop(i + 1), 200);
      } else {
        callback();
      }
    };
    loop(0);
    return {abort};
  }

  getTypingActionText(action) {
    switch (action._) {
      case 'sendMessageTypingAction':
        return 'typing';
      case 'sendMessageRecordVideoAction':
        return 'recording video';
      case 'sendMessageUploadVideoAction':
        return 'uploading video';
      case 'sendMessageRecordAudioAction':
        return 'recording audio';
      case 'sendMessageUploadAudioAction':
        return 'uploading audio';
      case 'sendMessageUploadPhotoAction':
        return 'uploading photo';
      case 'sendMessageUploadDocumentAction':
        return 'uploading document';
    }
    return '';
  }

  hide() {
    this.scrollContainer.hidden = true;
    this.tabsContainer.hidden = true;
  }

  show() {
    this.scrollContainer.hidden = false;
    this.tabsContainer.hidden = false;
  }
};

window.ChatsController = ChatsController;

export {ChatsController};
