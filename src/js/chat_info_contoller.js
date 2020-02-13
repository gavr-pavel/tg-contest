import {$, buildHtmlElement} from "./utils";
import {MDCCheckbox} from '@material/checkbox';
import {MDCMenu} from "@material/menu";
import {MessagesApiManager} from "./api/messages_api_manager";
import {ApiClient} from "./api/api_client";
import {MediaApiManager} from "./api/media_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";
import {MediaViewController} from "./media_view_controller";

const ChatInfoController = new class {
  mediaStep = 30;

  init(peerId) {
    this.container = $('.right_sidebar');
    this.container.hidden = !this.container.hidden;

    if (this.container.hidden) {
      return;
    }

    this.loadingMedia = true;
    this.noMoreMedia = false;
    this.offsetMsgId = 0;
    this.peerId = peerId;

    const peer = MessagesApiManager.getPeerById(peerId);
    const peerName = MessagesApiManager.getPeerName(peer);
    const peerData = MessagesApiManager.getPeerData(peer);

    let peerDesc = '';
    if (peerData._ === 'user') {
      peerDesc = peerData.status ? MessagesController.getUserStatus(peerData.status) : 'last seen a long time ago';
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
        <div class="sidebar_user_name">${peerName}</div>
        <div class="sidebar_user_desc">${peerDesc}</div>
      </div>
      <div class="chat_info_desc"></div>
      <div class="nav_tabs_container">
        <div class="nav_tabs_item nav_tabs_item-active">
          <div class="nav_tabs_item_label">Media</div>
        </div>
        <div class="nav_tabs_item">
          <div class="nav_tabs_item_label">Docs</div>
        </div>
        <div class="nav_tabs_item">
          <div class="nav_tabs_item_label">Links</div>
        </div>
        <div class="nav_tabs_item">
          <div class="nav_tabs_item_label">Audio</div>
        </div>
      </div>
      <div class="chat_info_media"></div>
    `;

    this.renderPeerPhoto(peer, peerData);
    this.bindListeners();

    this.loadPeerFullInfo(peerData).then((peerInfo) => {
      this.renderDesc(peerData, peerInfo);
    });

    this.loadMoreMedia();
  };

  bindListeners() {
    const closeButtonEl = $('.sidebar_close_button', this.container);
    closeButtonEl.addEventListener('click', this.onClose);
    document.addEventListener('keyup', this.onCloseByEsc);

    const extraMenuButtonEl = $('.sidebar_extra_menu_button', this.container);
    extraMenuButtonEl.addEventListener('click', this.onExtraMenuClick);

    $('.chat_info_media').addEventListener('scroll', this.onMediaScroll);
  }

  async loadPeerFullInfo (peerData) {
    if (peerData._ === 'user') {
      return await MessagesApiManager.loadUserFull(this.peerId);
    }

    return  await MessagesApiManager.loadChatFull(this.peerId);
  }

  getNotificationsCheckboxCode() {
    return `
      <div class="mdc-form-field">
        <div class="mdc-checkbox">
          <input type="checkbox"
                 class="mdc-checkbox__native-control"
                 id="checkbox-notifications"/>
          <div class="mdc-checkbox__background">
            <svg class="mdc-checkbox__checkmark"
                 viewBox="0 0 24 24">
              <path class="mdc-checkbox__checkmark-path"
                    fill="none"
                    d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
            </svg>
            <div class="mdc-checkbox__mixedmark"></div>
          </div>
          <div class="mdc-checkbox__ripple"></div>
        </div>
      </div>
    `;
  }

  async renderDesc(peerData, peerInfo) {
    const notificationsEnabled = !peerInfo.notify_settings.flags;
    const descMap = {
      bio: peerInfo.about,
      username: peerData.username,
      phone: peerData.phone ? `+${peerData.phone}` : '',
    };

    let html = '';
    for (let title in descMap) {
      const value = descMap[title];
      if (!value) {
        continue;
      }

      html += `
      <div class="chat_info_desc_row">
        <div class="chat_info_desc_icon chat_info_desc_icon__${title}"></div>
        <div class="chat_info_desc_row_block">
          <div class="chat_info_desc_row_text">${ value }</div>
          <div class="chat_info_desc_row_subtitle">${ title }</div>
        </div>
      </div>
    `;
    }

    html += `
      <div class="chat_info_desc_row">
        <div class="chat_info_desc_checkbox">${this.getNotificationsCheckboxCode()}</div>
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

  renderPeerPhoto(peer, peerData) {
    const photo = MessagesApiManager.getPeerPhoto(peer);
    const photoEl = $('.sidebar_user_photo', this.container);

    if (!photo || photo._ === 'chatPhotoEmpty') {
      ChatsController.setChatPhotoPlaceholder(photoEl, peerData.id);
      return;
    }

    FileApiManager.loadPeerPhoto(peer, photo.photo_big, true, photo.dc_id, {priority: 10, cache: true}).then((url) => {
      photoEl.style.backgroundImage = `url(${url})`;
    });
  }

  async loadMoreMedia() {
    const inputPeer = MessagesApiManager.getInputPeerById(this.peerId);

    let res;
    try {
      res = await ApiClient.callMethod('messages.search', {
        peer: inputPeer,
        filter: {_: 'inputMessagesFilterPhotos'},
        limit: this.mediaStep,
        offset_id: this.offsetMsgId,
      });
    } catch(err) {
      this.loadingMedia = false;
    }

    this.loadingMedia = false;
    if (res.count < this.mediaStep || res.messages.length < this.mediaStep) {
      this.noMoreMedia = true;

      if (!res.messages.length) {
        return;
      }
    }

    const messages = res.messages;
    this.offsetMsgId = messages[messages.length - 1].id;
    MessagesApiManager.updateMessages(messages);

    const frag = document.createDocumentFragment();
    messages.forEach((message) => {
      const thumbEl = buildHtmlElement(`
        <div class="chat_info_media_photo" data-message-id="${message.id}"></div>
      `);
      thumbEl.addEventListener('click', MessagesController.onThumbClick);

      frag.append(thumbEl);

      this.loadMediaThumb(message, thumbEl);
    });

    $('.chat_info_media').append(frag);
  }

  async loadMediaThumb(message, thumbEl) {
    const thumb = MessagesController.getMessageMediaThumb(message.media);
    const photoSize = MediaApiManager.choosePhotoSize(thumb.sizes, 'm');

    const url = await FileApiManager.loadMessagePhoto(thumb.object, photoSize.type, {cache: true});

    return thumbEl.style.backgroundImage = `url(${url})`;
  }

  onClose = () => {
    if (!this.container) {
      return;
    }

    this.container.hidden = true;
  };

  onCloseByEsc = (event) => {
    if (event && event.type === 'keyup' && (event.keyCode !== 27 || MediaViewController.isOpened())) {
      return;
    }

    document.removeEventListener('keyup', this.onCloseByEsc);
    this.onClose();
  };

  onExtraMenuClick = () => {
    const menuEl = $('.sidebar_extra_menu_list', this.container);
    const menu = new MDCMenu(menuEl);

    if (!menu.open) {
      menu.open = true;
      menu.setAbsolutePosition(239, 57);
    }
  };

  onMediaScroll = () => {
    const scrollContainer = $('.chat_info_media');

    if (!this.loadingMedia && !this.noMoreMedia && scrollContainer.scrollTop + scrollContainer.offsetHeight > scrollContainer.scrollHeight - 150) {
      this.loadingMedia = true;
      this.loadMoreMedia();
    }
  };
};

window.ChatInfoController = ChatInfoController;

export {ChatInfoController};
