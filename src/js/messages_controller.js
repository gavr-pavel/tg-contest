import {$, buildHtmlElement} from './utils';
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
    this.scrollContainer = $('.messages_scroll');
    this.container = $('.messages_list');

    this.loader = buildHtmlElement('<div class="lds-ring"><div></div><div></div><div></div><div></div></div>');

    this.scrollContainer.addEventListener('scroll', this.onScroll);

    this.initPlaceholder();

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

    this.showHeader(dialog);

    this.placeholder.remove();
    this.container.append(this.loader);

    this.loadMore();
  }

  exitChat() {
    this.header.hidden = true;
    this.messageElements.clear();
    this.dialog = null;
    this.chatId = null;
    this.lastMsgId = 0;
    this.offsetMsgId = 0;
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

    const photoEl = $('.messages_header_peer_photo', this.header);
    const photo = MessagesApiManager.getPeerPhoto(dialog.peer);
    if (photo) {
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

    if (this.offsetMsgId && messages[messages.length - 1].id === this.offsetMsgId /*&& messages[0].id === this.lastMsgId*/) {
      this.noMore = true;
      return;
    }

    const prevScrollHeight = this.scrollContainer.scrollHeight;

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

    // this.lastMsgId = messages[0].id;
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
    const thumb = this.getMessageContentThumb(message.media);

    el.innerHTML = `
      <div class="messages_item_content">
        ${authorName}
        ${this.formatText(message)}
        ${this.formatMessageContent(message, thumb)}
        <div class="messages_item_date" title="${this.formatMessageDate(message.date)}">${this.formatMessageTime(message.date)}</div>
      </div>
    `;

    if (thumb) {
      this.loadMessageContentThumb(el, thumb);
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

  getMessageContentThumb(media) {
    if (!media) {
      return;
    }
    switch (media._) {
      case 'messageMediaPhoto':
        return media.photo;
      case 'messageMediaDocument': {
        const docAttributes = this.getDocumentAttributes(media.document);
        if (['video', 'gif', 'sticker'].includes(docAttributes.type)) {
          return media.document;
        }
      } break;
      case 'messageMediaWebPage': {
        if (media.webpage.photo) {
          return media.webpage.photo;
        }
      } break;
    }
  }

  getThumbWidth(thumb) {
    return Math.round(200 * (thumb.w / thumb.h));
  }

  async loadMessageContentThumb(messageEl, thumb) {
    let thumbEl = $('.messages_item_content_thumb', messageEl);

    let sizes;
    if (thumb._ === 'document') {
      sizes = thumb.thumbs;
    } else {
      sizes = thumb.sizes;
    }

    const photoSize = MediaManager.choosePhotoSize(sizes, 'm');
    const thumbWidth = this.getThumbWidth(photoSize);

    const inlineSize = MediaManager.choosePhotoSize(sizes, 'i');
    if (inlineSize) {
      const _t = thumbEl;
      const url = MediaManager.getPhotoStrippedSize(sizes);
      thumbEl = buildHtmlElement(`<img class="messages_item_content_thumb" src="${url}" width="${thumbWidth}" height="200">`);
      _t.replaceWith(thumbEl);
    }

    try {
      let url;
      if (thumb._ === 'document') {
        url = await FileApiManager.loadMessageDocumentThumb(thumb, photoSize.type);
      } else {
        url = await FileApiManager.loadMessagePhoto(thumb, photoSize.type);
      }
      thumbEl.replaceWith(buildHtmlElement(`<img class="messages_item_content_thumb" src="${url}" width="${thumbWidth}" height="200">`));
    } catch (error) {
      console.log('thumb load error', error);
    }
  }

  formatMessageContent(message, thumb) {
    const media = message.media;
    if (!media) {
      return '';
    }
    switch (media._) {
      case 'messageMediaPhoto':
        return this.formatThumb(thumb, message.media.caption);
      case 'messageMediaDocument':
        return this.formatDocument(media, thumb);
      case 'messageMediaWebPage':
        return this.formatWebPage(media, thumb);
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
      default:
        return '[' + media._ + ']';
    }
  }

  formatDocument(media, thumb) {
    if (thumb) {
      return this.formatThumb(thumb, media.caption);
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

    const caption = media.caption ? this.formatText({message: media.caption}) : '';

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

  formatWebPage(media, thumb) {
    const webpage = media.webpage;
    if (webpage._ === 'webPage') {
      return `
        <!--a href="${webpage.url}" target="_blank">${webpage.display_url}</a-->
        <div class="webpage">${this.formatWebpageContent(webpage, thumb)}</div>
      `;
    } else if (webpage._ === 'webPagePending') {
      return 'Content is loading...'
    }
    return 'Content not available';
  }

  formatWebpageContent(webpage, thumb) {
    const formattedThumb = this.formatThumb(thumb);

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
      case 'video':
        return formattedThumb;
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
      text = `<span class="messages_item_text">${text}</span>`;
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

  formatThumb(thumb, caption) {
    let html = '';

    if (thumb) {
      const width = this.getThumbWidth(thumb);
      const height = 200;
      html += `<div class="messages_item_content_thumb" style="width:${width}px;height:${height}px;"></div>`;
    }

    if (caption) {
      const width = thumb ? this.getThumbWidth(thumb) : '';
      html += `<div class="messages_item_content_caption" style="width:${width}px;">${caption}</div>`;
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
