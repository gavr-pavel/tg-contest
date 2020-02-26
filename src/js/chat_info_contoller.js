import {$, buildHtmlElement, encodeHtmlEntities, getLabeledElements} from "./utils";
import {MDCCheckbox} from '@material/checkbox';
import {MessagesApiManager} from "./api/messages_api_manager";
import {ApiClient} from "./api/api_client";
import {MediaApiManager} from "./api/media_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";
import {MediaViewController} from "./media_view_controller";
import {MDCRipple} from '@material/ripple/component';

const ChatInfoController = new class {
  sharedSteps = {
    media: 30,
    docs: 15,
    links: 15,
    audio: 15,
  };

  show(peerId) {
    this.container = $('.right_sidebar');
    this.container.hidden = false;

    if (peerId === this.peerId) {
      return;
    }
    this.peerId = peerId;

    this.sharedSection = null;

    this.sharedLoading = {
      loading: {
        media: true,
        docs: false,
        links: false,
        audio: false,
      },
      noMore: {
        media: false,
        docs: false,
        links: false,
        audio: false,
      },
      offsetMsgId: {
        media: 0,
        docs: 0,
        links: 0,
        audio: 0,
      }
    };

    const peer = MessagesApiManager.getPeerById(peerId);
    const peerName = MessagesApiManager.getPeerName(peer);
    const peerData = MessagesApiManager.getPeerData(peer);

    let peerDesc = '';
    if (peerData._ === 'user') {
      peerDesc = MessagesController.getUserStatusText(peerData);
    }

    this.container.innerHTML = `
      <div class="right_sidebar_scroll_wrap">
        <div class="sidebar_header">
          <button type="button" class="sidebar_close_button mdc-icon-button"></button>
          <div class="sidebar_header_title">Info</div>
          <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>
        </div>
        <div class="sidebar_user_info">
          <div class="sidebar_user_photo"></div>
          <div class="sidebar_user_name">${encodeHtmlEntities(peerName)}</div>
          <div class="sidebar_user_desc">${encodeHtmlEntities(peerDesc)}</div>
        </div>
        <div class="chat_info_desc"></div>
        <div class="nav_tabs_container chat_info_shared_media_nav">
          <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_media">
            <div class="nav_tabs_item_label">Media</div>
          </div>
          <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_docs">
            <div class="nav_tabs_item_label">Docs</div>
          </div>
          <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_links">
            <div class="nav_tabs_item_label">Links</div>
          </div>
          <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_audio">
            <div class="nav_tabs_item_label">Audio</div>
          </div>
        </div>
        <div class="chat_info_shared_wrap">
          <div class="chat_info_shared chat_info_shared_media"></div>
          <div class="chat_info_shared chat_info_shared_docs" hidden></div>
          <div class="chat_info_shared chat_info_shared_links" hidden></div>
          <div class="chat_info_shared chat_info_shared_audio" hidden></div>
        </div>
      </div>
    `;

    this.scrollContainer = $('.right_sidebar_scroll_wrap', this.container);

    this.renderPeerPhoto(peer);
    this.bindListeners();

    this.loadPeerFullInfo(peerData).then((peerInfo) => {
      this.renderDesc(peerData, peerInfo);
    });
  };

  bindListeners() {
    const closeButtonEl = $('.sidebar_close_button', this.container);
    closeButtonEl.addEventListener('click', this.close);
    new MDCRipple(closeButtonEl).unbounded = true;

    document.addEventListener('keyup', this.onKeyUp);

    const extraMenuButtonEl = $('.sidebar_extra_menu_button', this.container);
    new MDCRipple(extraMenuButtonEl).unbounded = true;

    this.scrollContainer.addEventListener('scroll', this.onScroll);

    this.sharedTabsDom = getLabeledElements(this.container);
    for (let tabKey in this.sharedTabsDom) {
      this.sharedTabsDom[tabKey].addEventListener('click', this.onSharedTabClick);
    }
    this.setSharedSection('media');
  }

  getNotificationsCheckboxHtml() {
    return `
      <div class="mdc-form-field">
        <div class="mdc-checkbox">
          <input type="checkbox" class="mdc-checkbox__native-control" id="checkbox-notifications"/>
          <div class="mdc-checkbox__background">
            <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
            </svg>
            <div class="mdc-checkbox__mixedmark"></div>
          </div>
          <div class="mdc-checkbox__ripple"></div>
        </div>
      </div>
    `;
  }

  renderDesc(peerData, peerInfo) {
    const notificationsEnabled = !peerInfo.notify_settings.pFlags.mute_until;
    const descMap = {
      bio: peerInfo.about,
      username: peerData.username,
      phone: peerData.phone ? `+${peerData.phone}` : '',
    };

    let html = '';
    for (const field in descMap) {
      const value = descMap[field];
      if (!value) {
        continue;
      }

      html += `
      <div class="chat_info_desc_row">
        <div class="chat_info_desc_icon chat_info_desc_icon-${field}"></div>
        <div class="chat_info_desc_row_block">
          <div class="chat_info_desc_row_text">${encodeHtmlEntities(value)}</div>
          <div class="chat_info_desc_row_subtitle">${field}</div>
        </div>
      </div>
    `;
    }

    html += `
      <div class="chat_info_desc_row">
        <div class="chat_info_desc_checkbox">${this.getNotificationsCheckboxHtml()}</div>
        <label for="checkbox-notifications" class="chat_info_desc_row_block">
          <div class="chat_info_desc_row_text">Notifications</div>
          <div class="chat_info_desc_row_subtitle">${notificationsEnabled ? 'Enabled' : 'Disabled'}</div>
        </label>
      </div>
    `;

    $('.chat_info_desc').innerHTML = html;

    const checkbox = new MDCCheckbox(document.querySelector('.mdc-checkbox'));
    checkbox.checked = notificationsEnabled;
  }

  renderPeerPhoto(peer) {
    const photoEl = $('.sidebar_user_photo', this.container);
    ChatsController.loadPeerPhoto(photoEl, peer, true);
  }

  async loadPeerFullInfo(peerData) {
    if (peerData._ === 'user') {
      return await MessagesApiManager.loadUserFull(this.peerId);
    }
    return await MessagesApiManager.loadChatFull(this.peerId);
  }

  async loadMoreShared() {
    const type = this.sharedSection;
    // console.time(`loading shared ${type}`);
    let res;
    try {
      res = await ApiClient.callMethod('messages.search', {
        peer: MessagesApiManager.getInputPeerById(this.peerId),
        filter: MessagesApiManager.getInputMessagesFilter(type),
        limit: this.sharedSteps[type],
        offset_id: this.sharedLoading.offsetMsgId[type],
      });
    } finally {
      this.sharedLoading.loading[type] = false;
    }
    // console.timeEnd(`loading shared ${type}`);

    if (res.count < this.sharedSteps[type] || res.messages.length < this.sharedSteps[type]) {
      this.sharedLoading.noMore[type] = true;
      if (!res.messages.length) {
        return;
      }
    }

    const messages = res.messages;
    this.sharedLoading.offsetMsgId[type] = messages[messages.length - 1].id;
    MessagesApiManager.updateMessages(messages);

    switch (type) {
      case 'media':
        return this.renderSharedMedia(messages);
      case 'docs':
        return this.renderSharedDocs(messages);
      case 'links':
        return this.renderSharedLinks(messages);
    }
  }

  renderSharedMedia(messages) {
    const frag = document.createDocumentFragment();
    for (const message of messages) {
      const thumbEl = buildHtmlElement(`
        <div class="chat_info_shared_media_item" data-message-id="${message.id}"></div>
      `);
      thumbEl.addEventListener('click', MessagesController.onThumbClick);
      frag.append(thumbEl);
      this.loadMediaThumb(message, thumbEl);
    }
    $('.chat_info_shared_media').append(frag);
  }

  renderSharedDocs(messages) {
    const frag = document.createDocumentFragment();
    for (const message of messages) {
      const document = message.media.document;
      const attrs = MediaApiManager.getDocumentAttributes(document);
      const fileName = attrs.file_name;
      const type = this.getFileExtension(document.mime_type);
      const iconClass = this.getFileIconClass(type);
      const size = this.getFileSizeFormatted(document.size);
      const dateTime = MessagesController.formatMessageDateTime(message.date);

      const docEl = buildHtmlElement(`
        <div class="chat_info_shared_docs_item" data-message-id="${ message.id }">
          <div class="chat_info_shared_docs_item_icon${iconClass}">${ type }</div>
          <div class="chat_info_shared_docs_item_info">
            <div class="chat_info_shared_docs_item_name">${ encodeHtmlEntities(fileName) }</div>
            <div class="chat_info_shared_docs_item_desc">${ size } &middot; ${ dateTime }</div>
          </div>
        </div>
      `);
      docEl.addEventListener('click', MessagesController.onFileClick);
      frag.append(docEl);
      if (attrs.type === 'image') {
        this.loadDocThumb(message.media.document, $('.chat_info_shared_docs_item_icon', docEl));
      }
    }
    $('.chat_info_shared_docs').append(frag);
  }

  renderSharedLinks(messages) {
    const frag = document.createDocumentFragment();
    for (const message of messages) {
      const thumb = MessagesController.getMessageMediaThumb(message);
      const media = message.media;

      let title = '';
      let desc = '';
      let url = '';
      if (media && media.webpage && media.webpage._ !== 'webPageEmpty') {
        title = media.webpage.title || media.webpage.site_name || '';
        desc = media.webpage.description || '';
        url = media.webpage.url;
      }

      if (!url) {
        url = this.getUrlFromText(message);
        if (!url) {
          continue;
        }
      }

      const linkEl = buildHtmlElement(`
        <a class="chat_info_shared_link_item" data-message-id="${ message.id }" target="_blank" href="${ url }">
          <div class="chat_info_shared_link_item_image"></div>
          <div class="chat_info_shared_link_item_info">
            <div class="chat_info_shared_link_item_title">${ encodeHtmlEntities(title) }</div>
            <div class="chat_info_shared_link_item_desc">${ encodeHtmlEntities(desc) }</div>
            <div class="chat_info_shared_link_item_url">${ encodeHtmlEntities(url) }</div>
          </div>
        </a>
      `);
      frag.append(linkEl);

      if (thumb) {
        this.loadLinkThumb(thumb, $('.chat_info_shared_link_item_image', linkEl));
      }
    }
    $('.chat_info_shared_links').append(frag);
  }

  async loadMediaThumb(message, thumbEl) {
    const thumb = MessagesController.getMessageMediaThumb(message);
    const photoSize = MediaApiManager.choosePhotoSize(thumb.sizes, 'm');
    const url = await FileApiManager.loadMessagePhoto(thumb.object, photoSize.type);

    thumbEl.style.backgroundImage = `url(${url})`;
  }

  async loadDocThumb(document, thumbEl) {
    const photoSize = MediaApiManager.choosePhotoSize(document.thumbs, 'm');
    const url = await FileApiManager.loadMessageDocumentThumb(document, photoSize.type);

    thumbEl.classList.add('chat_info_shared_docs_item_icon-thumb');
    thumbEl.style.backgroundImage = `url(${url})`;
  }

  async loadLinkThumb(thumb, thumbEl) {
    const photoSize = MediaApiManager.choosePhotoSize(thumb.sizes, 'm');
    const url = await FileApiManager.loadMessagePhoto(thumb.object, photoSize.type);

    thumbEl.style.backgroundImage = `url(${url})`;
  }

  setSharedSection(sectionNew) {
    const sectionPrev = this.sharedSection;

    if (sectionPrev === sectionNew) {
      return;
    }
    if (sectionPrev) {
      this.sharedTabsDom[`nav_${sectionPrev}`].classList.remove('nav_tabs_item-active');
    }

    if (sectionPrev) {
      $(`.chat_info_shared_${sectionPrev}`).hidden = true;
      $(`.chat_info_shared_${sectionNew}`).hidden = false;
    }

    this.sharedSection = sectionNew;
    this.sharedTabsDom[`nav_${sectionNew}`].classList.add('nav_tabs_item-active');

    this.loadMoreShared();
  }

  close = () => {
    if (!this.container) {
      return;
    }
    this.container.hidden = true;
    this.peerId = null;
    document.removeEventListener('keyup', this.onKeyUp);
  };

  onKeyUp = (event) => {
    if (event.keyCode === 27 && !MediaViewController.isOpen()) {
      this.close();
    }
  };

  onScroll = () => {
    const scrollContainer = this.scrollContainer;
    const needMore = scrollContainer.scrollTop + scrollContainer.offsetHeight > scrollContainer.scrollHeight - 150;

    if (!this.sharedLoading.loading[this.sharedSection] && !this.sharedLoading.noMore[this.sharedSection] && needMore) {
      this.sharedLoading.loading[this.sharedSection] = true;
      this.loadMoreShared();
    }
  };

  onSharedTabClick = (event) => {
    const section = event.currentTarget.dataset.jsLabel.replace(/^nav_/, '');
    this.setSharedSection(section);
  };

  getFileIconClass(ext) {
    const start = ' chat_info_shared_docs_item_icon-';
    switch (ext) {
      case 'pdf':
        return `${start}pdf`;
      case 'doc':
      case 'docx':
      case 'xls':
      case 'xlsx':
      case 'ppt':
      case 'pptx':
      case 'odp':
      case 'ods':
      case 'odt':
      case 'rtf':
      case 'txt':
      case 'epub':
        return `${start}doc`;
      case 'zip':
      case '7z':
      case 'tar.gz':
        return `${start}zip`;
    }

    return '';
  }

  getFileExtension(mimeType) {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
      case 'video/mp4':
      case 'video/webm':
      case 'video/mov':
      case 'video/avi':
      case 'video/mkv':
      case 'application/pdf':
      case 'application/json':
      case 'application/zip':
      case 'text/csv':
      case 'text/html':
      case 'multipart/x-zip':
        return mimeType.split(/[.\-\/]/).pop();

      case 'image/vnd.microsoft.icon':
        return 'ico';
      case 'image/svg+xml':
        return 'svg';
      case 'image/tiff':
        return 'tiff';

      case 'audio/ogg':
        return 'ogg';
      case 'audio/wav':
        return 'wav';

      case 'video/x-ms-wmv':
        return 'wmv';
      case 'video/quicktime':
        return 'mov';

      case 'application/doc':
      case 'application/ms-doc':
      case 'application/msword':
        return 'doc';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'docx';
      case 'application/excel':
      case 'application/vnd.ms-excel':
      case 'application/x-excel':
      case 'application/x-msexcel':
        return 'xls';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'xlsx';
      case 'application/mspowerpoint':
      case 'application/powerpoint':
      case 'application/vnd.ms-powerpoint':
      case 'application/x-mspowerpoint':
        return 'ppt';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'pptx';
      case 'application/vnd.oasis.opendocument.presentation':
        return 'odp';
      case 'application/vnd.oasis.opendocument.spreadsheet':
        return 'ods';
      case 'application/vnd.oasis.opendocument.text':
        return 'odt';
      case 'text/rtf':
      case 'application/wps-office.doc':
        return 'rtf';
      case 'text/plain':
        return 'txt';
      case 'application/epub+zip':
        return 'epub';
      case 'application/x-compressed-tar':
        return 'tar.gz';
      case 'application/x-7z-compressed':
        return '7z';
    }
    return '';
  }

  getFileSizeFormatted(bytes) {
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
    return `${ (bytes / Math.pow(1024, i)).toFixed(1) } ${ ['B', 'KB', 'MB', 'GB', 'TB'][i] }`;
  }

  getUrlFromText(message) {
    for (const entity of message.entities) {
      if (entity._ === 'messageEntityUrl') {
        return message.message.substring(entity.offset, entity.offset + entity.length);
      }
    }
    return '';
  }
};

window.ChatInfoController = ChatInfoController;

export {ChatInfoController};
