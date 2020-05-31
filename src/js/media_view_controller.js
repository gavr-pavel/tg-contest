import {FileApiManager} from './api/file_api_manager.js';
import {getLabeledElements, $, Tpl} from './utils';
import {MediaApiManager} from './api/media_api_manager';

const MediaViewController = new class {
  constructor() {
    this.container = Tpl.html`
      <div class="media_view" hidden>
        <div class="media_view_author"  data-js-label="author"></div>
        <div class="media_view_controls">
          <button class="media_view_controls_item media_view_controls_item-delete" data-js-label="button_delete"></button>
          <button class="media_view_controls_item media_view_controls_item-forward" data-js-label="button_forward"></button>
          <button class="media_view_controls_item media_view_controls_item-download" data-js-label="button_download"></button>
          <button class="media_view_controls_item media_view_controls_item-close" data-js-label="button_close"></button>
        </div>
        <div class="media_view_content" data-js-label="content"></div>
      </div>
    `.buildElement();

    this.dom = getLabeledElements(this.container);

    this.dom.button_download.addEventListener('click', this.download);
    this.dom.button_close.addEventListener('click', this.close);
    this.dom.content.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        this.close();
      }
    });

    document.body.appendChild(this.container);
  }

  showPhoto(photo, thumb, message) {
    const photoSize = photo.sizes[photo.sizes.length - 1];

    const state = this.initLoading(photo, thumb, message, photoSize.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;

    FileApiManager.loadPhoto(photo, photoSize.type, {onProgress, signal: abortController.signal})
        .then(url => {
          const content = `<img class="media_view_content_image" src="${url}">`;
          this.onLoaded(url, content, state);
        })
        .catch((err) => {
          console.log(err);
        });
  }

  showGif(document, thumb, message) {
    const state = this.initLoading(document, thumb, message, document.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;

    FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
        .then(url => {
          const content = `<video class="media_view_content_gif" src="${url}" autoplay loop></video>`;
          this.onLoaded(url, content, state);
        })
        .catch((err) => {
          console.log(err);
        });
  }

  showVideo(document, thumb, message) {
    const state = this.initLoading(document, thumb, message, document.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;

    FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
        .then(url => {
          const content = `<video class="media_view_content_video" src="${url}" autoplay controls></video>`;
          this.onLoaded(url, content, state);
        })
        .catch((err) => {
          console.log(err);
        });
  }

  initLoading(object, thumb, message, totalSize) {
    this.abort();

    const state = {
      object,
      message,
      abortController: new AbortController(),
    };

    const progress = Tpl.html`
      <div class="message_media_progress">
        <svg class="message_media_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path class="message_media_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
      </div>
    `.buildElement();
    const path = $('.message_media_progress_path', progress);
    progress.addEventListener('click', (event) => {
      event.stopPropagation();
      state.aborted = true;
      state.abortController.abort();
    });
    thumb.appendChild(progress);
    thumb.classList.add('message_media_thumb-loading');

    state.onDone = () => {
      progress.remove();
      thumb.classList.remove('message_media_thumb-loading');
      if (state.aborted) {
        this.state = null;
      }
    };

    state.onProgress = (loaded) => {
      const percent = Math.round(Math.max(0, Math.min(1, loaded / totalSize)) * 100);
      if (percent === 100) {
        state.onDone();
      } else {
        path.style.strokeDasharray = `${percent}, 100`;
      }
    };

    state.abortController.signal.addEventListener('abort', state.onDone);

    this.state = state;
    return state;
  }

  onLoaded(url, content, state) {
    if (state !== this.state) {
      return;
    }

    this.dom.content.innerHTML = content;
    this.renderAuthor();

    this.state.url = url;
    this.state.onDone();

    this.container.hidden = false;
    document.addEventListener('keyup', this.onKeyUp);
  }

  renderAuthor() {
    const message = this.state.message;
    const peer = MessagesApiManager.getMessageAuthorPeer(message);

    this.dom.author.innerHTML = Tpl.html`
      <div class="media_view_author_photo"></div>
      <div class="media_view_author_description">
        <div class="media_view_author_name">${MessagesApiManager.getPeerName(peer)}</div>
        <div class="media_view_author_date">${MessagesController.formatMessageDateTime(message.date)}</div>
      </div>
    `;

    const photoEl = $('.media_view_author_photo', this.dom.author);

    ChatsController.loadPeerPhoto(photoEl, peer);
  }

  abort() {
    if (this.state && this.state.abortController) {
      this.state.abortController.abort();
    }
    this.state = null;
  }

  isOpen() {
    return !this.container.hidden;
  }

  close = () => {
    this.state = null;
    this.dom.author.innerHTML = '';
    this.dom.content.innerHTML = '';
    this.container.hidden = true;
    document.removeEventListener('keyup', this.onKeyUp);
  };

  onKeyUp = (event) => {
    if (event.keyCode === 27) {
      this.close();
    }
  };

  download = () => {
    if (this.state.url) {
      const a = document.createElement('a');
      a.href = this.state.url;
      a.download = this.getDownloadFilename(this.state.object);
      a.click();
    }
  };

  getDownloadFilename(object) {
    if (object._ === 'document') {
      const attributes = MediaApiManager.getDocumentAttributes(object);
      if (attributes.file_name) {
        return attributes.file_name;
      }
    }
    return object._ + object.id;
  }
};

window.MediaViewController = MediaViewController;

export {MediaViewController};
