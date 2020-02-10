import {buildHtmlElement, getLabeledElements, $} from './utils';
import {emojiConfig} from './emoji_config';

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

  initStickersSection() {
    const container = $('.emoji_dropdown_section_content', this.dom.section_stickers);
    container.innerHTML = '[stickers will be here]';
    container.addEventListener('click', this.onStickerClick);
    // TODO load and render stickers
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
  }

  hide() {
    this.container.hidden = true;
  }
};

window.EmojiDropdown = EmojiDropdown;

export {EmojiDropdown};
