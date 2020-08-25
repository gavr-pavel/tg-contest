import {
  $,
  Tpl,
  debounce,
  getLabeledElements,
  formatFileSize,
  attachRipple,
  isTouchDevice,
  loadScript,
  formatDuration
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

  onSubmitMouseDown = (event) => {
    const submitButton = this.dom.submit_button;
    const cancelButton = this.dom.cancel_button;
    if (event.button || submitButton.classList.contains('messages_form_submit_button-send')) {
      return;
    }
    event.preventDefault();
    submitButton.classList.add('messages_form_submit_button-send');
    cancelButton.hidden = false;

    document.addEventListener((isTouchDevice() ? 'touchend' : 'mouseup'), stop);
    document.addEventListener((isTouchDevice() ? 'touchmove' : 'mousemove'), move);

    function move(event) {
      let target = event.target;
      if (event.type === 'touchmove') {
        const touch = event.changedTouches[0];
        target = document.elementFromPoint(touch.clientX, touch.clientY);
      }
      cancelButton.classList.toggle('messages_form_cancel_button-active', target === cancelButton);
    }

    function stop(event) {
      let target = event.target;
      if (event.type === 'touchend') {
        const touch = event.changedTouches[0];
        target = document.elementFromPoint(touch.clientX, touch.clientY);
      }
      if (!recorder || target === cancelButton) {
        cancelled = true;
      }
      recorder && recorder.stop();
      submitButton.classList.remove('messages_form_submit_button-send');
      cancelButton.classList.remove('messages_form_cancel_button-active');
      cancelButton.hidden = true;
      document.removeEventListener((isTouchDevice() ? 'touchend' : 'mouseup'), stop);
      document.removeEventListener((isTouchDevice() ? 'touchmove' : 'mousemove'), move);
    }

    let recorder;
    let cancelled = false;

    this.initRecorder()
        .then((r) => {
          if (cancelled) {
            stopAnimation();
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
        })
        .catch((e) => {
          stopAnimation();
          alert('error: ' + e.toString());
        });

    const timer = Tpl.html`<div class="messages_form_voice_timer"></div>`.buildElement();
    this.dom.input.after(timer);

    let animationHandle;
    let timerIntervalId;
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
      timerIntervalId = setInterval(() => {
        const duration = context.currentTime;
        timer.innerText = formatDuration(duration, 2);
      }, 50);
    }

    function stopAnimation() {
      cancelAnimationFrame(animationHandle);
      submitButton.style.setProperty('--highlight-radius', 0);
      clearInterval(timerIntervalId);
      timer.remove();
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
      recorder.addEventListener('streamError', () => reject(recorder));
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

  async onMediaSend(files, sendAsPhoto = false, caption = '') {
    const peer = MessagesController.dialog.peer;

    const abortController = new AbortController();

    const totalBytes = Array.from(files).reduce((sum, f) => sum + f.size, 0);
    let totalUploadedBytes = 0;

    const pendingMessageTitle = files.length > 1 ? `Uploading 1 file of ${files.length}` : files[0].name;
    const progressEl = this.buildFileUploadProgressElement(pendingMessageTitle, totalBytes);
    const pendingMessageEl = MessagesController.appendPendingMessage(progressEl);

    $('.document_icon', progressEl).addEventListener('click', () => {
      abortController.abort();
      MessagesController.removePendingMessage(pendingMessageEl);
    });

    const onProgress = (uploaded) => {
      const percent = (totalUploadedBytes + uploaded) / totalBytes;
      $('.document_size_percent', progressEl).innerText = `${Math.round(percent * 100)}%`;
      $('.document_icon_progress_path', progressEl).style.setProperty('--progress-value', percent);
    };

    const mediaList = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (i) {
        $('.document_filename', pendingMessageEl).innerText = `Uploading ${i+1} file of ${files.length}`;
      }

      const inputFile = await FileApiManager.uploadFile(file, file.name, {onProgress, signal: abortController.signal});
      let inputMedia;
      if (sendAsPhoto && file.type.startsWith('image/')) {
        const {photo} = await MessagesApiManager.uploadMedia(peer, {_: 'inputMediaUploadedPhoto', file: inputFile});
        mediaList.push({_: 'inputMediaPhoto', id: {_: 'inputPhoto', id: photo.id, access_hash: photo.access_hash, file_reference: photo.file_reference}});
      } else {
        const inputMedia ={
          _: 'inputMediaUploadedDocument',
          file: inputFile,
          mime_type: file.type,
          attributes: [
            {_: 'documentAttributeFilename', file_name: file.name}
          ]
        };
        MessagesApiManager.sendMedia(peer, inputMedia, caption);
      }
      totalUploadedBytes += file.size;
    }

    try {
      if (mediaList.length > 1) {
        await MessagesApiManager.sendMultiMedia(peer, mediaList, caption);
      } else if (mediaList.length) {
        await MessagesApiManager.sendMedia(peer, mediaList[0], caption);
      }
    } catch (e) {
      debugger;
      const errorText = 'An error occurred' + (e.error_message ? ': ' + e.error_message : '');
      App.alert(errorText);
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
