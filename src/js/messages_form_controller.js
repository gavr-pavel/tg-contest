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

  focus() {
    this.dom.input.focus();
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

    const abortController = new AbortController();

    const progressEl = this.buildFileUploadProgressElement(file.name, file.size);
    const pendingMessageEl = MessagesController.appendPendingMessage(progressEl);

    $('.document_icon', progressEl).addEventListener('click', () => {
      abortController.abort();
      MessagesController.removePendingMessage(pendingMessageEl);
    });

    const onProgress = (uploaded) => {
      const percent = Math.round(uploaded / file.size * 100);
      $('.document_size_percent', progressEl).innerText = `${percent}%`;
      $('.document_icon_progress_path', progressEl).style.strokeDasharray = `${percent}, 100`;
    };

    const inputFile = await FileApiManager.uploadFile(file, file.name, {onProgress, signal: abortController.signal});
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

    await MessagesApiManager.sendMedia(peer, inputMedia);
    MessagesController.removePendingMessage(pendingMessageEl);
  }

  buildFileUploadProgressElement(title, size) {
    return buildHtmlElement(`
      <div class="document">
        <div class="document_col">
          <div class="document_icon document_icon-loading">
            <svg class="document_icon_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <path class="document_icon_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
          </div>
        </div>
        <div class="document_col">
          <div class="document_filename">${encodeHtmlEntities(title)}</div>
          <div class="document_size"><span class="document_size_percent">0%</span> &middot; ${ChatInfoController.getFileSizeFormatted(size)}</div>        
        </div>
      </div>
    `);
  }
};

window.MessagesFormController = MessagesFormController;

export {MessagesFormController};
