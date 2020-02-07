import {$, buildHtmlElement, debounce, emojiRegex} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MDCRipple} from '@material/ripple';
import {MediaManager} from './api/media_manager';

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

    this.initNewMessageForm();

    MessagesApiManager.initUpdatesState();
    MessagesApiManager.emitter.on('chatMessagesUpdate', this.onChatMessagesUpdate);
    MessagesApiManager.emitter.on('chatNewMessage', this.onNewMessage);
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
  }

  exitChat() {
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

  initNewMessageForm() {
    this.newMessageInput = $('.messages_new_message_input');
    this.newMessageButton = $('.messages_new_message_button');

    const input = this.newMessageInput;
    const button = this.newMessageButton;

    const saveDraft = debounce((peer, message) => {
      MessagesApiManager.saveDraft(peer, message);
    });

    const onInput = () => {
      input.style.height = '';
      input.style.height = input.scrollHeight + 'px';
      const message = input.value.trim();
      button.classList.toggle('messages_new_message_button_send', !!message);
      saveDraft(this.dialog.peer, message);
    };
    input.addEventListener('input', onInput);
    input.addEventListener('change', onInput);

    const onSubmit = () => {
      const message = input.value.trim();
      if (!message) {
        return;
      }
      MessagesApiManager.sendMessage(this.dialog.peer, message);
      input.value = '';
      onInput();
    };
    input.addEventListener('keydown', (event) => {
      if (event.keyCode === 13 && !event.shiftKey) {
        onSubmit();
        event.preventDefault();
      }
    });
    button.addEventListener('click', onSubmit);
  }

  showHeader(dialog) {
    const peerName = MessagesApiManager.getPeerName(dialog.peer);
    let peerStatus = '';
    let peerStatusClass = '';
    if (dialog.peer._ === 'peerUser') {
      const user = MessagesApiManager.getPeerData(dialog.peer);
      if (user.pFlags.bot) {
        peerStatus = 'bot';
      } else if (user.status) {
        peerStatus = this.getUserStatus(user.status);
        if (user.status._ === 'userStatusOnline') {
          peerStatusClass = 'messages_header_peer_status-online';
        }
      }
    } else {
      const chat = MessagesApiManager.getPeerData(dialog.peer);
      peerStatus = dialog.peer._ === 'peerChannel' ?  (chat.pFlags.megagroup ? 'supergroup' :  'channel') : 'group';
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

    });

    const photoEl = $('.messages_header_peer_photo', this.header);
    const photo = MessagesApiManager.getPeerPhoto(dialog.peer);
    if (photo && photo._ !== 'chatPhotoEmpty') {
      FileApiManager.loadPeerPhoto(dialog.peer, photo.photo_small, photo.dc_id, {priority: 10, cache: true})
          .then((url) => {
            photoEl.style.backgroundImage = `url(${url})`;
          });
    }

    Array.from($('.messages_header_actions', this.header).children)
        .forEach((button) => {
          new MDCRipple(button).unbounded = true;
        });
  }

  loadMore() {
    this.loading = true;
    MessagesApiManager.loadChatMessages(this.dialog, this.offsetMsgId, 30)
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
    const {chatId, messages} = event.detail;
    if (chatId === this.chatId) {
      this.renderMessages(messages);
    }
  };

  onNewMessage = (event) => {
    const {chatId, message} = event.detail;
    if (chatId === this.chatId) {

    }
  };

  onScroll = () => {
    const scrollContainer = this.scrollContainer;
    this.scrolling = scrollContainer.scrollTop < scrollContainer.scrollWidth - scrollContainer.offsetHeight;
    if (!this.loading && !this.noMore && scrollContainer.scrollTop < 150) {
      this.loadMore();
    }
  };

  scrollToBottom() {
    this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
  }

  renderMessages(messages) {
    this.loader.remove();

    if (this.offsetMsgId && messages[messages.length - 1].id === this.offsetMsgId && messages[0].id === this.lastMsgId) {
      this.noMore = true;
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

    const frag = document.createDocumentFragment();
    messages.forEach((message, i) => {
      if (this.offsetMsgId && message.id >= this.offsetMsgId) {
        // console.log('message.id >= this.offsetMsgId', message.id, this.offsetMsgId);
        return;
      }
      // if (this.lastMsgId && message.id >= this.lastMsgId) {
      //   console.log('message.id >= this.lastMsgId', message.id, this.lastMsgId);
      //   return;
      // }
      const nextMessage = messages[i - 1];
      const prevMessage = messages[i + 1];
      const stickToNext = message.from_id && nextMessage && nextMessage.from_id === message.from_id;
      const stickToPrev = message.from_id && prevMessage && prevMessage.from_id === message.from_id;
      const el = this.buildMessageEl(message, {stickToNext, stickToPrev});
      frag.append(el);
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

  renderMessageContent(el, message, options) {
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
    }
  }

  formatAuthorName(message) {
    if (message.from_id && this.dialog.peer._ !== 'peerUser') {
      const userId = message.from_id;
      const title = MessagesApiManager.getPeerName({_: 'peerUser', user_id: userId});
      return `<a class="messages_item_author" href="#user/${userId}">${title}</a>`;
    }
    return '';
  }

  onThumbClick = () => {
    // open media viewer
  };

  onFileClick = (event) => {
    const msgId = +event.currentTarget.closest('.messages_item').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    if (message) {
      const document = message.media.document;
      FileApiManager.loadMessageDocument(document)
          .then((url) => {
            console.log('downloaded', url);
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
        const docAttributes = this.getDocumentAttributes(document);
        if (['video', 'gif', 'sticker'].includes(docAttributes.type)) {
          return {type: docAttributes.type, object: document, sizes: document.thumbs};
        }
      } break;
      case 'messageMediaWebPage': {
        if (media.webpage.type === 'photo') {
          const photo = media.webpage.photo;
          return {type: 'photo', object: photo, sizes: photo.sizes};
        } else if (media.webpage.type === 'document') {
          const document = media.webpage.document;
          const docAttributes = this.getDocumentAttributes(document);
          if (['video', 'gif', 'sticker'].includes(docAttributes.type)) {
            return {type: docAttributes.type, object: document, sizes: document.thumbs};
          }
        }
      } break;
    }
  }

  getThumbWidth(thumb) {
    return Math.round(200 * (thumb.w / thumb.h));
  }

  async loadMessageMediaThumb(messageEl, mediaThumbData) {
    let thumbEl = $('.messages_item_media_thumb', messageEl);

    const sizes = mediaThumbData.sizes;

    const inlineSize = MediaManager.choosePhotoSize(sizes, 'i');
    if (inlineSize) {
      const url = MediaManager.getPhotoStrippedSize(sizes);
      thumbEl.innerHTML = `<img class="messages_item_media_thumb_image messages_item_media_thumb_image-blurred" src="${url}">`;
    }

    try {
      const photoSize = MediaManager.choosePhotoSize(sizes, 'm');
      let url;
      if (mediaThumbData.object._ === 'document') {
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

    const attributes = this.getDocumentAttributes(media.document);

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
      return `
        <!--a href="${webpage.url}" target="_blank">${webpage.display_url}</a-->
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
          <a class="wepbage_site_name" href="${webpage.url}" target="_blank">${webpage.site_name}</a>
          <div class="wepbage_title">${webpage.title || ''}</div>
          <div class="webpage_description">${this.replaceLineBreaks(webpage.description)}</div>
        `;
      case 'photo':
      case 'document':
        if (formattedThumb) {
          return formattedThumb;
        }
        break;
    }
    return '[' + webpage.type + ']';
  }

  replaceLineBreaks(text = '') {
    return text.replace(/\n/g, '<br>')
  }

  safeText(text) {
    return text.replace(/</g, '&lt;').replace('>', '&gt;');
  }

  formatText(message) {
    const sourceText = message.message;
    let text = '';
    let addClass = '';
    if (message.entities) {
      let offset = 0;
      for (const entity of message.entities) {
        text += this.safeText(sourceText.substring(offset, entity.offset));
        offset = entity.offset + entity.length;
        const entityText = this.safeText(sourceText.substr(entity.offset, entity.length));
        text += this.processEntity(entityText, entity);
      }
      text += this.safeText(sourceText.substring(offset));
    } else {
      text = sourceText;
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
      const photoSize = MediaManager.choosePhotoSize(mediaThumbData.sizes);
      thumbWidth = this.getThumbWidth(photoSize);
      if (caption && thumbWidth < 300) {
        thumbWidth = 300;
      }
      thumbHeight = 200;
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

  getDocumentAttributes(document) {
    const result = {};

    const hasThumb = document.thumbs && document.thumbs.length;

    for (const attribute of document.attributes) {
      switch (attribute._) {
        case 'documentAttributeFilename':
          result.file_name = attribute.file_name;
          break;
        case 'documentAttributeAudio':
          result.duration = attribute.duration;
          result.audioTitle = attribute.title;
          result.audioPerformer = attribute.performer;
          result.type = attribute.pFlags.voice ? 'voice' : 'audio';
          break;
        case 'documentAttributeVideo':
          result.duration = attribute.duration;
          result.w = attribute.w;
          result.h = attribute.h;
          if (hasThumb && attribute.pFlags.round_message) {
            result.type = 'round';
          } else if (hasThumb) {
            result.type = 'video';
          }
          break;
        case 'documentAttributeSticker':
          result.sticker = true;
          if (attribute.alt !== undefined) {
            result.stickerEmoji = attribute.alt;
          }
          if (attribute.stickerset) {
            if (attribute.stickerset._ === 'inputStickerSetEmpty') {
              delete attribute.stickerset;
            } else if (attribute.stickerset._ === 'inputStickerSetID') {
              result.stickerSetInput = attribute.stickerset;
            }
          }
          if (hasThumb && document.mime_type === 'image/webp') {
            result.type = 'sticker';
          }
          break;
        case 'documentAttributeImageSize':
          result.w = attribute.w;
          result.h = attribute.h;
          if (hasThumb && document.mime_type === 'application/x-tgsticker') { // todo animated sticker support
            result.type = 'sticker';
          }
          break;
        case 'documentAttributeAnimated':
          if ((document.mime_type === 'image/gif' || document.mime_type === 'video/mp4') && hasThumb) {
            result.type = 'gif';
          }
          result.animated = true;
          break;
      }
    }

    if (!result.mime_type) {
      switch (result.type) {
        case 'gif':
          result.mime_type = 'video/mp4';
          break;
        case 'video':
        case 'round':
          result.mime_type = 'video/mp4';
          break;
        case 'sticker':
          result.mime_type = 'image/webp';
          break;
        case 'audio':
          result.mime_type = 'audio/mpeg';
          break;
        case 'voice':
          result.mime_type = 'audio/ogg';
          break;
        default:
          result.mime_type = 'application/octet-stream';
          break;
      }
    }

    if (!result.file_name) {
      result.file_name = '';
    }

    return result;
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

  getUserStatus(status) {
    switch (status._) {
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
    return 'last seen long time ago';
  }
};

window.MessagesController = MessagesController;

export {MessagesController};
