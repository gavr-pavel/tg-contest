import {buildHtmlElement, getLabeledElements, $, Storage} from './utils';
import {emojiConfig} from './emoji_config';
import {ApiClient} from './api/api_client';

const EmojiDropdown = new class {
  stickerSets = new Map();

  constructor() {
    this.container = buildHtmlElement(`
      <div class="emoji_dropdown" hidden>
        <div class="emoji_dropdown_top_nav nav_tabs_container">
          <div class="nav_tabs_item emoji_dropdown_top_nav_item" data-js-label="nav_emoji">
            <div class="nav_tabs_item_label">Emoji</div>
          </div>
          <div class="nav_tabs_item emoji_dropdown_top_nav_item" data-js-label="nav_stickers">
            <div class="nav_tabs_item_label">Stickers</div>
          </div>
          <div class="nav_tabs_item emoji_dropdown_top_nav_item" data-js-label="nav_gifs">
            <div class="nav_tabs_item_label">GIFs</div>
          </div>
        </div>
        <div class="emoji_dropdown_sections_wrap" data-js-label="sections_wrap">
          <section class="emoji_dropdown_section emoji_dropdown_section-emoji" data-js-label="section_emoji">
            <div class="emoji_dropdown_section_content"></div>
            <div class="emoji_dropdown_bottom_nav"></div>
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
    let bottomNavHtml = '';
    for (const category in emojiConfig) {
      let categoryItems = '';
      for (const item of emojiConfig[category]) {
        categoryItems += `<div class="emoji_dropdown_list_item">${item}</div>`;
      }
      emojiSectionHtml += `<div class="emoji_dropdown_list emoji_dropdown_list-${category}" data-category="${category}">${categoryItems}</div>`;
      bottomNavHtml += `<div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-${category}" data-category="${category}"></div>`;
    }
    const container = $('.emoji_dropdown_section_content', this.dom.section_emoji);
    container.innerHTML = emojiSectionHtml;
    container.addEventListener('click', this.onEmojiClick);
    container.addEventListener('scroll', this.onEmojiScroll);

    const bottomNavContainer = $('.emoji_dropdown_bottom_nav', this.dom.section_emoji);
    bottomNavContainer.innerHTML = bottomNavHtml;
    bottomNavContainer.addEventListener('click', this.onEmojiNavClick);
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

    let frag = document.createDocumentFragment();

    for (const set of allStickers.sets) {
      const el = buildHtmlElement(`<div class="emoji_dropdown_list" data-set-id="${set.id}"></div>`);
      frag.appendChild(el);
      this.initStickerSet(set, el);
    }

    const container = $('.emoji_dropdown_section_content', this.dom.section_stickers);
    container.appendChild(frag);
    container.addEventListener('click', this.onStickerClick);
  }

  async initStickerSet(set, container) {
    const fullSet = await ApiClient.callMethod('messages.getStickerSet', {
      stickerset: {_: 'inputStickerSetID', id: set.id, access_hash: set.access_hash}
    });
    this.stickerSets.set(set.id, fullSet);

    const frag = document.createDocumentFragment();
    fullSet.documents.forEach((document, index) => {
      const stickerEl = buildHtmlElement(`<div class="emoji_dropdown_list_item" data-sticker-index="${index}"></div>`);
      frag.appendChild(stickerEl);
      // FileApiManager.loadMessageDocument(document, {cache: true})
      //     .then(url => stickerEl.style.backgroundImage = `url(${url})`);
    });
    container.appendChild(frag);
  }

  setSection(section) {
    if (section === this.section) {
      return;
    }
    if (this.section) {
      this.dom[`nav_${this.section}`].classList.remove('nav_tabs_item-active');
    }
    this.section = section;
    this.dom[`nav_${this.section}`].classList.add('nav_tabs_item-active');

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

  onEmojiNavClick = (event) => {
    const category = event.target.dataset.category;
    const list = $(`.emoji_dropdown_list-${category}`, this.dom.section_emoji);
    list.scrollIntoView();
  };

  onEmojiScroll = (event) => {
    const container = event.currentTarget;
    const containerHeight = container.offsetHeight;
    const scrollTop = container.scrollTop;
    let currentList;
    for (const list of container.children) {
      if (list.offsetTop > scrollTop + containerHeight / 2) {
        break;
      }
      currentList = list;
    }
    const category = currentList.dataset.category;
    const prevNavItem = $(`.emoji_dropdown_bottom_nav_item-active`, this.dom.section_emoji);
    if (prevNavItem) {
      prevNavItem.classList.remove('emoji_dropdown_bottom_nav_item-active');
    }
    const newNavItem = $(`.emoji_dropdown_bottom_nav_item-${category}`, this.dom.section_emoji);
    newNavItem.classList.add('emoji_dropdown_bottom_nav_item-active');
  };

  onStickerClick = (event) => {

  };

  isShown() {
    return !this.container.hidden;
  }

  show() {
    this.container.hidden = false;
    this.button.classList.add('messages_form_emoji_button-active');
    document.addEventListener('mousedown', this.onGlobalClick);
    this.input.focus();

    const scrollContainers = this.container.querySelectorAll('.emoji_dropdown_section_content');
    for (const scrollContainer of scrollContainers) {
      scrollContainer.dispatchEvent(new Event('scroll')); // update bottom nav
    }
  };

  hide() {
    this.container.hidden = true;
    this.button.classList.remove('messages_form_emoji_button-active');
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
