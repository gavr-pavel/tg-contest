import {
  $, Tpl,
  buildLoaderElement, cutText,
  formatCountShort, formatCountLong,
  formatDateFull,
  formatDateRelative,
  formatTime, formatDuration, initAnimation, attachRipple, downloadFile
} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MediaApiManager} from './api/media_api_manager';
import {MediaViewController} from './media_view_controller';
import {getEmojiMatches} from './emoji_config';
import {MessagesFormController} from './messages_form_controller';
import {ChatsController} from "./chats_controller";
import {MessagesSearchController} from './messages_search_controller';
import {ApiClient} from './api/api_client';
import {I18n} from './i18n';
import {App} from './app';

const MessagesController = new class {
  messageElements = new Map();

  polls = [];

  init() {
    this.header = $('.messages_header');
    this.footer = $('.messages_footer');
    this.scrollContainer = $('.messages_scroll');
    this.container = $('.messages_list');

    this.loader = buildLoaderElement();

    this.container.addEventListener('click', this.onGlobalClick);
    this.scrollContainer.addEventListener('scroll', this.onScroll);
    window.addEventListener('resize', this.onScroll);

    // this.initPlaceholder();

    this.initBackground();

    this.loadAnimatedEmojiStickerSet();

    MessagesFormController.init();

    MessagesApiManager.emitter.on('chatMessagesUpdate', this.onChatMessagesUpdate);
    MessagesApiManager.emitter.on('dialogNewMessage', this.onNewMessage);
    MessagesApiManager.emitter.on('chatEditMessage', this.onEditMessage);
    MessagesApiManager.emitter.on('chatDeleteMessage', this.onDeleteMessage);
    MessagesApiManager.emitter.on('userStatusUpdate', this.onUserStatusUpdate);
  }

  setChat(dialog, messageId = 0) {
    if (dialog === this.dialog) {
      if (messageId) {
        this.jumpToMessage(messageId);
      } else {
        this.scrollToBottom();
      }
      return;
    }
    if (this.dialog) {
      this.exitChat(false);
    }

    this.dialog = dialog;
    this.chatId = MessagesApiManager.getPeerId(dialog.peer);

    $('.main_container').dataset.chat = this.chatId;

    // this.placeholder.remove();

    this.showHeader(dialog);
    this.footer.hidden = !this.canSendMessage(dialog);
    if (!this.footer.hidden) {
      MessagesFormController.onShown();
    }

    this.container.append(this.loader);

    const topMessage = dialog.top_message ? MessagesApiManager.messages.get(dialog.top_message) : void(0);

    if (messageId) {
      this.jumpToMessage(messageId);
    } else if (dialog.read_inbox_max_id < dialog.top_message && topMessage && !topMessage.out) {
      this.jumpToMessage(dialog.read_inbox_max_id, true);
    } else {
      this.loadHistory();
    }

    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.add('chats_item-selected');
    }

    const peerData = MessagesApiManager.getPeerData(dialog.peer);
    if (peerData.username) {
      App.setLocation('@' + peerData.username);
    } else {
      App.setLocation('');
      // Can't get peer info without access hash
      // App.setLocation(peerData._ + peerData.id);
    }
  }

  async setChatByPeerId(peerId, messageId = 0) {
    let dialog = MessagesApiManager.getDialog(peerId);
    if (!dialog) {
      const peer = MessagesApiManager.getPeerById(peerId);
      dialog = await MessagesApiManager.loadPeerDialog(peer);
    }
    MessagesController.setChat(dialog, messageId);
  }

  async setChatByUsername(username) {
    const {peer, chats, users} = await ApiClient.callMethod('contacts.resolveUsername', {username});
    MessagesApiManager.updateUsers(users);
    MessagesApiManager.updateChats(chats);
    MessagesApiManager.updateUsers(users);
    this.setChatByPeerId(MessagesApiManager.getPeerId(peer));
  }

  async setChatByPeerType(peerId, peerType) {
    const peer = MessagesApiManager.getPeerById(+peerId, peerType);
    const dialog = await MessagesApiManager.loadPeerDialog(peer);
    console.log(peer, dialog);
    MessagesController.setChat(dialog);
  }

  exitChat(changeLoc = true) {
    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.remove('chats_item-selected');
    }

    MessagesFormController.clear();
    MediaViewController.abort();
    this.ChatInfoController && this.ChatInfoController.close();
    MessagesSearchController.close();

    this.header.hidden = true;
    this.footer.hidden = true;
    this.dialog = null;
    this.chatId = null;
    this.clearMessages();

    delete $('.main_container').dataset.chat;

    if (changeLoc) {
      App.setLocation('');
    }
  }

  clearMessages() {
    this.container.innerHTML = '';
    this.messageElements.clear();
    this.minMsgId = null;
    this.maxMsgId = null;
    this.loading = false;
    this.noMore = false;
    this.scrolling = false;
    this.polls.forEach(poll => poll.destroy());
    this.polls = [];
  }

  // initPlaceholder() {
  //   this.placeholder = Tpl.html`
  //     <div class="messages_placeholder">
  //       <div class="messages_placeholder_title">Open chat<br>or create a new one</div>
  //       <div class="messages_placeholder_actions">
  //         <button class="messages_placeholder_action messages_placeholder_action-private mdc-icon-button"><div class="messages_placeholder_action_label">Private</div></button>
  //         <button class="messages_placeholder_action messages_placeholder_action-group mdc-icon-button"><div class="messages_placeholder_action_label">Group</div></button>
  //         <button class="messages_placeholder_action messages_placeholder_action-channel mdc-icon-button"><div class="messages_placeholder_action_label">Channel</div></button>
  //       </div>
  //     </div>
  //   `.buildElement();
  //   this.container.append(this.placeholder);
  // }

  showHeader(dialog) {
    const peer = dialog.peer;
    const peerName = MessagesApiManager.getPeerName(peer);

    let peerStatus = '';
    let peerStatusClass = '';

    if (peer._ === 'peerUser') {
      const user = MessagesApiManager.getPeerData(peer);
      peerStatus = this.getUserStatusText(user);
      if (user.status && user.status._ === 'userStatusOnline') {
        peerStatusClass = 'messages_header_peer_status-online';
      }
    }

    this.header.innerHTML = Tpl.html`
      <button class="messages_header_back mdc-icon-button"></button>
      <div class="messages_header_peer mdc-ripple-surface">
        <div class="messages_header_peer_photo"></div>
        <div class="messages_header_peer_description">
          <div class="messages_header_peer_name">${peerName}</div>
          <div class="messages_header_peer_status ${peerStatusClass}">${peerStatus}</div>
        </div>
      </div>
      <div class="messages_header_audio_wrap"></div>
      <div class="messages_header_pinned_message_wrap"></div>
      <div class="messages_header_actions">
        <button class="messages_header_action_search mdc-icon-button"></button>
        <button class="messages_header_action_more mdc-icon-button"></button>
      </div>
    `;
    this.header.hidden = false;

    const peerEl = $('.messages_header_peer');
    peerEl.addEventListener('click', () => {
      MessagesSearchController.close();
      if (this.ChatInfoController && this.ChatInfoController.isOpen()) {
        this.ChatInfoController.close();
      } else {
        import('./chat_info_controller.js')
            .then(({ChatInfoController}) => {
              this.ChatInfoController = ChatInfoController;
              ChatInfoController.show(this.chatId)
            });
      }
    });
    // attachRipple(peerEl);

    const photoEl = $('.messages_header_peer_photo', this.header);
    ChatsController.loadPeerPhoto(photoEl, dialog.peer);

    if (peer._ === 'peerChannel' || peer._ === 'peerChat') {
      this.loadChatHeaderInfo(peer);
    }

    if (this.headerAudioEl) {
      const wrap = $('.messages_header_pinned_message_wrap', this.header);
      wrap.appendChild(this.headerAudioEl);
    }

    attachRipple(...$('.messages_header_actions', this.header).children);

    $('.messages_header_action_search', this.header).addEventListener('click', () => {
      this.ChatInfoController && this.ChatInfoController.close();
      MessagesSearchController.show(this.chatId);
    });

    $('.messages_header_back', this.header).addEventListener('click', () => {
      this.exitChat();
    });
  }

  async loadChatHeaderInfo(peer) {
    const fullChat = await MessagesApiManager.loadChatFull(peer);
    if (fullChat.pinned_msg_id) {
      MessagesApiManager.loadMessagesById(peer, fullChat.pinned_msg_id)
          .then(([pinnedMessage]) => {
            this.renderPinnedMessage(pinnedMessage);
          });
    }

    const isChannel = peer.channel_id && !MessagesApiManager.isMegagroup(peer);
    let statusText = '';
    let membersCount;
    let onlineCount;

    if (fullChat.participants_count) {
      membersCount = fullChat.participants_count;
      onlineCount = fullChat.online_count;
    } else if (fullChat.participants.participants) {
      membersCount = fullChat.participants.participants.length;
    }
    if (membersCount) {
      statusText = I18n.getPlural(isChannel ? 'chats_n_followers' : 'chats_n_members', membersCount, {
        n: formatCountLong(membersCount)
      });
      if (onlineCount) {
        statusText += `, ${onlineCount} online`;
      }
    }
    $('.messages_header_peer_status', this.header).innerText = statusText;
  }

  renderPinnedMessage(message) {
    const container = $('.messages_header_pinned_message_wrap', this.header);
    container.innerHTML = '';

    const el = Tpl.html`
      <div class="messages_header_pinned_message mdc-ripple-surface" data-message-id="${message.id}">
        <div class="messages_header_pinned_message_content">
          <div class="messages_header_pinned_message_title">Pinned message</div>
          <div class="messages_header_pinned_message_text">${ChatsController.getMessagePreview(message)}</div>        
        </div>
      </div>
    `.buildElement();

    attachRipple(el);

    container.appendChild(el);

    el.addEventListener('click', (event) => {
      const messageId = +event.currentTarget.dataset.messageId;
      this.jumpToMessage(messageId);
    });
  }

  loadHistory() {
    if (this.loading || this.noMore) {
      return;
    }
    this.loading = true;
    const dialog = this.dialog;
    MessagesApiManager.loadChatHistory(dialog, this.minMsgId, 30)
        .then((messages) => {
          if (dialog === this.dialog) {
            if (!messages.length) {
              this.noMore = true;
            }
            this.prependHistory(messages);
            this.onScroll(true);
          }
        })
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
          console.log(error);
        })
        .finally(() => {
          this.loading = false;
        });
  }

  loadMore = ({down = false} = {}) => {
    if (this.loading || !down && this.noMore || !this.chatId) {
      return;
    }
    this.loading = true;
    const dialog = this.dialog;
    const limit = 20;
    const addOffset = down ? -limit : 0;
    const offsetId = down ? this.maxMsgId : this.minMsgId;
    MessagesApiManager.loadMessages(dialog.peer, offsetId, limit, addOffset)
        .then((messages) => {
          if (dialog === this.dialog) {
            if (!messages.length) {
              this.noMore = true;
            }
            if (down) {
              this.appendHistory(messages);
            } else {
              this.prependHistory(messages);
            }
          }
        })
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
          console.log(error);
        })
        .finally(() => {
          this.loading = false;
        });
  };

  jumpToMessage(messageId, unread = false) {
    if (this.messageElements.has(messageId)) {
      this.scrollToMessage(messageId, unread);
      return;
    }
    this.clearMessages();
    this.loading = true;
    MessagesApiManager.loadMessages(this.dialog.peer, messageId, 20, -10)
        .then((messages) => {
          this.prependHistory(messages);
          this.scrollToMessage(messageId, unread);
        })
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
        })
        .finally(() => {
          this.loading = false;
        });

  }

  scrollToMessage(messageId, unread = false) {
    const el = this.messageElements.get(messageId);
    if (!el) {
      return;
    }

    if (unread) {
      const unreadEl = $('.message-type-unread', this.container);
      if (unreadEl) {
        this.scrollContainer.scrollTop = unreadEl.offsetTop - 120;
      }
    } else {
      const messageRect = el.getBoundingClientRect();
      const containerRect = this.scrollContainer.getBoundingClientRect();
      if (messageRect.top < containerRect.top || messageRect.bottom > containerRect.bottom) {
        el.scrollIntoView({block: 'center'});
      }
      el.classList.add('message-highlighted');
      requestAnimationFrame(() => {
        el.classList.remove('message-highlighted');
      });
    }
  }

  canSendMessage(dialog) {
    const chat = MessagesApiManager.getPeerData(dialog.peer);
    if (!chat) {
      return false;
    }
    if (chat._ === 'user' || chat._ === 'chat') {
      return true;
    }
    if (chat._ === 'channel') {
      return chat.creator || chat.megagroup;
    }
    return false;
  }

  onChatMessagesUpdate = (event) => {
    const {dialog, messages} = event.detail;
    if (dialog === this.dialog) {
      this.prependHistory(messages);
    }
  };

  onNewMessage = (event) => {
    const {dialog, message} = event.detail;
    if (dialog === this.dialog) {
      // todo remove pending message
      this.appendHistory([message]);
    }
  };

  onEditMessage = (event) => {
    const {dialog, message} = event.detail;
    if (dialog === this.dialog) {
      let el = this.messageElements.get(message.id);
      if (el) {
        this.renderMessageContent(el, message);
      }
    }
  };

  onDeleteMessage = (event) => {
    const {dialog, message} = event.detail;
    if (dialog === this.dialog) {
      const el = this.messageElements.get(message.id);
      if (el) {
        el.remove();
        this.messageElements.delete(message.id);
      }
    }
  };

  onUserStatusUpdate =(event) => {
    const {user} = event.detail;
    if (this.chatId === user.id) {
      const statusEl = $('.messages_header_peer_status', this.header);
      statusEl.innerText = this.getUserStatusText(user);
      statusEl.classList.toggle('messages_header_peer_status-online', user.status._ === 'userStatusOnline');
    }
  };

  onGlobalClick = (event) => {
    let target = event.target;
    if (target.tagName === 'A' || (target = target.closest('a'))) {
      const refChatId = target.dataset.refUserId || target.dataset.refChatId;
      if (refChatId) {
        this.setChatByPeerId(+refChatId);
        event.preventDefault();
      }
      const entity = target.dataset.entity;
      if (entity === 'bot_command') {
        MessagesApiManager.sendMessage(this.dialog.peer, target.innerText);
      }
    }
  };

  onScroll = (force = false) => {
    const scrollContainer = this.scrollContainer;
    const scrollTop = scrollContainer.scrollTop;
    const scrollBottom = scrollContainer.scrollHeight - (scrollTop + scrollContainer.clientHeight);
    const prevScrolling = !!this.scrolling;
    this.scrolling = scrollBottom > 0;
    if (force || this.scrolling !== prevScrolling) {
      this.scrollContainer.classList.toggle('messages_scroll-scrolling', this.scrolling && !this.footer.hidden);
    }
    if (!this.loading) {
      if (scrollTop < 500 && !this.noMore) {
        this.loadMore();
      } else if (scrollBottom < 500 && this.maxMsgId < this.dialog.top_message) {
        this.loadMore({down: true});
        this.scrolling = true;
      }
    }
  };

  scrollToBottom(smooth = false) {
    if (smooth) {
      const lastMessageEl = this.messageElements.get(this.maxMsgId);
      lastMessageEl && lastMessageEl.scrollIntoView({behavior: 'smooth'});
    } else {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
    }
  }

  prependHistory(messages) {
    this.loader.remove();
    if (this.minMsgId) {
      messages = messages.filter(message => message.id < this.minMsgId);
    }
    if (!messages.length) {
      if (!this.container.children.length) {
        this.emptyPlaceholder = Tpl.html`<div class="messages_empty_placeholder">No messages here yet...</div>`.buildElement();
        this.container.appendChild(this.emptyPlaceholder);
      }
      return;
    }

    const prevScrollTop = this.scrollContainer.scrollTop;
    const prevScrollHeight = this.scrollContainer.scrollHeight;

    const frag = this.buildMessagesBatch(messages);
    this.mergeDateGroups(this.container.firstElementChild, frag.lastElementChild, true);
    this.container.prepend(frag);

    this.minMsgId = messages[messages.length - 1].id;
    this.maxMsgId = this.maxMsgId || messages[0].id;

    if (this.scrolling) {
      this.scrollContainer.style.overflow = 'hidden';
      const newScrollTop = prevScrollTop + (this.scrollContainer.scrollHeight - prevScrollHeight);
      // this.scrollContainer.scrollTop = newScrollTop;
      requestAnimationFrame(() => {
        this.scrollContainer.scrollTop = newScrollTop;
        this.scrollContainer.style.overflow = '';
      });
    } else {
      if (this.scrollContainer.scrollHeight <= this.scrollContainer.offsetHeight) {
        setTimeout(this.loadMore, 0);
      } else {
        this.scrollToBottom();
      }
    }

    if (this.dialog.unread_count) {
      MessagesApiManager.readHistory(this.dialog, this.maxMsgId);
    }
  }

  appendHistory(messages) {
    if (!this.maxMsgId) {
      return;
    }
    messages = messages.filter(message => message.id > this.maxMsgId);
    if (!messages.length) {
      return;
    }
    if (this.emptyPlaceholder) {
      this.emptyPlaceholder.remove();
      this.emptyPlaceholder = null;
    }

    const scrolling = this.scrolling;

    const frag = this.buildMessagesBatch(messages);
    this.mergeDateGroups(frag.firstElementChild, this.container.lastElementChild, false);
    this.container.append(frag);

    this.maxMsgId = messages[0].id;

    if (!scrolling) {
      this.scrollToBottom(true);
    }
  }

  mergeDateGroups(newerGroup, olderGroup, moveToNewer) {
    if (!newerGroup || !olderGroup) {
      return;
    }
    if (newerGroup.dataset.date === olderGroup.dataset.date) {
      const newerAuthorGroup = newerGroup.children[1];
      const olderAuthorGroup = olderGroup.lastElementChild;
      if (newerAuthorGroup.dataset.authorId === olderAuthorGroup.dataset.authorId) {
        if (this.dialog.peer._ !== 'peerChannel' || MessagesApiManager.isMegagroup(this.dialog.peer)) {
          while (olderAuthorGroup.lastElementChild && !olderAuthorGroup.lastElementChild.classList.contains('message')) {
            olderAuthorGroup.lastElementChild.remove(); // remove author photo and message tail
          }
          newerAuthorGroup.firstElementChild.classList.add('message-stick-to-prev');
          olderAuthorGroup.lastElementChild.classList.add('message-stick-to-next');
          if (moveToNewer) {
            newerAuthorGroup.prepend(...olderAuthorGroup.children);
            olderAuthorGroup.remove();
          } else {
            olderAuthorGroup.append(...newerAuthorGroup.children);
            newerAuthorGroup.remove();
          }
        }
      }
      if (moveToNewer) {
        newerGroup.firstElementChild.after(...Array.from(olderGroup.children).slice(1));
        olderGroup.remove();
      } else {
        olderGroup.append(...Array.from(newerGroup.children).slice(1));
        newerGroup.remove();
      }
    }
  }

  buildMessagesBatch(messages) {
    const dialogPeer = this.dialog.peer;
    const readInboxMaxId = this.dialog.read_inbox_max_id;
    const isGroupChat = dialogPeer._ === 'peerChat' || dialogPeer._ === 'peerChannel' && MessagesApiManager.isMegagroup(dialogPeer);
    const frag = document.createDocumentFragment();
    let lastDateGroup = null;
    let lastDateGroupMidnight = 0;
    let lastAuthorGroup = null;
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const newerMessage = messages[i - 1];
      const olderMessage = messages[i + 1];
      const authorId = MessagesApiManager.getMessageAuthorPeerId(message);
      let stickToNext = message.from_id && newerMessage && newerMessage.from_id === message.from_id;
      let stickToPrev = message.from_id && olderMessage && olderMessage.from_id === message.from_id;
      const messageMidnight = new Date(message.date * 1000).setHours(0, 0, 0, 0) / 1000;
      if (!lastDateGroup || lastDateGroupMidnight !== messageMidnight || newerMessage && newerMessage.date > messageMidnight + 86400) {
        stickToNext = false;
        lastDateGroup = this.buildMessagesDateGroupEl(messageMidnight);
        lastDateGroupMidnight = messageMidnight;
        lastAuthorGroup = null;
        frag.prepend(lastDateGroup);
      }
      if (readInboxMaxId && message.id === readInboxMaxId && readInboxMaxId !== this.dialog.top_message) {
        const topMessage = MessagesApiManager.messages.get(this.dialog.top_message);
        if (!topMessage.out) {
          const unreadEl = Tpl.html`<div class="message-type-service message-type-unread">Unread messages</div>`.buildElement();
          if (lastDateGroup.children.length === 1) { // only date
            lastDateGroup.after(unreadEl);
          } else {
            lastDateGroup.firstElementChild.after(unreadEl);
            lastAuthorGroup = null;
          }
        }
      }
      if (!lastAuthorGroup || message._ === 'messageService' || !newerMessage || !message.from_id || newerMessage.from_id !== message.from_id) {
        const needPhoto = isGroupChat && message._ === 'message' && authorId !== App.getAuthUserId();
        lastAuthorGroup = this.buildMessagesAuthorGroupEl(authorId, needPhoto);
        if (needPhoto) {
          const photoEl = $('.messages_group_author_photo', lastAuthorGroup);
          ChatsController.loadPeerPhoto(photoEl, MessagesApiManager.getMessageAuthorPeer(message));
        }
        lastDateGroup.firstElementChild.after(lastAuthorGroup);
      }
      const el = this.buildMessageEl(message, {stickToNext, stickToPrev});
      lastAuthorGroup.prepend(el);
      if (message._ === 'messageService') {
        lastAuthorGroup = null;
      }
    }
    return frag;
  }

  buildMessagesDateGroupEl(date) {
    return Tpl.html`
      <div class="messages_group-date" data-date="${date}">
        <div class="message-type-service message-type-date">${this.formatMessageDateFull(date)}</div>
      </div>
    `.buildElement();
  }

  buildMessagesAuthorGroupEl(authorId, needPhoto = false, isOut = false) {
    return Tpl.html`
      <div class="messages_group-author ${needPhoto ? 'messages_group-author-with-photo' : ''}" data-author-id="${authorId}">
        <div class="messages_group_tail ${authorId === App.getAuthUserId() ? 'messages_group_tail-out' : ''}"></div>
        ${needPhoto ? Tpl.html`<a class="messages_group_author_photo" data-ref-user-id="${authorId}" href="#${this.getUserHref(authorId)}"></a>` : ''}
      </div>
    `.buildElement();
  }

  buildMessageEl(message, options) {
    const el = document.createElement('div');

    if (message._ === 'message') {
      el.className = this.getClasses({
        'message': true,
        'message-out': this.isOutMessage(message),
        'message-stick-to-next': options.stickToNext,
        'message-stick-to-prev': options.stickToPrev,
      });
      this.renderMessageContent(el, message, options);
    } else if (message._ === 'messageService') {
      el.className = 'message-type-service';
      el.innerText = this.getServiceMessageText(message);
    }

    el.dataset.id = message.id;
    this.messageElements.set(message.id, el);
    return el;
  }

  appendPendingMessage(content) {
    const el = Tpl.html`<div class="message message-out message-stick-to-next message-stick-to-prev"></div>`.buildElement();
    el.append(content);
    const list = $('.messages_pending_list');
    list.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  removePendingMessage(el) {
    el.remove();
  }

  getClasses(dict) {
    let className = '';
    for (const [cls, cond] of Object.entries(dict)) {
      if (cond) {
        className += ' ' + cls;
      }
    }
    return className;
  }

  renderMessageContent(el, message, options = {}) {
    const isEmojiMessage = this.isEmojiMessage(message);
    const mediaThumbData = this.getMessageMediaThumb(message, isEmojiMessage);
    const isStickerMessage = mediaThumbData && mediaThumbData.type === 'sticker';
    const isRoundMessage = mediaThumbData && mediaThumbData.type === 'round';
    const authorName = !options.stickToPrev && !isStickerMessage && !isEmojiMessage && !message.out ? this.formatAuthorName(message) : '';

    let messageContent = this.formatMessageContent(message, mediaThumbData);
    if (message.fwd_from) {
      messageContent = this.formatFwdMessageContent(message.fwd_from, messageContent);
    }
    if (message.reply_to_msg_id) {
      messageContent = Tpl.html`${this.formatReplyToMessageContent(message.reply_to_msg_id)}${messageContent}`;
    }

    const messageDateFull = formatDateFull(message.date) + ' ' + formatTime(message.date, {withSeconds: true});
    const messageViews = this.formatMessageViews(message);
    const messageTime = formatTime(message.date);
    const messageStatus = this.formatMessageStatus(message, this.dialog);

    el.innerHTML = Tpl.html`
      <div class="message_content">
        ${authorName}
        ${messageContent}
        <div class="message_date" title="${messageDateFull}">${messageViews}${messageTime}${messageStatus}</div>
      </div>
    `;

    if (isStickerMessage) {
      el.classList.add('message-type-sticker');
    } else if (isRoundMessage) {
      el.classList.add('message-type-round');
    } else if (isEmojiMessage) {
      el.classList.add('message-type-emoji');
    }

    if (message.reply_to_msg_id) {
      const replyToWrap = $('.message_reply_to_wrap', el);
      if (replyToWrap) {
        replyToWrap.addEventListener('click', this.onReplyToClick);
      }
    }

    if (mediaThumbData) {
      el.classList.add('message-has-thumb');
      if (message.message) {
        el.classList.add('message-has-caption');
      }
      this.loadMessageMediaThumb(el, mediaThumbData);
    } else if (message.media && message.media.document) {
      const document = message.media.document;
      const attributes = MediaApiManager.getDocumentAttributes(document);
      if (attributes.type === 'voice') {
        this.drawVoiceWave(el, attributes.waveform, this.isOutMessage(message));
        FileApiManager.loadDocument(document, {cache: true});
        import('./audio_player.js');
      }
      const docBtn = $('.document_icon', el);
      if (docBtn) {
        docBtn.addEventListener('click', this.onFileClick);
        if (attributes.type === 'audio' || attributes.type === 'voice') {
          if (this.audioPlayer && this.audioPlayer.doc.id === document.id) {
            this.audioPlayer.initMessageAudioPlayer(docBtn);
          }
        }
      }
    } else if (message.media && message.media.poll) {
      import('./poll_controller.js')
          .then(({PollController}) => {
            this.polls.push(new PollController(el, message));
          });
    }
  }

  isOutMessage(message) {
    return (message.out || MessagesApiManager.getMessageDialogPeerId(message) === App.getAuthUserId()) && message.from_id === App.getAuthUserId();
  }

  isEmojiMessage(message) {
    if (message.message.length <= 12 && !message.media) {
      const emojiMatches = getEmojiMatches(message.message);
      if (emojiMatches && emojiMatches.length <= 3 && emojiMatches.join('').length === message.message.length) {
        return true;
      }
    }
    return false;
  }

  getAnimatedEmojiSticker(text) {
    if (this.animatedEmojies) {
      for (const pack of this.animatedEmojies.packs) {
        if (pack.emoticon === text) {
          const documentId = pack.documents[0];
          for (const document of this.animatedEmojies.documents) {
            if (document.id === documentId) {
              return document;
            }
          }
        }
      }
    }
  }

  formatAuthorName(message) {
    if (message.from_id && this.dialog.peer._ !== 'peerUser') {
      const userId = message.from_id;
      const title = MessagesApiManager.getPeerName({_: 'peerUser', user_id: userId});
      return Tpl.html`<a class="message_author" data-ref-user-id="${userId}" href="#${this.getUserHref(userId)}">${title}</a>`;
    }
    return '';
  }

  onReplyToClick = (event) => {
    const target = event.currentTarget;
    const msgId = +target.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    this.jumpToMessage(message.reply_to_msg_id);
  };

  onThumbClick = (event) => {
    const thumb = event.currentTarget;
    const msgId = +thumb.dataset.messageId || +thumb.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    const thumbData = this.getMessageMediaThumb(message);
    if (thumb.firstElementChild && thumb.firstElementChild.tagName.toLowerCase() === 'tgs-player') {
      thumb.firstElementChild.stop();
      thumb.firstElementChild.play();
    }
    if (!thumbData) {
      // animated emoji
      return;
    }
    if (thumbData.type === 'photo') {
      MediaViewController.showPhoto(thumbData.object, thumb, message);
    } else if (thumbData.type === 'video') {
      MediaViewController.showVideo(thumbData.object, thumb, message);
    } else if (thumbData.type === 'gif') {
      MediaViewController.showGif(thumbData.object, thumb, message);
    }
  };

  onRoundClick = (event) => {
    const video = event.target;
    if (!video.muted) {
      video.paused ? video.play() : video.pause();
    } else {
      video.pause();
      video.currentTime = 0;
      video.loop = false;
      video.muted = false;
      video.removeAttribute('muted');
      video.play();
      const progressEl = Tpl.html`
        <svg class="message_media_thumb_round_progress_svg" viewBox="22 22 44 44" xmlns="http://www.w3.org/2000/svg">
          <circle class="message_media_thumb_round_progress_circle" cx="44" cy="44" r="21" transform="rotate(-90 44 44)"></circle>
        </svg>
      `.buildElement();
      video.parentNode.appendChild(progressEl);
      const durationEl = $('.message_media_duration', video.parentNode);
      const [startProgressAnimation, stopProgressAnimation] = initAnimation(() => {
        progressEl.firstElementChild.style.setProperty('--progress-value', video.currentTime / video.duration);
      });
      const onPlaying = () => startProgressAnimation();
      const onPause = () => stopProgressAnimation();
      const onTimeupdate = () => durationEl.innerText = formatDuration(video.duration - video.currentTime);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('pause', onPause);
      video.addEventListener('timeupdate', onTimeupdate);
      video.addEventListener('ended', () => {
        stopProgressAnimation();
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeupdate);
        progressEl.remove();
        durationEl.innerText = formatDuration(video.duration);
        video.loop = true;
        video.muted = true;
        video.setAttribute('muted', '');
        video.play();
      }, {once: true});
    }
  };

  onFileClick = (event) => {
    const button = event.currentTarget;

    const msgId = +button.dataset.messageId || +button.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    if (!message) {
      return;
    }

    const document = message.media.document;
    const attributes = MediaApiManager.getDocumentAttributes(document);

    if (attributes.type === 'voice' || attributes.type === 'audio') {
      this.playAudio(button, {document, attributes, message});
    } else {
      this.loadFile(button, document)
          .then(url => downloadFile(url, attributes.file_name));
    }
  };

  loadFile(button, document) {
    if (button.dataset.loading) {
      return;
    }
    button.dataset.loading = 1;

    const abortController = new AbortController();

    const onAbort = () => {
      abortController.abort();
      onDone();
    };

    const onProgress = (loaded) => {
      const percent = Math.round(loaded / document.size * 100);
      if (progressPath) {
        progressPath.style.strokeDasharray = `${percent}, 100`;
      }
    };

    const onDone = () => {
      delete button.dataset.loading;
      button.removeEventListener('click', onAbort);
      button.classList.remove('document_icon-loading');
      button.innerHTML = '';
    };

    let progressPath;
    if (button.classList.contains('document_icon')) {
      button.classList.add('document_icon-loading');
      button.innerHTML = `
        <svg class="document_icon_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path class="document_icon_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
      `;
      button.addEventListener('click', onAbort);
      progressPath = $('.document_icon_progress_path', button);
    }

    return FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
        .finally(onDone);
  }

  async playAudio(btn, {document: doc, attributes, message}) {
    if (this.audioPlayer) {
      if (this.audioPlayer.doc === doc) {
        this.audioPlayer.togglePlay();
        return;
      } else {
        this.audioPlayer.destroy();
        this.audioPlayer = null;
      }
    }

    const {AudioPlayer} = await import('./audio_player.js');
    const audioPlayer = new AudioPlayer(doc, attributes);
    this.audioPlayer = audioPlayer;

    if ((doc.mime_type === 'audio/mpeg' || doc.mime_type === 'audio/mp3') && window.MediaSource) {
      audioPlayer.initStreaming();
    } else {
      const src = await this.loadFile(btn, doc);
      audioPlayer.initSrc(src);
    }

    audioPlayer.initMessageAudioPlayer(btn);
    this.headerAudioEl = audioPlayer.initHeaderAudioPlayer(message);

    audioPlayer.listen('stop', () => {
      this.headerAudioEl.remove();
      this.headerAudioEl = null;
    });

    audioPlayer.listen('ended', () => {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    });

    audioPlayer.play();
  }

  getMessageMediaThumb(message, isEmojiMessage = false) {
    if (isEmojiMessage) {
      const document = this.getAnimatedEmojiSticker(message.message);
      if (document) {
        const attributes = MediaApiManager.getDocumentAttributes(document);
        return {type: 'sticker', object: document, sizes: document.thumbs, attributes, emoji: message.message};
      }
    }
    const media = message.media;
    if (!media) {
      return;
    }
    switch (media._) {
      case 'messageMediaPhoto':
        const photo = media.photo;
        return {type: 'photo', object: photo, sizes: photo.sizes};
      case 'messageMediaDocument': {
        const document = media.document;
        const attributes = MediaApiManager.getDocumentAttributes(document);
        if (['video', 'gif', 'sticker', 'round'].includes(attributes.type)) {
          return {type: attributes.type, object: document, sizes: document.thumbs, video_sizes: document.video_thumbs, attributes};
        }
      } break;
      case 'messageMediaWebPage': {
        if (media.webpage.type !== 'photo' && media.webpage.document) {
          const document = media.webpage.document;
          if (media.webpage.type === 'video' || media.webpage.type === 'gif') {
            return {type: media.webpage.type, object: document, sizes: document.thumbs};
          } else {
            const attributes = MediaApiManager.getDocumentAttributes(document);
            if (attributes.type === 'video' || attributes.type === 'gif') {
              return {type: attributes.type, object: document, sizes: document.thumbs, attributes};
            }
          }
        }
        if (media.webpage.photo) {
          const photo = media.webpage.photo;
          return {type: 'photo', object: photo, sizes: photo.sizes};
        }
      } break;
    }
  }

  getThumbWidthHeight(thumb, maxW = 400, maxH = 200) {
    let h = maxH;
    let w = Math.round(h * (thumb.w / thumb.h));
    if (w > maxW) {
      w = maxW;
      h = Math.round(w / (thumb.w / thumb.h));
    }
    return [w, h];
  }

  async loadMessageMediaThumb(messageEl, mediaThumbData) {
    let thumbContainer = $('.message_media_thumb', messageEl);
    if (!thumbContainer) {
      debugger;
      return;
    }
    thumbContainer.addEventListener('click', this.onThumbClick);

    const sizes = mediaThumbData.sizes;
    let inlineThumb;
    {
      const photoSize = MediaApiManager.choosePhotoSize(sizes, 'm');
      if (photoSize && MediaApiManager.isCachedPhotoSize(photoSize)) {
        const mimeType = mediaThumbData.object.mime_type;
        const url = await MediaApiManager.getCachedPhotoSize(photoSize, mimeType);
        inlineThumb = Tpl.html`<img class="message_media_thumb_image" src="${url}">`.buildElement();
      }
      const inlineSize = MediaApiManager.choosePhotoSize(sizes, 'i');
      if (inlineSize) {
        const url = MediaApiManager.getPhotoStrippedSize(sizes);
        inlineThumb = Tpl.html`<img class="message_media_thumb_image message_media_thumb_image-blurred" src="${url}">`.buildElement();
      }
      if (inlineThumb) {
        thumbContainer.prepend(inlineThumb);
      }
    }

    if (mediaThumbData.type === 'sticker') {
      const url = await FileApiManager.loadDocument(mediaThumbData.object, {cache: true});
      let thumb;
      if (mediaThumbData.attributes.animated) {
        thumb = Tpl.html`<tgs-player autoplay src="${url}" class="message_media_thumb_image"></tgs-player>`.buildElement();
      } else {
        thumb = Tpl.html`<img class="message_media_thumb_image" src="${url}">`.buildElement();
      }
      thumbContainer.prepend(thumb);
    } else if (mediaThumbData.type === 'round') {
      const photoSize = MediaApiManager.choosePhotoSize(sizes, 'm');
      const [videoUrl, thumbUrl] = await Promise.all([
        FileApiManager.loadDocument(mediaThumbData.object),
        FileApiManager.loadDocumentThumb(mediaThumbData.object, photoSize.type)
      ]);
      const thumb = Tpl.html`<video src="${videoUrl}" poster="${thumbUrl}" playsinline muted autoplay loop class="message_media_thumb_round_video"></video>`.buildElement();
      thumbContainer.prepend(thumb);
      thumbContainer.addEventListener('click', this.onRoundClick);
    } else if (mediaThumbData.video_sizes) {
      const videoSize = mediaThumbData.video_sizes[0];
      const url = await FileApiManager.loadDocumentThumb(mediaThumbData.object, videoSize.type);
      const thumb = Tpl.html`<video class="message_media_thumb_image" src="${url}" muted autoplay loop></video>`.buildElement();
      thumbContainer.prepend(thumb);
    } else {
      const photoSize = MediaApiManager.choosePhotoSize(sizes, 'x');
      let url;
      if (MediaApiManager.isCachedPhotoSize(photoSize)) {
        const mimeType = mediaThumbData.object.mime_type;
        url = await MediaApiManager.getCachedPhotoSize(photoSize, mimeType);
      } else if (mediaThumbData.object._ === 'document') {
        url = await FileApiManager.loadDocumentThumb(mediaThumbData.object, photoSize.type);
      } else {
        url = await FileApiManager.loadPhoto(mediaThumbData.object, photoSize.type);
      }
      const thumb = Tpl.html`<img class="message_media_thumb_image" src="${url}">`.buildElement();
      thumbContainer.prepend(thumb);
    }

    if (inlineThumb) {
      inlineThumb.remove();
    }
  }

  formatFwdMessageContent(fwdHeader, messageContent) {
    let authorName = fwdHeader.from_name;
    if (!authorName) {
      if (fwdHeader.from_id) {
        const user = MessagesApiManager.users.get(fwdHeader.from_id);
        authorName = MessagesApiManager.getUserName(user);
      } else if (fwdHeader.channel_id) {
        const channel = MessagesApiManager.chats.get(fwdHeader.channel_id);
        authorName = MessagesApiManager.getChatName(channel);
      }
    }
    const authorRefAttr = fwdHeader.from_id ? 'data-ref-user-id' : 'data-ref-chat-id';
    const authorRefValue = fwdHeader.from_id || fwdHeader.channel_id;
    return Tpl.html`
      <div class="message_forwarded_header">Forwarded message</div>
      <div class="message_forwarded_content">
        <div class="message_forwarded_author">
          <a ${authorRefAttr}="${authorRefValue}">${authorName}</a>
        </div>
        ${messageContent}
      </div>
    `;
  }

  formatReplyToMessageContent(messageId) {
    const message = MessagesApiManager.messages.get(messageId);
    if (message) {
      const authorPeer = MessagesApiManager.getMessageAuthorPeer(message);
      const authorName = MessagesApiManager.getPeerName(authorPeer);
      const shortText = message.message ? cutText(message.message, 110, 100) : this.getMessageContentTypeLabel(message.media);
      return Tpl.html`
        <div class="message_reply_to_wrap">
          <div class="message_reply_to_content">
            <div class="message_reply_to_author">${authorName}</div>
            <div class="message_reply_to_text">${shortText}</div>
          </div>
        </div>
      `;
    }
    return '';
  }

  formatMessageViews(message) {
    if (message.views) {
      return Tpl.html`
        <div class="message_views">${formatCountShort(message.views)}</div>
      `;
    }
    return '';
  }

  formatMessageStatus(message, dialog) {
    if (message.out && message.from_id) {
      const readOutboxMaxId = dialog.read_outbox_max_id;
      const status = message.id <= readOutboxMaxId ? 'read' : 'sent';
      return Tpl.html`<div class="message_status message_status-${status}"></div>`;
    }
    return '';
  }

  formatMessageContent(message, mediaThumbData) {
    const media = message.media;
    const caption = this.formatText(message);
    const captionText = message.message;
    if (!media) {
      if (mediaThumbData) {
        return this.formatThumb(mediaThumbData, captionText);
      }
      return caption;
    }
    switch (media._) {
      case 'messageMediaPhoto':
        return this.formatThumb(mediaThumbData, captionText);
      case 'messageMediaDocument':
        return this.formatDocument(media, mediaThumbData, caption, captionText);
      case 'messageMediaWebPage':
        return Tpl.html`${caption}${this.formatWebPage(media, mediaThumbData)}`;
      case 'messageMediaPoll':
        return Tpl.html`${caption}${this.formatPoll(media)}`;
      case 'messageMediaGeo':
        return Tpl.html`${caption}Geo`;
      case 'messageMediaGeoLive':
        return Tpl.html`${caption}Live Geo`;
      case 'messageMediaContact':
        return Tpl.html`${caption}Contact`;
      case 'messageMediaUnsupported':
        return 'Message unsupported';
      default:
        return Tpl.html`${caption} [${media._}]`;
    }
  }

  formatDocument(media, mediaThumbData, caption, captionText) {
    if (mediaThumbData) {
      return this.formatThumb(mediaThumbData, captionText);
    }

    const attributes = MediaApiManager.getDocumentAttributes(media.document);
    switch (attributes.type) {
      case 'video':
        return '[video]';
      case 'gif':
        return '[gif]';
      case 'sticker':
        return '[sticker]';
      case 'voice':
        return this.formatVoice(media.document, attributes);
      case 'audio':
        return this.formatAudio(media.document, attributes);
    }

    return Tpl.html`
      ${caption}
      <div class="document">
        <div class="document_col">
          <button class="document_icon"></button>
        </div>
        <div class="document_col">
          <div class="document_filename">${attributes.file_name || 'File'}</div>
          <div class="document_size">${this.formatDocSize(media.document.size)}</div>        
        </div>      
      </div>
    `;
  }

  formatDocSize(size) {
    if (size) {
      if (size < 1024) {
        return '1 KB';
      } else if (size < 1024 * 1024) {
        return Math.floor(size / 1024) + ' KB';
      } else if (size < 1024 * 1024 * 1024) {
        return Math.floor(size / (1024 * 1024)) + ' MB';
      }
    }
    return '';
  }

  formatVoice(document, attributes) {
    return Tpl.html`
      <div class="document document-voice">
        <div class="document_col">
          <button class="document_icon document_icon-audio"></button>
        </div>
        <div class="document_col">
          <div class="document_filename">Voice message</div>
          <div class="document_duration">${formatDuration(attributes.duration)}</div>        
        </div>      
      </div>
    `;
  }

  drawVoiceWave(container, waveform, isOut = false) {
    const wrap = $('.document_filename', container);
    wrap.innerHTML = '';
    const canvas = document.createElement('canvas');
    const linesNum = Math.ceil(waveform.length / 2);
    const dpr = window.devicePixelRatio || 1;
    const lineWidth = 2 * dpr;
    const linePadding = 2 * dpr;
    const canvasWidth = lineWidth * linesNum + linePadding * (linesNum - 1);
    const canvasHeight = 16 * dpr;
    const wrapWidth = canvasWidth / dpr;
    const wrapHeight = canvasHeight / dpr;
    wrap.style.width = wrapWidth + 'px';
    wrap.style.height = wrapHeight + 'px';
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    for (const mode of ['background', 'filled']) {
      ctx.strokeStyle = mode === 'background' ? (isOut ? '#B7DDA9' : '#CBCBCB') : (isOut ? '#65AB5A' : '#5FA1E3');
      for (let i = 0, offsetX = lineWidth / 2; i < waveform.length; i += 2) {
        const value = i + 1 < waveform.length ? (waveform[i] + waveform[i + 1]) / 2 / 255 : waveform[i];
        const heightY = Math.max(lineWidth, value * (canvasHeight - lineWidth));
        ctx.beginPath();
        ctx.moveTo(offsetX, canvasHeight - lineWidth / 2);
        ctx.lineTo(offsetX, canvasHeight - heightY);
        ctx.stroke();
        offsetX += lineWidth + linePadding;
      }
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        wrap.appendChild(Tpl.html`<img src="${url}" class="document_voice_wave document_voice_wave-${mode}">`.buildElement());
      }, 'image/png');
    }
  }

  formatAudio(document, attributes) {
    return Tpl.html`
      <div class="document">
        <div class="document_col">
          <button class="document_icon document_icon-audio"></button>
        </div>
        <div class="document_col">
          <div class="document_filename">${attributes.audio_title || attributes.file_name || 'Unknown Track'}</div>
          <div class="document_performer">${attributes.audio_performer}</div>
          <div class="document_duration">${formatDuration(attributes.duration)}</div>        
        </div>      
      </div>
    `;
  }

  formatWebPage(media, mediaThumbData) {
    const webpage = media.webpage;
    if (webpage._ === 'webPage') {
      const content = this.formatThumb(mediaThumbData);
      if (webpage.site_name) {
        content.appendHtml`<a class="wepbage_site_name" href="${encodeURI(webpage.url)}" target="_blank">${webpage.site_name}</a>`;
      }
      if (webpage.title) {
        content.appendHtml`<div class="wepbage_title">${webpage.title}</div>`;
      }
      if (webpage.description) {
        const description = cutText(webpage.description, 300, 255);
        content.appendHtml`<div class="webpage_description">${Tpl.raw`${description}`.replaceLineBreaks()}</div>`;
      }
      return Tpl.html`<div class="webpage_content">${content}</div>`;
    }
    return '';
  }

  formatPoll(media) {
    const poll = media.poll;
    const results = media.results;

    const pollType = (poll.public_voters ? '' : 'Anonymous ') + (poll.quiz ? 'Quiz' : 'Poll');
    let voted = false;

    const pollOptions = Tpl.html``;
    for (let i = 0; i < poll.answers.length; i++) {
      const answer = poll.answers[i];
      const answerResult = results.results ? results.results[i] : null;
      const percent = answerResult && results.total_voters ? Math.round(answerResult.voters / results.total_voters * 100) : 0;
      const chosenClass = answerResult && answerResult.chosen ? 'poll_option-selected' : '';
      const quizClass = poll.quiz && answerResult ? (answerResult.correct ? 'poll_option-correct' : 'poll_option-wrong') : '';
      pollOptions.appendHtml`
        <div class="poll_option ${chosenClass} ${quizClass}" data-index="${i}">
          <div class="poll_option_text">${answer.text}</div>
          <div class="poll_option_percent ${percent === 100 ? 'poll_option_percent-long' : ''}">${percent}%</div>
          <div class="poll_option_scale" style="--voters-percent: ${percent}%;"></div>
        </div>
      `;
      if (answerResult && answerResult.chosen) {
        voted = true;
      }
    }

    let footerButton = '';
    if (poll.multiple_choice) {
      footerButton = Tpl.html`<button class="poll_vote_button" disabled>Vote</button>`;
    } else if (poll.public_voters) {
      footerButton = Tpl.html`<button class="poll_results_button">View Results</button>`;
    }

    const pollClasses = this.getClasses({
      'poll-voted': voted || poll.closed,
      'poll-closed': poll.closed,
      'poll-public': poll.public_voters,
      'poll-multi': poll.multiple_choice,
    });

    return Tpl.html`
      <div class="poll ${pollClasses}">
        <div class="poll_question">${poll.question}</div>
        <div class="poll_subheader">
          <div class="poll_type">${pollType}</div>
          <div class="poll_recent_voters"></div>
          <div class="poll_quiz_timer"></div>
          <button class="poll_quiz_solution_button" ${!results.solution ? 'hidden' : ''}></button>
        </div>
        <div class="poll_options">${pollOptions}</div>
        ${footerButton}
        <div class="poll_voters">${this.formatPollFooterText(poll, results.total_voters)}</div>
      </div>
    `;
  }

  formatPollFooterText(poll, totalVoters) {
    if (poll.quiz) {
      return I18n.getPlural('poll_n_answered', totalVoters, {n: formatCountLong(totalVoters)});
    } else {
      return I18n.getPlural('poll_n_voted', totalVoters, {n: formatCountLong(totalVoters)});
    }
  }

  formatText(message) {
    let result;
    if (message.entities) {
      result = this.processTextEntities(message.message, message.entities);
    } else {
      result = Tpl.html`${message.message}`;
    }
    if (result.length) {
      result.replaceLineBreaks();
      return Tpl.html`<span class="message_text">${result}</span>`;
    }
    return result;
  }

  processTextEntities(text, entities) {
    const result = Tpl.html``;
    let offset = 0;
    for (const entity of entities) {
      result.appendHtml`${text.substring(offset, entity.offset)}`;
      offset = entity.offset + entity.length;
      const entityText = text.substr(entity.offset, entity.length);
      result.appendHtml`${this.processEntity(entityText, entity)}`;
    }
    result.appendHtml`${text.substring(offset)}`;
    return result;
  }

  processEntity(text, entity) {
    switch (entity._) {
      case 'messageEntityUrl':
        const url = /^https?:\/\//.test(text) ? text : 'http://' + text;
        return Tpl.html`<a href="${url}" target="_blank" rel="noopener" data-entity="url">${cutText(text, 60, 50)}</a>`;
      case 'messageEntityTextUrl':
        return Tpl.html`<a href="${entity.url}" target="_blank" rel="noopener" data-entity="text_url">${text}</a>`;
      case 'messageEntityBold':
        return Tpl.html`<b>${text}</b>`;
      case 'messageEntityItalic':
        return Tpl.html`<i>${text}</i>`;
      case 'messageEntityUnderline':
        return Tpl.html`<u>${text}</u>`;
      case 'messageEntityStrike':
        return Tpl.html`<s>${text}</s>`;
      case 'messageEntityCode':
        return Tpl.html`<code>${text}</code>`;
      case 'messageEntityPre':
        return Tpl.html`<pre>${text}</pre>`;
      case 'textEntityTypePreCode':
        return Tpl.html`<pre><code>${text}</code></pre>`;
      case 'messageEntityMention':
        return Tpl.html`<a href="#${text}" data-entity="mention">${text}</a>`;
      case 'messageEntityMentionName':
        return Tpl.html`<a href="#${this.getUserHref(entity.user_id)}" data-entity="mention">${text}</a>`;
      case 'messageEntityHashtag':
        return Tpl.html`<a data-entity="hashtag">${text}</a>`;
      case 'messageEntityBotCommand':
        return Tpl.html`<a data-entity="bot_command">${text}</a>`;
      case 'messageEntityEmail':
        return Tpl.html`<a href="mailto:${text}" data-entity="email_address">${text}</a>`;
      case 'messageEntityPhone':
        return Tpl.html`<a href="tel:${text}" data-entity="phone_number">${text}</a>`;
      default:
        return text;
    }
  }

  formatThumb(mediaThumbData, captionText) {
    const result = Tpl.html``;
    let thumbWidth;
    let thumbHeight;
    if (mediaThumbData) {
      let maxW = Math.min(300, window.screen.width - 100);
      let maxH = 200;
      if (mediaThumbData.type === 'sticker') {
        maxW = mediaThumbData.emoji ? 100 : 150;
        maxH = mediaThumbData.emoji ? 100 : 150;
      }
      const photoSize = MediaApiManager.choosePhotoSize(mediaThumbData.sizes);
      const videoSize = mediaThumbData.video_sizes && mediaThumbData.video_sizes[0];
      if (photoSize || videoSize) {
        [thumbWidth, thumbHeight] = this.getThumbWidthHeight((photoSize || videoSize), maxW, maxH);
        if (captionText && captionText.length > 50 && thumbWidth < maxW) {
          thumbWidth = maxW ;
        }
        let durationString = '';
        if (mediaThumbData.type === 'video' || mediaThumbData.type === 'round' || mediaThumbData.type === 'gif') {
          durationString = mediaThumbData.type === 'gif' ? 'GIF' : formatDuration(mediaThumbData.attributes.duration);
        }
        result.appendHtml`
        <div class="message_media_thumb message_media_thumb-${mediaThumbData.type}" style="width:${thumbWidth}px;height:${thumbHeight}px;">
          ${ durationString ? Tpl.html`<div class="message_media_duration">${durationString}</div>` : '' }
          ${ ['video', 'gif'].includes(mediaThumbData.type) ? Tpl.html`<div class="message_media_thumb_play"></div>` : ''}
        </div>
      `;
      }
    }
    if (captionText && mediaThumbData.type !== 'sticker') {
      const cssWidth = thumbWidth ? `width:${thumbWidth}px;` : '';
      result.appendHtml`<div class="message_media_caption" style="${cssWidth}">${captionText}</div>`;
    }
    return result;
  }

  formatMessageDateFull(messageDate) {
    const todayMidnight = new Date().setHours(0, 0, 0, 0) / 1000;
    let dateText;
    if (messageDate > todayMidnight) {
      dateText = 'Today';
    } else {
      dateText = formatDateFull(messageDate, {
        longMonth: true,
        withYear: new Date(messageDate * 1000).getFullYear() !== new Date().getFullYear()
      });
    }
    return dateText;
  }

  formatMessageDateTime(date) {
    return `${this.formatMessageDateFull(date)} at ${formatTime(date)}`;
  }

  getMessageContentTypeLabel(media) {
    if (!media) {
      return '';
    }
    switch (media._) {
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

  getServiceMessageText(message) {
    switch (message.action._) {
      case 'messageActionChatCreate': {
        const user = MessagesApiManager.users.get(message.from_id);
        const userName = MessagesApiManager.getUserName(user);
        return `${userName} created the group "${message.action.title}"`
      }
      case 'messageActionChatEditTitle':
        return 'Chat name changed';
      case 'messageActionChatEditPhoto':
        return 'Chat photo changed';
      case 'messageActionChatDeletePhoto':
        return 'Chat photo deleted';
      case 'messageActionChatAddUser': {
        const inviter = MessagesApiManager.users.get(message.from_id);
        const inviterName = MessagesApiManager.getUserName(inviter);
        const usersNames = message.action.users.map(user_id => MessagesApiManager.getUserName(MessagesApiManager.users.get(user_id)));
        if (usersNames.length > 1) {
          const invitedNames = usersNames.slice(0, -1).join(', ') + ' and ' + usersNames.slice(-1);
          return `${inviterName} invited ${invitedNames}`
        } else if (message.from_id === message.action.users[0]) {
          return inviterName + ' joined the group';
        } else {
          return inviterName + ' invited ' + usersNames[0];
        }
      }
      case 'messageActionChatDeleteUser':
        const user = MessagesApiManager.users.get(message.from_id);
        const userName = MessagesApiManager.getUserName(user);
        return `${userName} left the group`;
      case 'messageActionChatJoinedByLink': {
        const user = MessagesApiManager.users.get(message.from_id);
        const userName = MessagesApiManager.getUserName(user);
        return `${userName} joined the group via invite link`;
      }
      case 'messageActionChannelCreate':
        return 'Channel created';
      case 'messageActionChatMigrateTo':
      case 'messageActionChannelMigrateFrom':
        return 'Chat was upgraded to supergroup';
      case 'messageActionPinMessage': {
        let authorName = '';
        if (message.from_id) {
          const user = MessagesApiManager.users.get(message.from_id);
          authorName = MessagesApiManager.getUserName(user);
        } else {
          authorName = MessagesApiManager.getPeerName(message.to_id);
        }
        const pinnedMessage = MessagesApiManager.messages.get(message.reply_to_msg_id);
        const pinnedMessageText = pinnedMessage && pinnedMessage.message ? `"${cutText(pinnedMessage.message, 30, 20)}"` : 'message';
        return `${authorName} pinned ${pinnedMessageText}`;
      }
      case 'messageActionHistoryClear':
        return 'Chat history was cleared';
      case 'messageActionGameScore':
        return 'Someone scored in a game';
      case 'messageActionPaymentSent':
        return 'Payment was sent';
      case 'messageActionPhoneCall':
        return 'Phone call';
      case 'messageActionScreenshotTaken':
        return 'Screenshot was taken';
      case 'messageActionContactSignUp': {
        const user = MessagesApiManager.users.get(message.from_id);
        const userName = MessagesApiManager.getUserName(user);
        return `${userName} joined Telegram`;
      }
    }
    return '';
  }

  getUserStatusText(user) {
    if (user.bot) {
      return 'bot';
    }
    if (user.status) {
      switch (user.status._) {
        case 'userStatusOnline':
          return 'online';
        case 'userStatusOffline':
          if (user.status.was_online) {
            return 'last seen ' + formatDateRelative(user.status.was_online, ApiClient.getServerTimeNow());
          }
          return 'offline';
        case 'userStatusRecently':
          return 'last seen recently';
        case 'userStatusLastWeek':
          return 'last seen last week';
        case 'userStatusLastMonth':
          return 'last seen last month';
      }
    }
    return 'last seen a long time ago';
  }

  getUserHref(userId) {
    const user = MessagesApiManager.users.get(userId);
    if (user && user.username) {
      return '@' + user.username;
    }
    return '@' + userId;
  }

  async initBackground() {
    const container = $('.messages_container');
    if (!window.caches || !window.OffscreenCanvas) {
      container.prepend(Tpl.html`<div class="messages_bg_image"></div>`.buildElement());
      return;
    }

    const cacheUrl = 'bg.jpg?blurred';
    const cache = await caches.open('v1');
    const cachedResponse = await cache.match(cacheUrl);
    let blob;

    if (cachedResponse) {
      blob = await cachedResponse.blob();
    } else if (window.OffscreenCanvas) {
      const response = await fetch('bg.jpg');
      const image = await createImageBitmap(await response.blob());
      const ratio = image.width / image.height;
      const canvas = new OffscreenCanvas(...getCanvasSize(ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#91b087';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(10px)';
      ctx.drawImage(image, -10, -10, canvas.width + 20, canvas.height + 20);
      blob = await canvas.convertToBlob({type: 'image/jpeg', quality: 0.95});
      cache.put(cacheUrl, new Response(blob));
    }

    const blobUrl = blob ? URL.createObjectURL(blob) : 'bg.jpg';
    container.style.backgroundImage = `url(${blobUrl})`;

    function getCanvasSize(ratio) {
      if (screen.width > screen.height) {
        return [screen.width, screen.width / ratio];
      } else {
        return [screen.height * ratio, screen.height];
      }
    }
  }

  async loadAnimatedEmojiStickerSet() {
    if (!this.animatedEmojies) {
      this.animatedEmojies = await ApiClient.callMethod('messages.getStickerSet', {
        stickerset: {_: 'inputStickerSetAnimatedEmoji'}
      });
    }
  }
};

window.MessagesController = MessagesController;

export {MessagesController};
