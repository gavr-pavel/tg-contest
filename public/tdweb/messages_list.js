import TdClient from './td_client.js';
import FileLoader from './file_loader.js';
import {$} from './utils.js';

export default new class MessagesList {
  scrollContainer = $('.messages_container');

  container = $('.messages_list');

  messages = new Map();

  messageElements = new Map();

  chat;

  constructor() {
    TdClient.listen(this.onUpdate);
  }

  onUpdate = (update) => {
    switch (update['@type']) {
      case 'updateNewMessage':
        if (this.chat && this.chat.id === update.message.chat_id) {
          this.onNewMessage(update.message);
        }
        break;
      case 'updateDeleteMessages':
        if (this.chat && this.chat.id === update.chat_id && update.is_permanent) {
          this.onDeleteMessages(update.message_ids);
        }
        break;
      case 'updateMessageContent':
        if (this.chat && this.chat.id === update.chat_id) {
          const message = this.messages.get(update.message_id);
          if (message) {
            message.content = update.new_content;
            const el = this.messageElements.get(message.id);
            if (el) {
              this.renderMessageContent(el, message);
            }
          }
        }
    }
  };

  setChat(chat) {
    if (this.chat) {
      if (this.chat.id === chat.id) {
        return;
      }
      this.exitChat();
    }
    this.chat = chat;
    this.renderMessages(chat);
  }

  getChatHref(chat) {
    let username;
    switch (chat.type['@type']) {
      case 'chatTypePrivate':
        username = App.users.get(chat.type.user_id).username;
        break;
      case 'chatTypeSupergroup':
        username = App.supergroups.get(chat.type.supergroup_id).username;
        break;
    }
    return `chat/${chat.id}`;
  }

  onNewMessage(message) {
    const el = this.buildMessageEl(message);
    this.container.appendChild(el);
  }

  onDeleteMessages(messagesIds) {
    for (const messageId of messagesIds) {
      const el = this.messageElements.get(messageId);
      if (el) {
        el.remove();
        this.messageElements.delete(messageId);
      }
    }
  }

  async renderMessages(chat, fromMessageId = 0) {
    const {messages} = await TdClient.send({
      '@type': 'getChatHistory',
      chat_id: chat.id,
      from_message_id: fromMessageId,
      limit: 100,
    });

    if (!messages.length) {
      return;
    }

    const frag = document.createDocumentFragment();

    for (const message of messages) {
      this.messages.set(message.id, message);
      const el = this.buildMessageEl(message);
      frag.prepend(el);
    }

    this.container.prepend(frag);

    this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;

    if (this.messageElements.size < 100) {
      const offsetMessage = messages[messages.length - 1];
      this.renderMessages(chat, offsetMessage.id);
    }
  }

  buildMessageEl(message) {
    const el = document.createElement('div');
    el.className = 'messages_item';
    el.dataset.id = message.id;
    this.renderMessageContent(el, message);
    this.messageElements.set(message.id, el);
    return el;
  }

  renderMessageContent(el, message) {
    const thumb = this.getMessageContentThumb(message.content);
    el.innerHTML = `
      <div class="messages_item_date" title="${this.formatMessageDate(message.date)}">${this.formatMessageTime(message.date)}</div>
      <div class="messages_item_content">${this.formatMessageContent(message.content, thumb)}</div>
    `;
    if (thumb) {
      this.loadMessageContentThumb(el, thumb);
    }
  }

  getMessageContentThumb(content) {
    switch (content['@type']) {
      case 'messagePhoto':
        return content.photo.sizes[0];
      case 'messageVideo':
        return content.video.thumbnail;
      case 'messageDocument':
        return content.document.thumbnail;
      case 'messageAnimation':
        return content.animation.thumbnail;
      case 'messageSticker':
        return content.sticker.thumbnail;
    }
  }

  loadMessageContentThumb(el, thumb) {
    FileLoader.download(thumb.photo.id)
        .then(file => FileLoader.getUrl(file))
        .then(url => {
          const img = $('.messages_item_content_thumb', el);
          img.src = url;
          img.width = thumb.width / 2;
          img.height = thumb.height / 2;
        });
  }

  formatMessageContent(content, thumb) {
    switch (content['@type']) {
      case 'messageText':
        return this.formatText(content.text);
      case 'messagePhoto':
        return this.formatThumb(thumb, content.photo.minithumbnail, content.caption);
      case 'messageVideo':
        return this.formatThumb(thumb, content.video.minithumbnail, content.caption);
      case 'messageDocument':
        return this.formatThumb(thumb, content.document.minithumbnail, content.caption);
      case 'messageAnimation':
        return this.formatThumb(thumb, content.animation.minithumbnail, content.caption);
      case 'messageSticker':
        return this.formatThumb(thumb, null, content.caption);
      default:
        return content['@type'];
    }
  }

  formatText(contentText) {
    const sourceText = contentText.text;
    let text = '';
    let offset = 0;
    for (const entity of contentText.entities) {
      text += sourceText.substring(offset, entity.offset);
      offset = entity.offset + entity.length;
      const entityText = sourceText.substr(entity.offset, entity.length);
      text += this.processEntity(entityText, entity);
    }
    text += sourceText.substring(offset);
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  processEntity(text, entity) {
    switch (entity.type['@type']) {
      case 'textEntityTypeUrl':
        const url = /^https?:\/\//.test(text) ? text : 'http://' + text;
        return `<a href="${url}" target="_blank" rel="noopener" data-entity="url">${text}</a>`;
      case 'textEntityTypeTextUrl':
        return `<a href="${entity.type.url}" target="_blank" rel="noopener" data-entity="text_url">${text}</a>`;
      case 'textEntityTypeBold':
        return `<b>${text}</b>`;
      case 'textEntityTypeItalic':
        return `<i>${text}</i>`;
      case 'textEntityTypeCode':
        return `<code>${text}</code>`;
      case 'textEntityTypePre':
        return `<pre>${text}</pre>`;
      case 'textEntityTypePreCode':
        return `<pre><code>${text}</code></pre>`;
      case 'textEntityTypeMention':
        return `<a href="${text}" data-entity="mention">${text}</a>`;
      case 'textEntityTypeMentionName':
        return`<a href="user/${entity.type.user_id}" data-entity="mention">${text}</a>`;
      case 'textEntityTypeHashtag':
        return `<a href="${text}" data-entity="hashtag">${text}</a>`;
      case 'textEntityTypeBotCommand':
        return `<a data-entity="bot_command">${text}</a>`;
      case 'textEntityTypeEmailAddress':
        return `<a href="mailto:${text}" data-entity="email_address">${text}</a>`;
      case 'textEntityTypePhoneNumber':
        return `<a href="tel:${text}" data-entity="phone_number">${text}</a>`;
      default:
        return text;
    }
  }

  formatThumb(thumb, minithumb, caption) {
    let html = '';

    if (thumb) {
      const width = thumb.width / 2;
      const height = thumb.height / 2;
      const src = minithumb ? 'data:image/jpeg;base64,' + minithumb.data : '';
      html += `<img class="messages_item_content_thumb" src="${src}" width="${width}" height="${height}" alt>`;
    }

    if (caption) {
      html += `<div class="messages_item_content_caption">${this.formatText(caption)}</div>`;
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

  exitChat() {
    this.messages.clear();
    this.messageElements.clear();
    this.chat = null;
    this.container.innerHTML = '';
  }

}
