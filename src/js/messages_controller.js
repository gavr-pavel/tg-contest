import {
  $, Tpl,
  buildLoaderElement, cutText,
  formatCountShort, formatCountLong,
  formatDateFull,
  formatDateRelative,
  formatTime,
} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MDCRipple} from '@material/ripple';
import {MediaApiManager} from './api/media_api_manager';
import {MediaViewController} from './media_view_controller';
import {getEmojiMatches} from './emoji_config';
import {MessagesFormController} from './messages_form_controller';
import {ChatsController} from "./chats_controller";
import {ChatInfoController} from "./chat_info_contoller";
import {MessagesSearchController} from './messages_search_controller';
import {ApiClient} from './api/api_client';

const MessagesController = new class {
  messageElements = new Map();

  init() {
    this.header = $('.messages_header');
    this.footer = $('.messages_footer');
    this.scrollContainer = $('.messages_scroll');
    this.container = $('.messages_list');

    this.loader = buildLoaderElement();

    this.scrollContainer.addEventListener('scroll', this.onScroll);

    this.initPlaceholder();

    this.initBackground();

    this.loadAnimatedEmojiStickerSet();

    MessagesFormController.init();

    MessagesApiManager.emitter.on('chatMessagesUpdate', this.onChatMessagesUpdate);
    MessagesApiManager.emitter.on('chatNewMessage', this.onNewMessage);
    MessagesApiManager.emitter.on('chatEditMessage', this.onEditMessage);
    MessagesApiManager.emitter.on('chatDeleteMessage', this.onDeleteMessage);
    MessagesApiManager.emitter.on('userStatusUpdate', this.onUserStatusUpdate);
  }

  setChat(dialog, messageId = 0) {
    if (dialog === this.dialog) {
      this.scrollToBottom();
      return;
    }
    if (this.dialog) {
      this.exitChat();
    }

    this.dialog = dialog;
    this.chatId = MessagesApiManager.getPeerId(dialog.peer);

    $('.main_container').dataset.chat = this.chatId;

    this.placeholder.remove();

    this.showHeader(dialog);
    this.footer.hidden = !this.canSendMessage(dialog);
    if (!this.footer.hidden) {
      MessagesFormController.focus();
    }

    this.container.append(this.loader);

    if (messageId) {
      this.jumpToMessage(messageId);
    } else {
      this.loadHistory();
    }

    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.add('chats_item-selected');
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

  exitChat() {
    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.remove('chats_item-selected');
    }

    MessagesFormController.clear();
    MediaViewController.abort();
    ChatInfoController.close();
    MessagesSearchController.close();

    this.header.hidden = true;
    this.footer.hidden = true;
    this.dialog = null;
    this.chatId = null;
    this.clearMessages();

    delete $('.main_container').dataset.chat;
  }

  clearMessages() {
    this.container.innerHTML = '';
    this.messageElements.clear();
    this.minMsgId = null;
    this.maxMsgId = null;
    this.loading = false;
    this.noMore = false;
    this.scrolling = false;
  }

  initPlaceholder() {
    this.placeholder = Tpl.html`
      <div class="messages_placeholder">
        <div class="messages_placeholder_title">Open chat<br>or create a new one</div>
        <div class="messages_placeholder_actions">
          <button class="messages_placeholder_action messages_placeholder_action-private mdc-icon-button"><div class="messages_placeholder_action_label">Private</div></button>
          <button class="messages_placeholder_action messages_placeholder_action-group mdc-icon-button"><div class="messages_placeholder_action_label">Group</div></button>
          <button class="messages_placeholder_action messages_placeholder_action-channel mdc-icon-button"><div class="messages_placeholder_action_label">Channel</div></button>  
        </div>
      </div>
    `.buildElement();
    this.container.append(this.placeholder);
  }

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
      <div class="messages_header_peer">
        <div class="messages_header_peer_photo"></div>
        <div class="messages_header_peer_description">
          <div class="messages_header_peer_name">${peerName}</div>
          <div class="messages_header_peer_status ${peerStatusClass}">${peerStatus}</div>
        </div>
      </div>
      <div class="messages_header_actions">
        <button class="messages_header_action_search mdc-icon-button"></button>
        <button class="messages_header_action_more mdc-icon-button"></button>
      </div>
    `;
    this.header.hidden = false;

    const peerEl = $('.messages_header_peer');
    peerEl.addEventListener('click', () => {
      MessagesSearchController.close();
      ChatInfoController.show(this.chatId);
    });

    const photoEl = $('.messages_header_peer_photo', this.header);
    ChatsController.loadPeerPhoto(photoEl, dialog.peer);

    if (peer._ === 'peerChannel' || peer._ === 'peerChat') {
      const chatId = peer.channel_id || peer.chat_id;
      MessagesApiManager.loadChatFull(chatId)
          .then((fullChat) => {
            let statusText = '';
            if (fullChat.participants_count) {
              if (MessagesApiManager.isMegagroup(chatId)) {
                statusText = `${formatCountLong(fullChat.participants_count)} members, ${formatCountLong(fullChat.online_count)} online`;
              } else {
                statusText =`${formatCountLong(fullChat.participants_count)} followers`;
              }
            } else if (fullChat.participants.participants) {
              statusText = `${formatCountLong(fullChat.participants.participants.length)} members`;
            }
            $('.messages_header_peer_status', this.header).innerText = statusText;
          });
    }

    Array.from($('.messages_header_actions', this.header).children)
        .forEach((button) => {
          new MDCRipple(button).unbounded = true;
        });

    $('.messages_header_action_search', this.header).addEventListener('click', () => {
      ChatInfoController.close();
      MessagesSearchController.show(this.chatId);
    });

    $('.messages_header_back', this.header).addEventListener('click', () => {
      this.exitChat();
    });
  }

  loadHistory() {
    if (this.loading || this.noMore) {
      return;
    }
    this.loading = true;
    MessagesApiManager.loadChatHistory(this.dialog, this.minMsgId, 30)
        .then((messages) => {
          if (!messages.length) {
            this.noMore = true;
          }
          this.prependHistory(messages);
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
    if (this.loading || this.noMore || !this.chatId) {
      return;
    }
    this.loading = true;
    const limit = 20;
    const addOffset = down ? -limit : 0;
    const offsetId = down ? this.maxMsgId : this.minMsgId;
    MessagesApiManager.loadMessages(this.dialog.peer, offsetId, limit, addOffset)
        .then((messages) => {
          if (!messages.length) {
            this.noMore = true;
          }
          if (down) {
            this.appendHistory(messages);
          } else {
            this.prependHistory(messages);
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

  jumpToMessage(messageId) {
    this.clearMessages();
    this.loading = true;
    MessagesApiManager.loadMessages(this.dialog.peer, messageId, 20, -10)
        .then((messages) => {
          console.log(messages);
          this.prependHistory(messages);
        })
        .catch((error) => {
          const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
          App.alert(errorText);
        })
        .finally(() => {
          this.loading = false;
        });
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
      return chat.pFlags.creator || chat.pFlags.megagroup;
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

  onScroll = () => {
    const scrollContainer = this.scrollContainer;
    const scrollTop = scrollContainer.scrollTop;
    const scrollBottom = scrollContainer.scrollHeight - (scrollTop + scrollContainer.clientHeight);
    const prevScrolling = !!this.scrolling;
    this.scrolling = scrollBottom > 0;
    if (this.scrolling !== prevScrolling) {
      this.scrollContainer.classList.toggle('messages_scroll-scrolling', this.scrolling && !this.footer.hidden);
    }
    if (!this.loading) {
      if (scrollTop < 500 && !this.noMore) {
        this.loadMore();
      } else if (scrollBottom < 300 && this.maxMsgId < this.dialog.top_message) {
        this.loadMore({down: true});
      }
    }
  };

  scrollToBottom() {
    this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
  }

  prependHistory(messages) {
    this.loader.remove();
    if (this.minMsgId) {
      messages = messages.filter(message => message.id < this.minMsgId);
    }
    if (!messages.length) {
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
      this.scrollContainer.scrollTop = prevScrollTop + (this.scrollContainer.scrollHeight - prevScrollHeight);
      this.scrollContainer.style.overflow = '';
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

    const frag = this.buildMessagesBatch(messages);
    this.mergeDateGroups(frag.firstElementChild, this.container.lastElementChild, false);
    this.container.append(frag);

    this.maxMsgId = messages[0].id;
  }

  mergeDateGroups(newerGroup, olderGroup, moveToNewer) {
    if (!newerGroup || !olderGroup) {
      return;
    }
    if (newerGroup.dataset.date === olderGroup.dataset.date) {
      const newerAuthorGroup = newerGroup.children[1];
      const olderAuthorGroup = olderGroup.lastElementChild;
      if (newerAuthorGroup.dataset.authorId === olderAuthorGroup.dataset.authorId) {
        if (moveToNewer) {
          newerAuthorGroup.prepend(...olderAuthorGroup.children);
          olderAuthorGroup.remove();
        } else {
          olderAuthorGroup.append(...olderAuthorGroup.children);
          newerGroup.remove();
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
    const isGroupChat = dialogPeer._ === 'peerChat' || dialogPeer._ === 'peerChannel' && MessagesApiManager.isMegagroup(dialogPeer.channel_id);
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
      if (!lastAuthorGroup || !newerMessage || newerMessage.from_id !== message.from_id) {
        const needPhoto = isGroupChat && message._ === 'message' && authorId !== App.getAuthUserId();
        lastAuthorGroup = this.buildMessagesAuthorGroupEl(authorId, needPhoto);
        if (needPhoto) {
          const photoEl = lastAuthorGroup.firstElementChild;
          ChatsController.loadPeerPhoto(photoEl, MessagesApiManager.getMessageAuthorPeer(message));
        }
        lastDateGroup.firstElementChild.after(lastAuthorGroup);
      }
      const el = this.buildMessageEl(message, {stickToNext, stickToPrev});
      lastAuthorGroup.prepend(el);
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

  buildMessagesAuthorGroupEl(authorId, needPhoto = false) {
    return Tpl.html`
      <div class="messages_group-author ${needPhoto ? 'messages_group-author-with-photo' : ''}" data-author-id="${authorId}">
        ${needPhoto ? Tpl.html`<a class="messages_group_author_photo" href="#${this.getUserHref(authorId)}"></a>` : ''}
      </div>
    `.buildElement();
  }

  buildMessageEl(message, options) {
    const el = document.createElement('div');

    if (message._ === 'message') {
      const isOut = (message.pFlags.out || MessagesApiManager.getMessageDialogPeerId(message) === App.getAuthUserId()) && message.from_id === App.getAuthUserId();
      el.className = this.getClasses({
        'message': true,
        'message-out': isOut,
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
    const authorName = !options.stickToPrev && !isStickerMessage && !isEmojiMessage && !message.pFlags.out ? this.formatAuthorName(message) : '';

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
    } else if (isEmojiMessage) {
      el.classList.add('message-type-emoji');
    }

    if (mediaThumbData) {
      el.classList.add('message-has-thumb');
      this.loadMessageMediaThumb(el, mediaThumbData);
    } else if (message.media && message.media.document) {
      const docBtn = $('.document_icon', el);
      if (docBtn) {
        docBtn.addEventListener('click', this.onFileClick);
      }
    }
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
      return Tpl.html`<a class="message_author" href="#${this.getUserHref(userId)}">${title}</a>`;
    }
    return '';
  }

  onThumbClick = (event) => {
    const thumb = event.currentTarget;
    const msgId = +thumb.dataset.messageId || +thumb.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    const thumbData = this.getMessageMediaThumb(message);
    if (thumb.firstElementChild.tagName === 'TGS-PLAYER') {
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

  onFileClick = (event) => {
    const thumb = event.currentTarget;

    if (thumb.dataset.loading) {
      return;
    }
    thumb.dataset.loading = 1;

    const msgId = +thumb.dataset.messageId || +thumb.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    if (!message) {
      return;
    }
    const document = message.media.document;
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

    const onDone = (url = null) => {
      delete thumb.dataset.loading;
      thumb.removeEventListener('click', onAbort);
      thumb.classList.remove('document_icon-loading');
      thumb.innerHTML = '';
      if (url) {
        const attributes = MediaApiManager.getDocumentAttributes(document);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = attributes.file_name;
        a.click();
      }
    };

    let progressPath;
    if (thumb.classList.contains('document_icon')) {
      thumb.classList.add('document_icon-loading');
      thumb.innerHTML = `
        <svg class="document_icon_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path class="document_icon_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
      `;
      thumb.addEventListener('click', onAbort);
      progressPath = $('.document_icon_progress_path', thumb);
    }

    FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
        .then(onDone)
        .catch((error) => {
          console.error(error);
          onDone();
        });
  };

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
        if (['video', 'gif', 'sticker'].includes(attributes.type)) {
          return {type: attributes.type, object: document, sizes: document.thumbs, attributes};
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
    const inlineSize = MediaApiManager.choosePhotoSize(sizes, 'i');
    if (inlineSize) {
      const url = MediaApiManager.getPhotoStrippedSize(sizes);
      inlineThumb = Tpl.html`<img class="message_media_thumb_image message_media_thumb_image-blurred" src="${url}">`.buildElement();
      thumbContainer.prepend(inlineThumb);
    }

    if (mediaThumbData.type === 'sticker' && mediaThumbData.attributes.animated) {
      const url = await FileApiManager.loadDocument(mediaThumbData.object, {cache: true});
      const thumb = Tpl.html`<tgs-player autoplay src="${url}" class="message_media_thumb_image"></tgs-player>`.buildElement();
      thumbContainer.prepend(thumb);
    } else {
      try {
        const photoSize = MediaApiManager.choosePhotoSize(sizes, 'm');
        let url;
        if (MediaApiManager.isCachedPhotoSize(photoSize)) {
          const mimeType = mediaThumbData.object.mime_type;
          url = await MediaApiManager.getCachedPhotoSize(photoSize, mimeType);
        } else if (mediaThumbData.object._ === 'document') {
          const options = mediaThumbData.type === 'sticker' ? {mimeType: mediaThumbData.object.mime_type} : {};
          url = await FileApiManager.loadDocumentThumb(mediaThumbData.object, photoSize.type, options);
        } else {
          url = await FileApiManager.loadPhoto(mediaThumbData.object, photoSize.type);
        }
        const thumb = Tpl.html`<img class="message_media_thumb_image" src="${url}">`.buildElement();
        thumbContainer.prepend(thumb);
      } catch (error) {
        console.log('thumb load error', error);
      }
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
      }
      if (fwdHeader.channel_id) {
        const channel = MessagesApiManager.chats.get(fwdHeader.channel_id);
        authorName = MessagesApiManager.getChatName(channel);
      }
    }
    return Tpl.html`
      <div class="message_forwarded_header">Forwarded message</div>
      <div class="message_forwarded_content">
        <div class="message_forwarded_author">
          <a>${authorName}</a>
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
    if (message.pFlags.out && message.from_id) {
      const status = message.id <= dialog.read_outbox_max_id ? 'read' : 'sent';
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
        return Tpl.html`${caption}Poll`;
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
    }

    return Tpl.html`
      ${caption}
      <div class="document">
        <div class="document_col">
          <div class="document_icon"></div>
        </div>
        <div class="document_col">
          <div class="document_filename">${attributes.file_name}</div>
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

  formatText(message) {
    const sourceText = message.message;
    let result = Tpl.html``;
    let addClass = '';
    if (message.entities) {
      let offset = 0;
      for (const entity of message.entities) {
        result.appendHtml`${sourceText.substring(offset, entity.offset)}`;
        offset = entity.offset + entity.length;
        const entityText = sourceText.substr(entity.offset, entity.length);
        result.appendHtml`${this.processEntity(entityText, entity)}`;
      }
      result.appendHtml`${sourceText.substring(offset)}`;
    } else {
      result.appendHtml`${sourceText}`;
    }
    if (result.length) {
      result.replaceLineBreaks();
      return Tpl.html`<span class="message_text ${addClass}">${result}</span>`;
    }
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
      let maxW = 300;
      let maxH = 200;
      if (mediaThumbData.type === 'sticker') {
        maxW = mediaThumbData.emoji ? 100 : 150;
        maxH = mediaThumbData.emoji ? 100 : 150;
      }
      const photoSize = MediaApiManager.choosePhotoSize(mediaThumbData.sizes);
      [thumbWidth, thumbHeight] = this.getThumbWidthHeight(photoSize, maxW, maxH);
      if (captionText && captionText.length > 100 && thumbWidth < 300) {
        thumbWidth = 300;
      }
      result.appendHtml`
        <div class="message_media_thumb message_media_thumb-${mediaThumbData.type}" style="width:${thumbWidth}px;height:${thumbHeight}px;">
          ${ ['video', 'gif'].includes(mediaThumbData.type) ? Tpl.html`<div class="message_media_thumb_play"></div>` : ''}
        </div>
      `;
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
    if (user.pFlags.bot) {
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
    if (!window.caches) {
      container.prepend(Tpl.html`<div class="messages_bg_image"></div>`.buildElement());
      return;
    }
    const cache = await caches.open('v1');
    const isCached = await cache.match('bg.jpg?blurred');

    if (!isCached && window.OffscreenCanvas) {
      const response = await fetch('bg.jpg');
      const image = await createImageBitmap(await response.blob());
      const ratio = image.width / image.height;
      const canvas = new OffscreenCanvas(...getCanvasSize(ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#91b087';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = 'blur(10px)';
      ctx.drawImage(image, -10, -10, canvas.width + 20, canvas.height + 20);
      const blob = await canvas.convertToBlob({type: 'image/jpeg', quality: 0.95});
      cache.put('bg.jpg?blurred', new Response(blob));
    }

    container.style.backgroundImage = `url(bg.jpg?blurred)`;

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
