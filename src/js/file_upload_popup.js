import {$, attachRipple, Tpl} from './utils';
import {I18n} from './i18n';
import {MessagesFormController} from './messages_form_controller';

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
          <li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-poll" data-type="poll" role="menuitem">
            <span class="mdc-list-item__text">Poll</span>
          </li>
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
  };

  bind(button) {
    button.parentNode.append(this.menu);

    button.addEventListener('mousedown', this.onMenuButtonClick);
    button.addEventListener('mouseenter', this.onMenuMouseEnter);
    button.addEventListener('mouseleave', this.onMenuMouseLeave);
    this.menu.addEventListener('mouseenter', this.onMenuMouseEnter);
    this.menu.addEventListener('mouseleave', this.onMenuMouseLeave);

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
    if (files.length > 1) {
      // todo show popup instead
      for (const file of files) {
        MessagesFormController.onFileSend(file, sendAsMedia);
      }
    } else {
      MessagesFormController.onFileSend(files[0], sendAsMedia);
    }
  }

  /**
   * @param {FileList} files
   */
  showFilesUploadPopup(files) {
    let itemsHtml = '';
    for (const file of files) {
      const fileExt = file.name.split('.').pop() || '';
      itemsHtml += Tpl.html`
        <div class="messages_upload_popup_files_item">
          <div class="messages_upload_popup_files_item_thumb"></div>
          <div class="messages_upload_popup_files_item_name">${file.name}</div>
          <div class="messages_upload_popup_files_item_size">${file.size}</div>
        </div>
      `;
    }

    const popup = Tpl.html`
      <div class="messages_upload_popup">
        <div class="messages_upload_popup_header">${ I18n.getPlural('messages_send_n_files', files.length) }</div>
        <button class="messages_upload_popup_send_button">Send</button>
        <button class="messages_upload_popup_close_button"></button>
        ${itemsHtml}
        <input class="messages_upload_popup_caption_input">
      </div>
    `.buildElement();
  }
};

window.FileUploadPopup = FileUploadPopup;

export {FileUploadPopup};
