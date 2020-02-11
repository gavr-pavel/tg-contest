import {buildHtmlElement, getLabeledElements, $, Storage} from './utils';
import {emojiConfig} from './emoji_config';
import {ApiClient} from './api/api_client';

const EmojiDropdown = new class {
  constructor() {
    this.container = buildHtmlElement(`
      <div class="emoji_dropdown" hidden>
        <div class="emoji_dropdown_top_nav">
          <div class="emoji_dropdown_top_nav_item emoji_dropdown_top_nav_item-active" data-js-label="nav_emoji">Emoji</div>
          <div class="emoji_dropdown_top_nav_item" data-js-label="nav_stickers">Stickers</div>
          <div class="emoji_dropdown_top_nav_item" data-js-label="nav_gifs">GIFs</div>
        </div>
        <div class="emoji_dropdown_sections_wrap" data-js-label="sections_wrap">
          <section class="emoji_dropdown_section emoji_dropdown_section-emoji" data-js-label="section_emoji">
            <div class="emoji_dropdown_section_content"></div>
            <div class="emoji_dropdown_bottom_nav">
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-recent"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-smileys"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-animals"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-food"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-travel"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-sports"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-objects"></div>
              <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-flags"></div>
            </div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-stickers" data-js-label="section_stickers">
            <div class="emoji_dropdown_section_content"></div>
            <div class="emoji_dropdown_bottom_nav"></div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-gifs" data-js-label="section_gifs"> 
            <div class="emoji_dropdown_section_content"></div>
            <div class="emoji_dropdown_bottom_nav"></div>
          </section>        
        </div>
      </div>
    `);

    this.dom = getLabeledElements(this.container);

    this.initEmojiSection();
    this.initStickersSection();

    this.dom.nav_emoji.addEventListener('click', this.onTopNavClick);
    this.dom.nav_stickers.addEventListener('click', this.onTopNavClick);

    this.setSection('emoji');
  }

  initEmojiSection() {
    let emojiSectionHtml = '';
    for (const category of emojiConfig) {
      let categoryItems = '';
      for (const item of category) {
        categoryItems += `<div class="emoji_dropdown_list_item">${item}</div>`;
      }
      emojiSectionHtml += `<div class="emoji_dropdown_list">${categoryItems}</div>`;
    }
    const container = $('.emoji_dropdown_section_content', this.dom.section_emoji);
    container.innerHTML = emojiSectionHtml;
    container.addEventListener('click', this.onEmojiClick);
  }

  async initStickersSection() {
    let allStickers = Storage.get('user_stickers');
    let hash = 0;
    if (allStickers) {
      hash = allStickers.hash;
    }
    const response = await ApiClient.callMethod('messages.getAllStickers', {hash});
    if (response._ !== 'messages.allStickersNotModified') {
      allStickers = response;
      Storage.set('user_stickers', allStickers);
    }

    const container = $('.emoji_dropdown_section_content', this.dom.section_stickers);
    container.innerHTML = '[stickers will be here]';
    container.addEventListener('click', this.onStickerClick);
  }

  setSection(section) {
    if (section === this.section) {
      return;
    }
    if (this.section) {
      this.dom[`nav_${this.section}`].classList.remove('emoji_dropdown_top_nav_item-active');
    }
    this.section = section;
    this.dom[`nav_${this.section}`].classList.add('emoji_dropdown_top_nav_item-active');

    const index = ['emoji', 'stickers', 'gifs'].indexOf(section);
    const position = -index * 420;
    this.dom.sections_wrap.style.transform = `translateX(${position}px)`;
  }

  onTopNavClick = (event) => {
    const section = event.currentTarget.dataset.jsLabel.replace(/^nav_/, '');
    this.setSection(section);
  };

  onEmojiClick = (event) => {
    if (event.target.classList.contains('emoji_dropdown_list_item')) {
      document.execCommand('insertText', false, event.target.innerText);
    }
  };

  onStickerClick = (event) => {

  };

  isShown() {
    return !this.container.hidden;
  }

  show() {
    this.container.hidden = false;
    this.button.classList.add('messages_new_message_emoji_button-active');
    document.addEventListener('mousedown', this.onGlobalClick);
    this.input.focus();
  };

  hide() {
    this.container.hidden = true;
    this.button.classList.remove('messages_new_message_emoji_button-active');
    document.removeEventListener('mousedown', this.onGlobalClick);
  };

  bind(button, input) {
    this.button = button;
    this.input = input;
    button.addEventListener('mousedown', this.onButtonClick);
    button.addEventListener('mouseenter', this.onMouseEnter);
    button.addEventListener('mouseleave', this.onMouseLeave);
    this.container.addEventListener('mouseenter', this.onMouseEnter);
    this.container.addEventListener('mouseleave', this.onMouseLeave);
  }

  onButtonClick = () => {
    if (!this.isShown()) {
      this.show();
    }
  };

  onMouseEnter = () => {
    clearTimeout(this.hideTimeout);
    if (!this.isShown()) {
      this.show();
    }
  };

  onMouseLeave = () => {
    this.hideTimeout = setTimeout(() => {
      if (this.isShown()) {
        this.hide();
      }
      this.hideTimeout = null;
    }, 500);
  };

  onGlobalClick = (event) => {
    if (!EmojiDropdown.container.contains(event.target) && event.target !== this.button) {
      this.hide();
    } else {
      event.preventDefault(); // prevent input blur
    }
  };
};

window.EmojiDropdown = EmojiDropdown;

export {EmojiDropdown};
