import {$, debounce} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {EmojiDropdown} from './emoji_dropdown';

const MessagesFormController = new class {
  init() {
    this.container = $('.messages_new_message_form');
    this.input = $('.messages_new_message_input');
    this.button = $('.messages_new_message_button');
    this.emojiButton = $('.messages_new_message_emoji_button');
    this.mediaButton = $('.messages_new_message_media_button');

    this.saveDraft = debounce((peer, message) => {
      MessagesApiManager.saveDraft(peer, message);
    });

    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('change', this.onInput);
    this.input.addEventListener('keydown', this.onKeyDown);
    this.button.addEventListener('click', this.onSubmit);
    this.emojiButton.addEventListener('click', this.onEmojiButtonClick);
    this.mediaButton.addEventListener('click', this.onMediaButtonClick);

    this.input.parentNode.appendChild(EmojiDropdown.container);
  }

  onInput = () => {
    this.input.style.height = '';
    this.input.style.height = this.input.scrollHeight + 'px';

    const message = this.input.value.trim();
    this.button.classList.toggle('messages_new_message_button_send', !!message);
    this.saveDraft(MessagesController.dialog.peer, message);
  };

  onSubmit = () => {
    const message = this.input.value.trim();
    if (!message) {
      return;
    }
    MessagesApiManager.sendMessage(this.dialog.peer, message);
    this.input.value = '';
    this.onInput();
  };

  onKeyDown = (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      this.onSubmit();
      event.preventDefault();
    }
  };

  onEmojiButtonClick = (event) => {
    if (!EmojiDropdown.isShown()) {
      EmojiDropdown.show();
      event.preventDefault();
      this.input.focus();
      document.addEventListener('mousedown', function closeHandler(event) {
        if (!EmojiDropdown.container.contains(event.target)) {
          EmojiDropdown.hide();
          document.removeEventListener('mousedown', closeHandler);
        } else {
          event.preventDefault(); // prevent input blur
        }
      });
    }
  };

  onMediaButtonClick = () => {

  };
};

window.MessagesFormController = MessagesFormController;

export {MessagesFormController};