import {FileApiManager} from './api/file_api_manager.js';
import {getLabeledElements, $, Tpl, getEventPageXY, downloadFile, buildLoaderElement, buildMenu} from './utils';
import {MediaApiManager} from './api/media_api_manager';

import '../css/media_view.scss';

const MediaViewController = new class {
  constructor() {
    this.container = Tpl.html`
      <div class="media_view" hidden>
        <div class="media_view_header" data-js-label="header">
          <button class="mdc-icon-button media_view_mobile_close_button"  data-js-label="button_close_mobile"></button>
          <div class="media_view_author" data-js-label="header_author"></div>
          <div class="media_view_actions"  data-js-label="header_actions">
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-delete" data-js-label="button_delete"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-forward" data-js-label="button_forward"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-download" data-js-label="button_download"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-close" data-js-label="button_close"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-more" data-js-label="button_more"></button>
          </div>
        </div>
        <div class="media_view_content" data-js-label="content"></div>
        <div class="media_view_nav_left" hidden data-js-label="nav_left"></div>
        <div class="media_view_nav_right" hidden data-js-label="nav_right"></div>
        <div class="media_view_caption" data-js-label="caption"></div>
      </div>
    `.buildElement();

    this.dom = getLabeledElements(this.container);

    this.dom.button_download.addEventListener('click', this.download);
    this.dom.button_close.addEventListener('click', this.close);
    this.dom.button_close_mobile.addEventListener('click', this.close);
    this.dom.button_more.addEventListener('click', this.onMoreClick);
    this.dom.content.addEventListener('click', this.onContentClick);
    this.dom.content.addEventListener('touchstart', this.onContentTouchStart);
    this.dom.nav_left.addEventListener('click', this.onNavClick);
    this.dom.nav_right.addEventListener('click', this.onNavClick);

    document.body.appendChild(this.container);
  }

  choosePhotoSize(sizes) {
    const types = ['x'];
    if (window.innerWidth >= 800) {
      types.unshift('y');
    }
    if (window.innerWidth >= 812800) {
      types.unshift('w');
    }
    return MediaApiManager.choosePhotoSize(sizes, ...types) || sizes.splice(-1)[0];
  }

  showPhoto(photo, thumb, message) {
    const photoSize = this.choosePhotoSize(photo.sizes);

    const state = this.initLoading(photo, thumb, message, photoSize.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;

    FileApiManager.loadPhoto(photo, photoSize.type, {onProgress, signal: abortController.signal})
        .then(url => {
          const content = `<img class="media_view_content_image" src="${url}">`;
          this.onLoaded(url, content, state);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.log(err);
          }
        });

    this.initMediaPlaylist(message);
  }

  showGif(document, thumb, message) {
    const state = this.initLoading(document, thumb, message, document.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;

    FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
        .then(url => {
          const content = `<video class="media_view_content_gif" src="${url}" playsinline autoplay loop></video>`;
          this.onLoaded(url, content, state);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.log(err);
          }
        });

    this.initGifPlaylist(message);
  }

  showVideo(document, thumb, message) {
    const state = this.initLoading(document, thumb, message, document.size);
    const abortController = this.state.abortController;
    const onProgress = this.state.onProgress;
    const attributes = MediaApiManager.getDocumentAttributes(document);
    const streaming = !!attributes.supports_streaming;
    const loop = attributes.duration < 30;

    if (streaming && App.isServiceWorkerActived()) {
      const url = `/document${message.id}_${document.id}_${document.size}.mp4`;
      const content = `<video class="media_view_content_video" src="${url}" playsinline autoplay controls ${loop ? 'loop' : ''}></video>`;
      this.onLoaded(url, content, state);
    } else if (streaming && window.MediaSource && document.size > 1024 * 1024) {
      import('./video_streaming_process.js')
          .then(({VideoStreamingProcess}) => {
            const process = new VideoStreamingProcess(document, onProgress);
            this.state.streamingProcess = process;
            return process.load();
          })
          .then((video) => {
            if (state !== this.state) {
              return;
            }
            video.classList.add('media_view_content_video');
            video.playsinline = true;
            video.autoplay = true;
            video.controls = true;
            video.loop = loop;
            video.play();
            this.onLoaded(video.src, video, state);
          });
    } else {
      FileApiManager.loadDocument(document, {onProgress, signal: abortController.signal})
          .then(url => {
            const content = `<video class="media_view_content_video" src="${url}" playsinline autoplay controls ${loop ? 'loop' : ''}></video>`;
            this.onLoaded(url, content, state);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.log(err);
            }
          });
    }

    this.initMediaPlaylist(message);
  }

  initLoading(object, thumb, message, totalSize) {
    this.abort();

    const state = {
      object,
      message,
      abortController: new AbortController(),
    };

    if (thumb) {
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
        const percent = Math.max(0, Math.min(1, loaded / totalSize));
        if (percent === 1) {
          state.onDone();
        } else {
          path.style.setProperty('--progress-value', percent);
        }
      };

      state.abortController.signal.addEventListener('abort', state.onDone);
    }

    buildLoaderElement(this.dom.content, 'white');
    this.dom.caption.innerHTML = state.message.message ? Tpl.html`<div class="media_view_caption_text">${state.message.message}</div>` : '';
    this.renderAuthor(state);

    this.state = state;
    return state;
  }

  onLoaded(url, content, state) {
    if (state !== this.state) {
      return;
    }

    if (typeof content === 'string') {
      this.dom.content.innerHTML = content;
    } else {
      this.dom.content.innerHTML = '';
      this.dom.content.appendChild(content);
    }

    this.state.url = url;
    if (this.state.onDone) {
      this.state.onDone();
    }

    this.container.hidden = false;
    document.addEventListener('keyup', this.onKeyUp);
  }

  async initMediaPlaylist(message) {
    this.loadPlaylist(message, {_: 'inputMessagesFilterPhotoVideo'});
  }

  async initGifPlaylist(message) {
    this.loadPlaylist(message, {_: 'inputMessagesFilterGif'});
  }

  async loadPlaylist(message, filter) {
    const state = this.state;
    const peer = MessagesApiManager.getMessageDialogPeer(message);
    const {messages, users, chats} = await ApiClient.callMethod('messages.search', {
      peer: MessagesApiManager.getInputPeer(peer),
      offset_id: message.id,
      add_offset: -20,
      limit: 40,
      filter
    });
    if (state !== this.state) {
      return;
    }
    MessagesApiManager.updateUsers(users);
    MessagesApiManager.updateChats(chats);
    state.playlist = messages;

    const curIndex = messages.findIndex(m => message.id === m.id);
    this.dom.nav_left.hidden = curIndex <= 0;
    this.dom.nav_right.hidden = curIndex >= messages.length - 1;

    try {
      this.preloadNext(curIndex + 1);
    } catch (e) {
      console.log(e);
    }

    return messages;
  }

  onNav(direction) {
    const playlist = this.state.playlist;
    if (!playlist) {
      return;
    }
    const curMessage = this.state.message;
    const curIndex = playlist.findIndex(message => message.id === curMessage.id);

    let message;
    let mediaData;
    let nextIndex;
    for (let i = curIndex + direction; i >= 0 && i < playlist.length; i += direction) {
      mediaData = MessagesController.getMessageMediaThumb(playlist[i]);
      if (mediaData) {
        nextIndex = i;
        message = playlist[i];
        break;
      }
    }

    this.dom.nav_left.hidden = nextIndex <= 0;
    this.dom.nav_right.hidden = nextIndex >= playlist.length - 1;

    try {
      this.preloadNext(nextIndex + direction);
    } catch (e) {
      console.log(e);
    }

    if (mediaData) {
      this.destroyContent();
      if (mediaData.type === 'photo') {
        MediaViewController.showPhoto(mediaData.object, null, message);
      } else if (mediaData.type === 'video') {
        MediaViewController.showVideo(mediaData.object, null, message);
      } else if (mediaData.type === 'gif') {
        MediaViewController.showGif(mediaData.object, null, message);
      }
    }
  }

  preloadNext(index) {
    const playlist = this.state.playlist;
    if (!playlist) {
      return;
    }
    if (index >= 0 && index < playlist.length) {
      const mediaData = MessagesController.getMessageMediaThumb(playlist[index]);
      if (mediaData) {
        if (mediaData.type === 'photo') {
          const photo = mediaData.object;
          const photoSize = this.choosePhotoSize(photo.sizes);
          FileApiManager.loadPhoto(photo, photoSize.type);
        } else if (mediaData.type === 'gif') {
          const document = mediaData.object;
          FileApiManager.loadDocument(document);
        }
      }
    }
  }

  renderAuthor(state) {
    const message = state.message;

    let peer;
    let date;
    if (message.fwd_from) {
      const fwd = message.fwd_from;
      peer = MessagesApiManager.getPeerById(fwd.from_id || fwd.channel_id);
      date = fwd.date;
    } else {
      peer = MessagesApiManager.getMessageAuthorPeer(message);
      date = message.date;
    }
    const peerId = MessagesApiManager.getPeerId(peer);

    if (+this.dom.header_author.dataset.peerId === peerId) {
      $('.media_view_author_description', this.dom.header_author).innerHTML = Tpl.html`
        <div class="media_view_author_name">${MessagesApiManager.getPeerName(peer)}</div>
        <div class="media_view_author_date">${MessagesController.formatMessageDateTime(date)}</div>
      `;
    } else {
      this.dom.header_author.dataset.peerId = peerId;
      this.dom.header_author.innerHTML = Tpl.html`
      <div class="media_view_author_photo"></div>
      <div class="media_view_author_description">
        <div class="media_view_author_name">${MessagesApiManager.getPeerName(peer)}</div>
        <div class="media_view_author_date">${MessagesController.formatMessageDateTime(date)}</div>
      </div>
    `;
      const photoEl = $('.media_view_author_photo', this.dom.header_author);
      ChatsController.loadPeerPhoto(photoEl, peer);
    }

    this.dom.header_author.onclick = () => {
      this.close();
      let messageId;
      if (message.fwd_from) {
        messageId = message.fwd_from.channel_post || 0;
      } else {
        messageId = message.id;
      }
      MessagesController.setChatByPeerId(peerId, messageId);
    }
  }

  abort() {
    if (this.state) {
      if (this.state.streamingProcess) {
        this.state.streamingProcess.stop();
      }
      if (this.state.abortController) {
        this.state.abortController.abort();
      }
    }
    this.state = null;
  }

  isOpen() {
    return !this.container.hidden;
  }

  destroyContent() {
    this.abort();
    const video = $('video', this.dom.content);
    if (video) {
      video.pause();
    }
    this.dom.content.innerHTML = '';
  }

  close = () => {
    if (this.state) {
      this.destroyContent();
    }
    this.playlist = null;
    this.container.hidden = true;
    document.removeEventListener('keyup', this.onKeyUp);
  };

  onKeyUp = (event) => {
    switch (event.keyCode) {
      case 39:
        this.onNav(1);
        break;
      case 37:
        this.onNav(-1);
        break;
      case 27:
        this.close();
        break;
    }
  };

  download = () => {
    if (this.state.url) {
      downloadFile(this.state.url, this.getDownloadFilename(this.state.object));
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

  onContentClick = (event) => {
    const target = event.target;
    if (target === event.currentTarget) {
      this.close();
    }
  };

  onContentTouchStart = (event) => {
    event.preventDefault();
    let {pageY: startY} = getEventPageXY(event);
    let progress = 1;
    let translateY = 0;
    let scale = 1;
    const onTouchMove = (event) => {
      const {pageY} = getEventPageXY(event);
      translateY = pageY - startY;
      progress = 1 - Math.min(1, Math.pow(Math.abs(translateY), 2) / 10000);
      scale = 1 - (.3 - .3*progress);
      this.dom.content.style.transform = `translateY(${translateY}px) scale(${scale})`;
      this.container.style.backgroundColor = `rgba(0, 0, 0, ${ progress })`;
      this.dom.header.style.opacity = 0.5 * progress;
      this.dom.caption.style.opacity = 0.5 * progress;
      this.dom.nav_left.style.opacity = 0.5 * progress;
      this.dom.nav_right.style.opacity = 0.5 * progress;
    };
    const onTouchEnd = () => {
      if (progress === 1) {
        // const target = event.target;
        // if (target.tagName === 'VIDEO') {
        //   target.paused ? target.play() : target.pause();
        // }
        onCloseAnimationEnd();
      } else if (progress === 0) {
        this.dom.content.style.transition = '';
        this.dom.content.style.transform = `translateY(${translateY * 5}px) scale(${scale})`;
        setTimeout(() => {
          onCloseAnimationEnd();
          this.close();
        }, 200);
      } else {
        onCloseAnimationEnd();
      }
      this.dom.content.removeEventListener('touchmove', onTouchMove);
      this.dom.content.removeEventListener('touchend', onTouchEnd);
    };
    const onCloseAnimationEnd = () => {
      this.dom.content.style.transition = '';
      this.dom.content.style.transform = '';
      this.container.style.backgroundColor = '';
      this.dom.header.style.opacity = '';
      this.dom.caption.style.opacity = '';
      this.dom.nav_left.style.opacity = '';
      this.dom.nav_right.style.opacity = '';
    };
    this.dom.content.addEventListener('touchmove', onTouchMove);
    this.dom.content.addEventListener('touchend', onTouchEnd);
    this.dom.content.style.transition = 'none';
  };

  onNavClick = (event) => {
    const direction = event.target === this.dom.nav_left ? -1 : 1;
    this.onNav(direction);
  };

  onMoreClick = () => {
    const button = this.dom.button_more;

    if (this.moreMenu && this.moreMenu.open) {
      this.moreMenu = null;
      return;
    }

    const menu = buildMenu([
      ['forward', 'Forward'],
      ['download', 'Download'],
      ['delete', 'Delete']
    ], {
      button: button,
      container: button.parentNode,
      menuClass: 'media_view_actions_menu',
      itemClass: 'media_view_actions_menu_item',
      itemCallback: (action) => {
        switch (action) {
          case 'download':
            this.download();
            break;
        }
      }
    });

    menu.setAnchorElement(button);
    menu.setAnchorMargin({top: 40, right: 5});

    menu.open = true;

    this.moreMenu = menu;
  }
};

window.MediaViewController = MediaViewController;

export {MediaViewController};
