import {$, buildHtmlElement, encodeHtmlEntities} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MDCRipple} from '@material/ripple';
import {MediaApiManager} from './api/media_api_manager';
import {MediaViewController} from './media_view_controller';
import {emojiRegex} from './emoji_config';
import {MessagesFormController} from './messages_form_controller';
import {ChatsController} from "./chats_controller";
import {ChatInfoController} from "./chat_info_contoller";
import {MessagesSearchController} from './messages_search_controller';

const MessagesController = new class {
  dialog = null;
  chatId = null;
  messageElements = new Map();
  offsetMsgId = 0;

  init() {
    this.header = $('.messages_header');
    this.footer = $('.messages_footer');
    this.scrollContainer = $('.messages_scroll');
    this.container = $('.messages_list');

    this.loader = buildHtmlElement('<div class="lds-ring"><div></div><div></div><div></div><div></div></div>');

    this.scrollContainer.addEventListener('scroll', this.onScroll);

    this.initPlaceholder();

    this.initBackground();

    MessagesFormController.init();

    MessagesApiManager.initUpdatesState();
    MessagesApiManager.emitter.on('chatMessagesUpdate', this.onChatMessagesUpdate);
    MessagesApiManager.emitter.on('chatNewMessage', this.onNewMessage);
    MessagesApiManager.emitter.on('chatEditMessage', this.onEditMessage);
    MessagesApiManager.emitter.on('chatDeleteMessage', this.onDeleteMessage);
    MessagesApiManager.emitter.on('userStatusUpdate', this.onUserStatusUpdate);
  }

  setChat(dialog) {
    if (dialog === this.dialog) {
      this.scrollToBottom();
      return;
    }
    if (this.dialog) {
      this.exitChat();
    }

    this.dialog = dialog;
    this.chatId = MessagesApiManager.getPeerId(dialog.peer);

    this.placeholder.remove();

    this.showHeader(dialog);
    this.footer.hidden = !this.canSendMessage(dialog);

    this.container.append(this.loader);

    this.loadMore();

    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.add('chats_item-selected');
    }
  }

  exitChat() {
    const chatEl = ChatsController.chatElements.get(this.chatId);
    if (chatEl) {
      chatEl.classList.remove('chats_item-selected');
    }

    ChatInfoController.close();
    MessagesSearchController.close();

    this.header.hidden = true;
    this.footer.hidden = true;
    this.messageElements.clear();
    this.dialog = null;
    this.chatId = null;
    this.lastMsgId = null;
    this.offsetMsgId = null;
    this.container.innerHTML = '';
    this.loading = false;
    this.noMore = false;
    this.scrolling = false;

    MediaViewController.abort();
  }

  initPlaceholder() {
    this.placeholder = buildHtmlElement(`
      <div class="messages_placeholder">
        <div class="messages_placeholder_title">Open chat<br>or create a new one</div>
        <div class="messages_placeholder_actions">
          <button class="messages_placeholder_action messages_placeholder_action-private mdc-icon-button"><div class="messages_placeholder_action_label">Private</div></button>
          <button class="messages_placeholder_action messages_placeholder_action-group mdc-icon-button"><div class="messages_placeholder_action_label">Group</div></button>
          <button class="messages_placeholder_action messages_placeholder_action-channel mdc-icon-button"><div class="messages_placeholder_action_label">Channel</div></button>  
        </div>
      </div>
    `);
    this.container.append(this.placeholder);
  }

  showHeader(dialog) {
    const peer = dialog.peer;
    const peerId = MessagesApiManager.getPeerId(dialog.peer);
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

    this.header.innerHTML = `
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
            let statusText;
            if (fullChat.participants_count) {
              if (MessagesApiManager.isMegagroup(chatId)) {
                statusText = `${this.formatCount(fullChat.participants_count)} members, ${this.formatCount(fullChat.online_count)} online`;
              } else {
                statusText =`${this.formatCount(fullChat.participants_count)} followers`;
              }
            } else if (fullChat.participants.participants) {
              statusText = `${this.formatCount(fullChat.participants.participants.length)} members`;
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
  }

  loadMore() {
    this.loading = true;
    MessagesApiManager.loadChatMessages(this.dialog, this.offsetMsgId, 30)
        .then((messages) => {
          if (!messages.length) {
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
      this.renderMessages(messages);
    }
  };

  onNewMessage = (event) => {
    const {dialog, message} = event.detail;
    if (dialog === this.dialog) {
      this.renderNewMessage(message);
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
    this.scrolling = scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.offsetHeight;
    if (!this.loading && !this.noMore && scrollContainer.scrollTop < 150) {
      this.loadMore();
    }
  };

  scrollToBottom() {
    this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
  }

  renderMessages(messages) {
    this.loader.remove();

    if (!messages.length) {
      return;
    }

    const prevScrollHeight = this.scrollContainer.scrollHeight;

    if (this.lastMsgId) {
      const frag = document.createDocumentFragment();
      for (let i = 0; messages[i].id > this.lastMsgId; i++) {
        const message = messages[i];
        const nextMessage = messages[i - 1];
        const prevMessage = messages[i + 1];
        const stickToNext = message.from_id && nextMessage && nextMessage.from_id === message.from_id;
        const stickToPrev = message.from_id && prevMessage && prevMessage.from_id === message.from_id;
        const el = this.buildMessageEl(message, {stickToNext, stickToPrev});
        frag.append(el);
      }
      this.container.prepend(frag);
    }

    let newElementsAdded = false;
    const frag = document.createDocumentFragment();
    messages.forEach((message, i) => {
      if (this.offsetMsgId && message.id >= this.offsetMsgId) {
        return;
      }

      const nextMessage = messages[i - 1];
      const prevMessage = messages[i + 1];

      let stickToNext = message.from_id && nextMessage && nextMessage.from_id === message.from_id;
      let stickToPrev = message.from_id && prevMessage && prevMessage.from_id === message.from_id;
      const messageMidnight = new Date(message.date * 1000).setHours(0, 0, 0, 0) / 1000;
      let dateMessageEl = '';
      if (!prevMessage || prevMessage.date < messageMidnight) {
        dateMessageEl = this.buildDateMessageEl(message.date);
      }
      if (!nextMessage || nextMessage.date > messageMidnight + 86400) {
        stickToNext = false;
      }
      if (!newElementsAdded) {
        if (nextMessage && !this.compareMessagesDate(message, nextMessage)) {
          const lastEl = this.container.lastElementChild;
          if (lastEl.classList.contains('messages_item-type-service')) {
            lastEl.remove();
          }
        }
        newElementsAdded = true;
      }
      const el = this.buildMessageEl(message, {stickToNext, stickToPrev});
      frag.append(el, dateMessageEl);
    });
    this.container.append(frag);

    this.lastMsgId = messages[0].id;
    this.offsetMsgId = messages[messages.length - 1].id;

    if (this.scrolling) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - prevScrollHeight;
    } else {
      if (this.scrollContainer.scrollHeight <= this.scrollContainer.offsetHeight) {
        this.loadMore();
      } else {
        this.scrollToBottom();
      }
    }
  }

  renderNewMessage(message) {

  }

  buildMessageEl(message, options) {
    const el = document.createElement('div');

    if (message._ === 'message') {
      el.className = this.getClasses({
        'messages_item': true,
        'messages_item-out': message.pFlags.out,
        'messages_item-stick-to-next': options.stickToNext,
        'messages_item-stick-to-prev': options.stickToPrev,
      });
      this.renderMessageContent(el, message, options);
    } else if (message._ === 'messageService') {
      el.className = 'messages_item-type-service';
      el.innerText = this.getServiceMessageText(message);
    }

    el.dataset.id = message.id;
    this.messageElements.set(message.id, el);
    return el;
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
    const authorName = !options.stickToPrev ? this.formatAuthorName(message) : '';
    const mediaThumbData = this.getMessageMediaThumb(message.media);

    el.innerHTML = `
      <div class="messages_item_content">
        ${authorName}
        ${this.formatMessageContent(message, mediaThumbData)}
        <div class="messages_item_date" title="${this.formatMessageDate(message.date)}">${this.formatMessageTime(message.date)}</div>
      </div>
    `;

    if (mediaThumbData) {
      this.loadMessageMediaThumb(el, mediaThumbData);
    } else if (message.media && message.media.document) {
      const docBtn = $('.document_icon', el);
      if (docBtn) {
        docBtn.addEventListener('click', this.onFileClick);
      }
    }
  }

  formatAuthorName(message) {
    if (message.from_id && this.dialog.peer._ !== 'peerUser') {
      const userId = message.from_id;
      const title = MessagesApiManager.getPeerName({_: 'peerUser', user_id: userId});
      return `<a class="messages_item_author" href="#user/${userId}">${encodeHtmlEntities(title)}</a>`;
    }
    return '';
  }

  onThumbClick = (event) => {
    const thumb = event.currentTarget;
    const msgId = +thumb.dataset.messageId || +thumb.closest('.messages_item').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    const thumbData = this.getMessageMediaThumb(message.media);
    if (thumbData.type === 'photo') {
      MediaViewController.showPhoto(thumbData.object, thumb);
    } else if (thumbData.type === 'video') {
      MediaViewController.showVideo(thumbData.object, thumb);
    } else if (thumbData.type === 'gif') {
      MediaViewController.showGif(thumbData.object, thumb);
    }
  };

  onFileClick = (event) => {
    const msgId = +event.currentTarget.dataset.messageId || +event.currentTarget.closest('.messages_item').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    if (message) {
      const document = message.media.document;
      const attributes = MediaApiManager.getDocumentAttributes(document);
      FileApiManager.loadMessageDocument(document)
          .then((url) => {
            console.log('downloaded', url);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = attributes.file_name;
            a.click();
          });
      console.log(`started loading ${document.mime_type} file`);
    }
    console.log(msgId, message);
  };

  getMessageMediaThumb(media) {
    if (!media) {
      return;
    }
    switch (media._) {
      case 'messageMediaPhoto':
        const photo = media.photo;
        return {type: 'photo', object: photo, sizes: photo.sizes};
      case 'messageMediaDocument': {
        const document = media.document;
        const docAttributes = MediaApiManager.getDocumentAttributes(document);
        if (['video', 'gif', 'sticker'].includes(docAttributes.type)) {
          return {type: docAttributes.type, object: document, sizes: document.thumbs};
        }
      } break;
      case 'messageMediaWebPage': {
        if (media.webpage.type !== 'photo' && media.webpage.document) {
          const document = media.webpage.document;
          if (media.webpage.type === 'video' || media.webpage.type === 'gif') {
            return {type: media.webpage.type, object: document, sizes: document.thumbs};
          } else {
            const docAttributes = MediaApiManager.getDocumentAttributes(document);
            if (docAttributes.type === 'video' || docAttributes.type === 'gif') {
              return {type: docAttributes.type, object: document, sizes: document.thumbs};
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

  getThumbWidthHeight(thumb) {
    let h = 200;
    let w = Math.round(h * (thumb.w / thumb.h));
    if (w > 400) {
      w = 400;
      h = Math.round(w / (thumb.w / thumb.h));
    }
    return [w, h];
  }

  async loadMessageMediaThumb(messageEl, mediaThumbData) {
    let thumbEl = $('.messages_item_media_thumb', messageEl);
    if (!thumbEl) {
      debugger;
      return;
    }
    thumbEl.addEventListener('click', this.onThumbClick);

    const sizes = mediaThumbData.sizes;

    const inlineSize = MediaApiManager.choosePhotoSize(sizes, 'i');
    if (inlineSize) {
      const url = MediaApiManager.getPhotoStrippedSize(sizes);
      thumbEl.innerHTML = `<img class="messages_item_media_thumb_image messages_item_media_thumb_image-blurred" src="${url}">`;
    }

    try {
      const photoSize = MediaApiManager.choosePhotoSize(sizes, 'm');
      let url;
      if (MediaApiManager.isCachedPhotoSize(photoSize)) {
        url = MediaApiManager.getCachedPhotoSize(photoSize);
      } else if (mediaThumbData.object._ === 'document') {
        url = await FileApiManager.loadMessageDocumentThumb(mediaThumbData.object, photoSize.type, {cache: true});
      } else {
        url = await FileApiManager.loadMessagePhoto(mediaThumbData.object, photoSize.type, {cache: true});
      }
      thumbEl.innerHTML = `<img class="messages_item_media_thumb_image" src="${url}">`;
    } catch (error) {
      console.log('thumb load error', error);
    }
  }

  formatMessageContent(message, mediaThumbData) {
    const media = message.media;
    const caption = this.formatText(message);
    if (!media) {
      return caption;
    }
    switch (media._) {
      case 'messageMediaPhoto':
        return this.formatThumb(mediaThumbData, caption);
      case 'messageMediaDocument':
        return this.formatDocument(media, mediaThumbData, caption);
      case 'messageMediaWebPage':
        return caption + this.formatWebPage(media, mediaThumbData, caption);
      case 'messageMediaPoll':
        return caption + 'Poll';
      case 'messageMediaGeo':
        return caption + 'Geo';
      case 'messageMediaGeoLive':
        return caption + 'Live Geo';
      case 'messageMediaContact':
        return caption + 'Contact';
      case 'messageMediaUnsupported':
        return 'Message unsupported';
      default:
        return caption + '[' + media._ + ']';
    }
  }

  formatDocument(media, mediaThumbData, caption) {
    if (mediaThumbData) {
      return this.formatThumb(mediaThumbData, caption);
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

    return `
      ${caption}
      <div class="document">
        <div class="document_col">
          <div class="document_icon"></div>
        </div>
        <div class="document_col">
          <div class="document_filename">${encodeHtmlEntities(attributes.file_name)}</div>
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
      return `
        <!--a href="${encodeURI(webpage.url)}" target="_blank">${webpage.display_url}</a-->
        <div class="webpage">${this.formatWebpageContent(webpage, mediaThumbData)}</div>
      `;
    } else if (webpage._ === 'webPagePending') {
      return 'Content is loading...'
    }
    return 'Content not available';
  }

  formatWebpageContent(webpage, mediaThumbData) {
    const formattedThumb = this.formatThumb(mediaThumbData);

    switch (webpage.type) {
      case 'telegram_message':
      case 'article':
        return `
          ${formattedThumb}
          <a class="wepbage_site_name" href="${encodeURI(webpage.url)}" target="_blank">${encodeHtmlEntities(webpage.site_name)}</a>
          <div class="wepbage_title">${encodeHtmlEntities(webpage.title || '')}</div>
          <div class="webpage_description">${this.replaceLineBreaks(encodeHtmlEntities(webpage.description))}</div>
        `;
    }
    if (formattedThumb) {
      return formattedThumb;
    }
    return '[' + webpage.type + ']';
  }

  replaceLineBreaks(text = '') {
    return text.replace(/\n/g, '<br>')
  }

  formatText(message) {
    const sourceText = message.message;
    let text = '';
    let addClass = '';
    if (message.entities) {
      let offset = 0;
      for (const entity of message.entities) {
        text += encodeHtmlEntities(sourceText.substring(offset, entity.offset));
        offset = entity.offset + entity.length;
        const entityText = encodeHtmlEntities(sourceText.substr(entity.offset, entity.length));
        text += this.processEntity(entityText, entity);
      }
      text += encodeHtmlEntities(sourceText.substring(offset));
    } else {
      text = encodeHtmlEntities(sourceText);
    }
    if (text) {
      text = this.replaceLineBreaks(text);
      if (text.length <= 12 && !message.media) {
        const emojiMatches = text.match(emojiRegex);
        if (emojiMatches && emojiMatches.length <= 3 && emojiMatches.join('').length === text.length) {
          addClass += ' messages_item_text_emoji_big';
        }
      }
      text = `<span class="messages_item_text ${addClass}">${text}</span>`;
    }
    return text;
  }


  processEntity(text, entity) {
    switch (entity._) {
      case 'messageEntityUrl':
        const url = /^https?:\/\//.test(text) ? text : 'http://' + text;
        return `<a href="${url}" target="_blank" rel="noopener" data-entity="url">${text}</a>`;
      case 'messageEntityTextUrl':
        return `<a href="${entity.url}" target="_blank" rel="noopener" data-entity="text_url">${text}</a>`;
      case 'messageEntityBold':
        return `<b>${text}</b>`;
      case 'messageEntityItalic':
        return `<i>${text}</i>`;
      case 'messageEntityUnderline':
        return `<u>${text}</u>`;
      case 'messageEntityStrike':
        return `<s>${text}</s>`;
      case 'messageEntityCode':
        return `<code>${text}</code>`;
      case 'messageEntityPre':
        return `<pre>${text}</pre>`;
      case 'textEntityTypePreCode':
        return `<pre><code>${text}</code></pre>`;
      case 'messageEntityMention':
        return `<a href="${text}" data-entity="mention">${text}</a>`;
      case 'messageEntityMentionName':
        return`<a href="#user/${entity.user_id}" data-entity="mention">${text}</a>`;
      case 'messageEntityHashtag':
        return `<a href="${text}" data-entity="hashtag">${text}</a>`;
      case 'messageEntityBotCommand':
        return `<a data-entity="bot_command">${text}</a>`;
      case 'messageEntityEmail':
        return `<a href="mailto:${text}" data-entity="email_address">${text}</a>`;
      case 'messageEntityPhone':
        return `<a href="tel:${text}" data-entity="phone_number">${text}</a>`;
      default:
        return text;
    }
  }

  formatThumb(mediaThumbData, caption) {
    let html = '';

    let thumbWidth;
    let thumbHeight;

    if (mediaThumbData) {
      const photoSize = MediaApiManager.choosePhotoSize(mediaThumbData.sizes);
      [thumbWidth, thumbHeight] = this.getThumbWidthHeight(photoSize);
      if (caption && caption.length > 100 && thumbWidth < 300) {
        thumbWidth = 300;
      }
      html += `<div class="messages_item_media_thumb messages_item_media_thumb-${mediaThumbData.type}" style="width:${thumbWidth}px;height:${thumbHeight}px;"></div>`;
    }

    if (caption) {
      const cssWidth = thumbWidth ? `width:${thumbWidth}px;` : '';
      html += `<div class="messages_item_media_caption" style="${cssWidth}">${caption}</div>`;
    }

    return html;
  }

  formatMessageTime(ts) {
    const date = new Date(ts * 1000);
    return date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
  }

  formatMessageDate(ts) {
    const date = new Date(ts * 1000);
    return date.toLocaleString().replace(/\//g, '.');
  }

  compareMessagesDate(message1, message2) {
    const date1 = new Date(message1.date * 1000);
    const date2 = new Date(message2.date * 1000);
    if (date1.toDateString() !== date2.toDateString()) {
      return message1.date > message2.date ? 1 : -1;
    }
    return 0;
  }

  formatMessageDateFull(messageDate) {
    const todayMidnight = new Date().setHours(0, 0, 0, 0) / 1000;

    let dateText;
    if (messageDate > todayMidnight) {
      dateText = 'Today';
    } else if (messageDate > todayMidnight - 86400) {
      dateText = 'Yesterday';
    } else {
      const date = new Date(messageDate * 1000);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      dateText = months[date.getMonth()] + ' ' + date.getDate();
    }

    return dateText;
  }

  formatMessageDateTime(date) {
    return `${this.formatMessageDateFull(date)} at ${this.formatMessageTime(date)}`;
  }

  buildDateMessageEl(messageDate) {
    return buildHtmlElement(`
      <div class="messages_item-type-service messages_item-type-date">${ this.formatMessageDateFull(messageDate) }</div>
    `);
  }

  formatCount(count) {
    let str = '';
    do {
      let part = (count % 1000).toString();
      if (count > 1000) {
        part = part.padStart(3, '0');
      }
      str = part + ' ' + str;
      count = Math.floor(count / 1000);
    } while (count);
    return str.trim();
  }

  getServiceMessageText(message) {
    switch (message.action._) {
      case 'messageActionChatCreate':
        return 'Chat created';
      case 'messageActionChatEditTitle':
        return 'Chat name changed';
      case 'messageActionChatEditPhoto':
        return 'Chat photo changed';
      case 'messageActionChatDeletePhoto':
        return 'Chat photo deleted';
      case 'messageActionChatAddUser':
        return 'New member in the group';
      case 'messageActionChatDeleteUser':
        return 'User left the group.';
      case 'messageActionChatJoinedByLink':
        return 'A user joined the chat via an invite link';
      case 'messageActionChannelCreate':
        return 'The channel was created';
      case 'messageActionChatMigrateTo':
      case 'messageActionChannelMigrateFrom':
        return 'Chat was upgraded to supergroup';
      case 'messageActionPinMessage':
        return 'A message was pinned';
      case 'messageActionHistoryClear':
        return 'Chat history was cleared';
      case 'messageActionGameScore':
        return 'Someone scored in a game';
      case 'messageActionPaymentSent':
        return 'A payment was sent';
      case 'messageActionPhoneCall':
        return 'A phone call';
      case 'messageActionScreenshotTaken':
        return 'A screenshot was taken';
      case 'messageActionContactSignUp':
        return 'A contact just signed up to telegram';
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

  initBackground() {
    const img = document.createElement('img');
    img.src = 'bg.jpg';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = img.width / img.height;
      if (screen.width > screen.height) {
        canvas.width = screen.width;
        canvas.height = screen.width / ratio;
      } else {
        canvas.width = screen.height * ratio;
        canvas.height = screen.height;
      }
      const ctx = canvas.getContext('2d');
      ctx.filter = 'blur(10px)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        $('.messages_container').style.backgroundImage = `url(${url})`;
      });
    };
  }
};

window.MessagesController = MessagesController;

export {MessagesController};
