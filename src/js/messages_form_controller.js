import {$, debounce, getLabeledElements} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {EmojiDropdown} from './emoji_dropdown';
import {AudioRecorder} from './audio_recorder';
import {MDCRipple} from '@material/ripple';
import {MDCMenu, Corner} from '@material/menu';

const MessagesFormController = new class {
  init() {
    this.container = $('.messages_form');

    this.dom = getLabeledElements(this.container);

    this.saveDraft = debounce((peer, message) => {
      MessagesApiManager.saveDraft(peer, message);
    });

    this.dom.input.addEventListener('input', this.onInput);
    this.dom.input.addEventListener('change', this.onInput);
    this.dom.input.addEventListener('keydown', this.onKeyDown);
    this.dom.submit_button.addEventListener('click', this.onSubmit);

    new MDCRipple(this.dom.submit_button).unbounded = true;

    EmojiDropdown.bind(this.dom.emoji_button, this.dom.input);

    this.initMediaMenu();

    this.dom.input.parentNode.appendChild(EmojiDropdown.container);
  }

  onInput = () => {
    this.dom.input.style.height = '';
    this.dom.input.style.height = this.input.scrollHeight + 'px';

    const message = this.input.value.trim();
    this.dom.submit_button.classList.toggle('messages_form_button-send', !!message);
    this.dom.saveDraft(MessagesController.dialog.peer, message);
  };

  onSubmit = () => {
    const message = this.dom.input.value.trim();
    if (!message) {
      return;
    }
    MessagesApiManager.sendMessage(MessagesController.dialog.peer, message);
    this.dom.input.value = '';
    this.onInput();
  };

  onKeyDown = (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      this.onSubmit();
      event.preventDefault();
    }
  };

  initMediaMenu() {
    // this.mediaMenu = new MDCMenu(this.dom.media_menu);
    //
    // const button = this.dom.media_button;
    //
    // // this.mediaMenu.setFixedPosition(true);
    // this.mediaMenu.setAnchorElement(button);
    // this.mediaMenu.setAbsolutePosition(100, -100);
    // this.mediaMenu.setAnchorCorner(Corner.BOTTOM_LEFT);
    //
    // button.addEventListener('click', () => {
    //   if (!this.mediaMenu.open) {
    //     this.mediaMenu.open = true;
    //   }
    // });
    //
    // new MDCRipple(button).unbounded = true;
  }
};

window.MessagesFormController = MessagesFormController;

export {MessagesFormController};
