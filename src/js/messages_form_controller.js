import {$, buildHtmlElement, debounce, encodeHtmlEntities, getLabeledElements} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {EmojiDropdown} from './emoji_dropdown';
import {MDCRipple} from '@material/ripple';
import {FileUploadPopup} from './file_upload_popup';
import {ChatInfoController} from './chat_info_contoller';

const MessagesFormController = new class {
  init() {
    this.container = $('.messages_form');

    this.dom = getLabeledElements(this.container);

    this.saveDraft = debounce((peer, message) => {
      MessagesApiManager.saveDraft(peer, message);
    });

    const input = this.dom.input;

    input.addEventListener('input', this.onInput);
    input.addEventListener('change', this.onInput);
    input.addEventListener('keydown', this.onKeyDown);
    this.dom.submit_button.addEventListener('click', this.onSubmit);

    new MDCRipple(this.dom.submit_button).unbounded = true;

    EmojiDropdown.init();
    EmojiDropdown.bind(this.dom.emoji_button, input);

    FileUploadPopup.init();
    FileUploadPopup.bind(this.dom.media_button);

    input.parentNode.appendChild(EmojiDropdown.container);
  }

  onInput = () => {
    const input = this.dom.input;
    input.style.height = '';
    input.style.height = input.scrollHeight + 'px';

    const message = input.value.trim();
    this.dom.submit_button.classList.toggle('messages_form_button-send', !!message);

    this.saveDraft(MessagesController.dialog.peer, message);
  };

  onSubmit = () => {
    const input = this.dom.input;
    const message = input.value.trim();
    if (!message) {
      return;
    }
    MessagesApiManager.sendMessage(MessagesController.dialog.peer, message);
    input.value = '';
    this.onInput();
  };

  onKeyDown = (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      this.onSubmit();
      event.preventDefault();
    }
  };

  onStickerSend(document) {
    const inputMedia = {
      _: 'inputMediaDocument',
      id: {_: 'inputDocument', id: document.id, access_hash: document.access_hash, file_reference: document.file_reference}
    };
    MessagesApiManager.sendMedia(MessagesController.dialog.peer, inputMedia);
  }

  async onFileSend(file, sendAsMedia = false) {
    const peer = MessagesController.dialog.peer;
    const pendingMessageEl = MessagesController.appendPendingMessage(el);
    const onProgress = (uploaded) => {
      pendingMessageEl.innerHTML = `
        <b>${encodeHtmlEntities(file.name)}</b> ${ChatInfoController.getFileSizeFormatted(file.size)}
        <div>uploaded ${ Math.round(uploaded / file.size * 100) }%</div>
      `;
    };

    onProgress(0);

    const inputFile = await FileApiManager.uploadFile(file, file.name, {onProgress});
    let inputMedia;
    if (sendAsMedia && file.type.startsWith('image/')) {
      inputMedia = {_: 'inputMediaUploadedPhoto', file: inputFile};
    } else {
      inputMedia = {
        _: 'inputMediaUploadedDocument',
        file: inputFile,
        mime_type: file.type,
        attributes: [
          {_: 'documentAttributeFilename', file_name: file.name}
        ]
      };
    }
    MessagesController.removePendingMessage(pendingMessageEl);
    MessagesApiManager.sendMedia(peer, inputMedia);
  }

  buildFileUploadPendingMessageContent(title, size) {
    const el = buildHtmlElement(`
      <div class="file_upload_progress_item">
        <div class="file_upload_progress_item_icon">
          <svg class="file_upload_progress_item_icon_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <path class="messages_item_media_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
        </div>
        <div class="file_upload_progress_item_title">${encodeHtmlEntities(title)}</div>
        <div class="file_upload_progress_item_size">${ChatInfoController.getFileSizeFormatted(size)}</div>
      </div>
    `);
    return el;
  }
};

window.MessagesFormController = MessagesFormController;

export {MessagesFormController};
