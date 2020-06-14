import {
  $,
  Tpl,
  debounce,
  getLabeledElements,
  formatFileSize,
  attachRipple,
  isTouchDevice,
  loadScript,
  initAnimation
} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {FileUploadPopup} from './file_upload_popup';

const MessagesFormController = new class {
  init() {
    this.container = $('.messages_form');
    this.container.innerHTML = `
      <div class="messages_form_input_wrap">
        <textarea class="messages_form_input" placeholder="Message" data-js-label="input"></textarea>
        <button class="messages_form_emoji_button" data-js-label="emoji_button"></button>
        <button class="messages_form_media_button" data-js-label="media_button"></button>
      </div>
      <button class="messages_form_cancel_button mdc-icon-button" data-js-label="cancel_button" hidden></button>
      <button class="messages_form_submit_button mdc-icon-button" data-js-label="submit_button"></button>
    `;

    this.dom = getLabeledElements(this.container);

    this.saveDraft = debounce((peer, message) => {
      MessagesApiManager.saveDraft(peer, message);
    });

    const input = this.dom.input;
    const button = this.dom.submit_button;

    input.addEventListener('input', this.onInput);
    input.addEventListener('change', this.onInput);
    input.addEventListener('keydown', this.onKeyDown);
    button.addEventListener('click', this.onSubmit);
    button.addEventListener((isTouchDevice() ? 'touchstart' : 'mousedown'), this.onSubmitMouseDown);

    attachRipple(button);

    FileUploadPopup.init();
    FileUploadPopup.bind(this.dom.media_button);
  }

  onShown() {
    if (!this.emojiInited) {
      this.emojiInited = true;
      import('./emoji_dropdown.js')
          .then(({EmojiDropdown}) => {
            EmojiDropdown.init();
            EmojiDropdown.bind(this.dom.emoji_button, this.dom.input);
            this.dom.input.parentNode.appendChild(EmojiDropdown.container);
          });
    }

    if (!isTouchDevice()) {
      this.focus();
    }
  }

  focus() {
    this.dom.input.focus();
  }

  clear() {
    if (this.dom.input.value) {
      this.dom.input.value = '';
      this.onInput();
    }
  }

  onInput = () => {
    const input = this.dom.input;
    input.style.height = '';
    input.style.height = input.scrollHeight + 'px';

    const message = input.value.trim();
    this.dom.submit_button.classList.toggle('messages_form_submit_button-send', !!message);

    this.saveDraft(MessagesController.dialog.peer, message);
  };

  onSubmit = () => {
    const input = this.dom.input;
    const message = input.value.trim();
    if (!message) {
      return;
    }
    MessagesApiManager.sendMessage(MessagesController.dialog.peer, message);
    this.clear();
  };

  onSubmitMouseDown = () => {
    const submitButton = this.dom.submit_button;
    const cancelButton = this.dom.cancel_button;
    if (submitButton.classList.contains('messages_form_submit_button-send')) {
      return;
    }
    submitButton.classList.add('messages_form_submit_button-send');
    cancelButton.hidden = false;

    document.addEventListener((isTouchDevice() ? 'touchend' : 'mouseup'), stop);
    document.addEventListener((isTouchDevice() ? 'touchmove' : 'mousemove'), move);

    function move(event) {
      cancelButton.classList.toggle('messages_form_cancel_button-active', event.target === cancelButton);
    }

    function stop(event) {
      console.log('stop', event.target);
      if (event.target === cancelButton) {
        cancelled = true;
      }
      recorder && recorder.stop();
      submitButton.classList.remove('messages_form_submit_button-send');
      cancelButton.hidden = true;
      document.removeEventListener((isTouchDevice() ? 'touchend' : 'mouseup'), stop);
      document.removeEventListener((isTouchDevice() ? 'touchmove' : 'mousemove'), move);
    }

    let recorder;
    let cancelled = false;

    this.initRecorder().then((r) => {
      if (cancelled) {
        return;
      }
      recorder = r;
      recorder.addEventListener('start', () => {
        startAnimation();
      });
      recorder.addEventListener('stop', () => {
        stopAnimation();
      });
      recorder.addEventListener('dataAvailable', (event) => {
        if (!cancelled) {
          const blob = new Blob([event.detail], {type: 'audio/ogg'});
          this.onVoiceSend(blob);
        }
      });
      recorder.start();
    });

    let animationHandle;
    function startAnimation() {
      const source = recorder.sourceNode;
      const context = source.context;
      const analyser = context.createAnalyser();
      source.connect(analyser);
      (function loop() {
        const array = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(array);
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
          const a = Math.abs(array[i] - 128);
          sum += a;
        }
        const avg = (sum / array.length);
        submitButton.style.setProperty('--highlight-radius', Math.round(50 + avg * 10) + 'px');
        animationHandle = requestAnimationFrame(loop);
      })();
    }

    function stopAnimation() {
      cancelAnimationFrame(animationHandle);
      submitButton.style.setProperty('--highlight-radius', 0);
    }
  };

  async initRecorder() {
    if (!window.Recorder) {
      await loadScript('./vendor/opus-recorder/recorder.min.js');
    }
    const recorder = new Recorder({
      encoderPath: './vendor/opus-recorder/encoder_worker.min.js'
    });

    return new Promise((resolve) => {
      recorder.addEventListener('streamReady', () => resolve(recorder));
      recorder.initStream();
    });
  }

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

  async onVoiceSend(blob) {
    const filename = 'voice.ogg';
    const inputFile = await FileApiManager.uploadFile(blob, filename);
    const inputMedia = {
      _: 'inputMediaUploadedDocument',
      file: inputFile,
      mime_type: 'audio/ogg',
      attributes: [
        {_: 'documentAttributeFilename', file_name: filename}
      ],
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

    try {
      await MessagesApiManager.sendMedia(peer, inputMedia);
    } catch (e) {
      console.error(e);
    }

    MessagesController.removePendingMessage(pendingMessageEl);
  }

  buildFileUploadProgressElement(title, size) {
    return Tpl.html`
      <div class="document">
        <div class="document_col">
          <div class="document_icon document_icon-loading">
            <svg class="document_icon_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <path class="document_icon_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
          </div>
        </div>
        <div class="document_col">
          <div class="document_filename">${title}</div>
          <div class="document_size"><span class="document_size_percent">0%</span> &middot; ${formatFileSize(size)}</div>        
        </div>
      </div>
    `.buildElement();
  }
};

window.MessagesFormController = MessagesFormController;

export {MessagesFormController};
