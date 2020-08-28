import {$, attachRipple, formatFileSize, isTouchDevice, Tpl} from './utils';
import {I18n} from './i18n';
import {MessagesFormController} from './messages_form_controller';
import {MDCTextField} from '@material/textfield/index';
import {Popup} from './popup';
import '../css/file_upload_popup.scss';

const FileUploadPopup = new class {

  init() {
    this.menu = Tpl.html`
      <div class="mdc-menu mdc-menu-surface messages_form_media_menu" hidden>
        <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
          <li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-media" data-type="media" role="menuitem">
            <span class="mdc-list-item__text">Photo or Video</span>
          </li>
          <li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-file" data-type="file" role="menuitem">
            <span class="mdc-list-item__text">Document</span>
          </li>
          <!--li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-poll" data-type="poll" role="menuitem">
            <span class="mdc-list-item__text">Poll</span>
          </li-->
        </ul>
      </div>
    `.buildElement();

    for (const item of $('.mdc-list', this.menu).children) {
      attachRipple(item)
      item.addEventListener('click', this.onMenuItemClick);
    }
  }

  onMenuItemClick = (event) => {
    const itemType = event.currentTarget.dataset.type;
    if (itemType === 'media' || itemType === 'file') {
      const sendAsMedia = itemType === 'media';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = sendAsMedia ? 'image/*, video/*' : '*/*';
      input.multiple = true;
      input.click();
      window.input = input;
      input.onchange = () => {
        this.onFilesSelected(input.files, sendAsMedia);
        this.fileInput = null;
      };
      this.fileInput = input; // protection from GC in safari
    }
    this.hideMenu();
  };

  bind(button) {
    button.parentNode.append(this.menu);

    if (isTouchDevice()) {
      button.addEventListener('touchstart', (event) => {
        event.preventDefault();
        if (!this.isMenuOpen()) {
          event.stopPropagation();
          this.showMenu();
        } else {
          this.hideMenu();
        }
      });
    } else {
      button.addEventListener('mousedown', this.onMenuButtonClick);
      button.addEventListener('mouseenter', this.onMenuMouseEnter);
      button.addEventListener('mouseleave', this.onMenuMouseLeave);
      this.menu.addEventListener('mouseenter', this.onMenuMouseEnter);
      this.menu.addEventListener('mouseleave', this.onMenuMouseLeave);
    }

    this.menuButton = button;
  }

  onMenuButtonClick = () => {
    if (!this.isMenuOpen()) {
      this.showMenu();
    }
  };

  onMenuMouseEnter = () => {
    clearTimeout(this.hideTimeout);
    if (!this.isMenuOpen()) {
      this.showMenu();
    }
  };

  onMenuMouseLeave = () => {
    this.hideTimeout = setTimeout(() => {
      if (this.isMenuOpen()) {
        this.hideMenu();
      }
      this.hideTimeout = null;
    }, 500);
  };

  onGlobalClick = (event) => {
    if (!this.menu.contains(event.target)) {
      this.hideMenu();
    }
  };

  isMenuOpen() {
    return !this.menu.hidden;
  }

  showMenu() {
    this.menu.hidden = false;
    this.menuButton.classList.add('messages_form_media_button-active');
    document.addEventListener('mousedown', this.onGlobalClick);
  }

  hideMenu() {
    this.menu.hidden = true;
    this.menuButton.classList.remove('messages_form_media_button-active');
    document.removeEventListener('mousedown', this.onGlobalClick);
  }

  onFilesSelected(files, sendAsMedia) {
    if (!files.length) {
      return;
    }
    if (sendAsMedia) {
      this.showPhotosUploadPopup(files);
    } else {
      this.showFilesUploadPopup(files);
    }
  }

  showPhotosUploadPopup(files) {
    const wrapClassModifier = (files.length > 3 ? 'many' : 'n' + files.length);
    const wrap = Tpl.html`<div class="messages_upload_popup_media messages_upload_popup_media-${wrapClassModifier}"></div>`.buildElement();
    let photoCount = 0;
    let videoCount = 0;
    for (const file of files) {
      let el;
      if (file.type.startsWith('video/')) {
        videoCount++;
        el = Tpl.html`<video src="${URL.createObjectURL(file)}" class="messages_upload_popup_media_item"></video>`.buildElement();
      } else {
        photoCount++
        el = Tpl.html`<img src="${URL.createObjectURL(file)}" class="messages_upload_popup_media_item">`.buildElement();
      }
      wrap.appendChild(el);
    }

    let title;
    if (photoCount && !videoCount) {
      title = I18n.getPlural('messages_send_n_photos', files.length);
    } else if (videoCount && !photoCount) {
      title = I18n.getPlural('messages_send_n_videos', files.length);
    } else {
      title = I18n.getPlural('messages_send_n_files', files.length);
    }
    this.buildPopup(title, wrap, files, true);
  }

  /**
   * @param {FileList} files
   */
  showFilesUploadPopup(files) {
    const content = Tpl.html``;
    for (const file of files) {
      const fileExt = file.name.split('.').pop() || '';
      content.appendHtml`
        <div class="messages_upload_popup_files_item">
          <div class="messages_upload_popup_files_item_thumb">${fileExt}</div>
          <div class="messages_upload_popup_files_item_description">
            <div class="messages_upload_popup_files_item_name _cut_text">${file.name}</div>
            <div class="messages_upload_popup_files_item_size">${formatFileSize(file.size)}</div>
          </div>
        </div>
      `;
    }
    const title = I18n.getPlural('messages_send_n_files', files.length);
    this.buildPopup(title, content.buildFragment(), files);
  }

  buildPopup(title, content, files, sendAsPhoto = false) {
    const contentTpl = Tpl.html`
      <div class="messages_upload_popup_content"></div>
      <div class="mdc-text-field mdc-text-field--outlined messages_upload_popup_caption_text_field">
        <input type="text" class="mdc-text-field__input messages_upload_popup_caption_input">
        <div class="mdc-notched-outline">
          <div class="mdc-notched-outline__leading"></div>
          <div class="mdc-notched-outline__notch">
            <label class="mdc-floating-label">Caption</label>
          </div>
          <div class="mdc-notched-outline__trailing"></div>
        </div>
      </div>
    `;
    const popup = new Popup({
      title,
      content: contentTpl,
      buttonText: 'Send',
      onButtonClick: () => {
        const caption = $('.messages_upload_popup_caption_input', layer).value.trim();
        MessagesFormController.onMediaSend(files, sendAsPhoto, caption);
        popup.close();
      }
    });

    $('.messages_upload_popup_content', popup.el).appendChild(content);

    popup.show();

    new MDCTextField($('.mdc-text-field', popup.el));
  }
};

window.FileUploadPopup = FileUploadPopup;

export {FileUploadPopup};
