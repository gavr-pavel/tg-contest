import {$, buildHtmlElement, encodeHtmlEntities, getLabeledElements} from "./utils";
import {MDCCheckbox} from '@material/checkbox';
import {MDCMenu} from "@material/menu";
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
      },
      scrollTop: {
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
      <div class="sidebar_header">
        <button type="button" class="sidebar_close_button mdc-icon-button"></button>
        <div class="sidebar_header_title">Info</div>
        <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>
          <div class="sidebar_extra_menu_list mdc-menu mdc-menu-surface">
            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
              <li class="mdc-list-item" role="menuitem">
                <span class="mdc-list-item__text">Something</span>
              </li>
            </ul>
          </div>
      </div>
      <div class="sidebar_user_info">
        <div class="sidebar_user_photo"></div>
        <div class="sidebar_user_name">${encodeHtmlEntities(peerName)}</div>
        <div class="sidebar_user_desc">${encodeHtmlEntities(peerDesc)}</div>
      </div>
      <div class="chat_info_desc"></div>
      <div class="nav_tabs_container nav_tabs_container__shared">
        <div class="nav_tabs_item" data-js-label="nav_media">
          <div class="nav_tabs_item_label">Media</div>
        </div>
        <div class="nav_tabs_item" data-js-label="nav_docs">
          <div class="nav_tabs_item_label">Docs</div>
        </div>
        <div class="nav_tabs_item" data-js-label="nav_links">
          <div class="nav_tabs_item_label">Links</div>
        </div>
        <div class="nav_tabs_item" data-js-label="nav_audio">
          <div class="nav_tabs_item_label">Audio</div>
        </div>
      </div>
      <div class="chat_info_shared_wrap">
        <div class="chat_info_shared chat_info_shared_media"></div>
        <div class="chat_info_shared chat_info_shared_docs" hidden></div>
        <div class="chat_info_shared chat_info_shared_links" hidden></div>
        <div class="chat_info_shared chat_info_shared_audio" hidden></div>
      </div>
    `;

    this.renderPeerPhoto(peer);
    this.bindListeners();

    this.loadPeerFullInfo(peerData).then((peerInfo) => {
      this.renderDesc(peerData, peerInfo);
    });
  };

  bindListeners() {
    this.sharedScrollEl = $('.chat_info_shared_wrap');

    const closeButtonEl = $('.sidebar_close_button', this.container);
    closeButtonEl.addEventListener('click', this.close);
    new MDCRipple(closeButtonEl).unbounded = true;

    document.addEventListener('keyup', this.onKeyUp);

    const extraMenuButtonEl = $('.sidebar_extra_menu_button', this.container);
    extraMenuButtonEl.addEventListener('click', this.onExtraMenuClick);
    new MDCRipple(extraMenuButtonEl).unbounded = true;

    this.sharedScrollEl.addEventListener('scroll', this.onSharedScroll);

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
    const notificationsEnabled = !peerInfo.notify_settings.flags;
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
        <div class="chat_info_desc_icon chat_info_desc_icon__${field}"></div>
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
    console.log(`loading ${type}`);

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
    console.log(res);

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
    }
  }

  renderSharedMedia(messages) {
    const frag = document.createDocumentFragment();
    messages.forEach((message) => {
      const thumbEl = buildHtmlElement(`
        <div class="chat_info_shared_media_item" data-message-id="${message.id}"></div>
      `);
      thumbEl.addEventListener('click', MessagesController.onThumbClick);

      frag.append(thumbEl);

      this.loadMediaThumb(message, thumbEl);
    });

    $('.chat_info_shared_media').append(frag);
  }

  renderSharedDocs(messages) {
    const frag = document.createDocumentFragment();
    messages.forEach((message) => {
      const attrs = MediaApiManager.getDocumentAttributes(message.media.document);
      const fileName = attrs.file_name;
      const type = MediaApiManager.getFileExtension(message.media.document.mime_type);
      const size = MediaApiManager.getFormatFileSize(+message.media.document.size);

      const dateTime = MessagesController.formatMessageDateTime(message.date);

      const docEl = buildHtmlElement(`
        <div class="chat_info_shared_docs_item" data-message-id="${ message.id }">
          <div class="chat_info_shared_docs_item_icon">${ type }</div>
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
    });

    $('.chat_info_shared_docs').append(frag);
  }

  async loadMediaThumb(message, thumbEl) {
    const thumb = MessagesController.getMessageMediaThumb(message.media);
    const photoSize = MediaApiManager.choosePhotoSize(thumb.sizes, 'm');

    const url = await FileApiManager.loadMessagePhoto(thumb.object, photoSize.type, {cache: true});

    thumbEl.style.backgroundImage = `url(${url})`;
  }

  async loadDocThumb(doc, thumbEl) {
    const url = await FileApiManager.loadMessageDocumentThumb(doc, doc.type, {cache: true});

    thumbEl.classList.add('chat_info_shared_docs_item_icon__thumb');
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
      this.sharedLoading.scrollTop[sectionPrev] = this.sharedScrollEl.scrollTop;
      $(`.chat_info_shared_${sectionPrev}`).hidden = true;
      $(`.chat_info_shared_${sectionNew}`).hidden = false;
    }

    this.sharedSection = sectionNew;
    this.sharedTabsDom[`nav_${sectionNew}`].classList.add('nav_tabs_item-active');
    this.sharedScrollEl.scrollTop = this.sharedLoading.scrollTop[sectionNew];

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

  onExtraMenuClick = () => {
    const menuEl = $('.sidebar_extra_menu_list', this.container);
    const menu = new MDCMenu(menuEl);

    if (!menu.open) {
      menu.open = true;
      menu.setAbsolutePosition(239, 57);
    }
  };

  onSharedScroll = () => {
    const scrollContainer = this.sharedScrollEl;
    const scrollFine = scrollContainer.scrollTop + scrollContainer.offsetHeight > scrollContainer.scrollHeight - 150;

    if (!this.sharedLoading.loading[this.sharedSection] && !this.sharedLoading.noMore[this.sharedSection] && scrollFine) {
      this.sharedLoading.loading[this.sharedSection] = true;
      this.loadMoreShared();
    }
  };

  onSharedTabClick = (event) => {
    const section = event.currentTarget.dataset.jsLabel.replace(/^nav_/, '');
    this.setSharedSection(section);
  };
};

window.ChatInfoController = ChatInfoController;

export {ChatInfoController};
