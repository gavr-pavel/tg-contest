import {
  getLabeledElements,
  $,
  $$,
  Storage,
  Tpl,
  isTouchDevice,
  debounce,
  buildLoaderElement,
  getClassesString, initScrollBorder, cancelSelection
} from './utils';
import {EmojiConfig} from './emoji_config';
import {ApiClient} from './api/api_client';
import {MessagesFormController} from './messages_form_controller';
import '../css/emoji_dropdown.scss';
import {Popup} from './popup';

const EmojiDropdown = new class {
  stickerSets = new Map();
  favedStickers = null;
  recentStickers = null;
  gifs = new Map();

  init() {
    this.container = Tpl.html`
      <div class="emoji_dropdown" hidden>
        <div class="emoji_dropdown_sections_wrap" data-js-label="sections_wrap">
          <section class="emoji_dropdown_section emoji_dropdown_section-emoji" data-js-label="section_emoji">
            <div class="emoji_dropdown_top_nav"></div>
            <div class="emoji_dropdown_section_content"></div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-stickers" data-js-label="section_stickers">
            <div class="emoji_dropdown_top_nav"></div>
            <div class="emoji_dropdown_section_content"></div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-gifs" data-js-label="section_gifs"> 
            <div class="emoji_dropdown_section_content"></div>
          </section>        
        </div>
        <div class="emoji_dropdown_bottom_nav" data-js-label="bottom_nav">
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-search" data-js-label="nav_search"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-emoji" data-js-label="nav_emoji"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-stickers" data-js-label="nav_stickers"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-gifs" data-js-label="nav_gifs"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-delete" data-js-label="nav_delete"></div>
        </div>
        <div class="emoji_dropdown_search_container" data-js-label="search_container" hidden>
          <div class="emoji_dropdown_search_header">
            <button class="emoji_dropdown_search_back_button mdc-icon-button"></button>
            <input class="emoji_dropdown_search_input">
          </div>
          <div class="emoji_dropdown_search_results" data-js-label="search_results"></div>
          <div class="emoji_dropdown_search_trending" data-js-label="search_trending"></div>
        </div>
      </div>
    `.buildElement();

    this.dom = getLabeledElements(this.container);

    this.dom.bottom_nav.addEventListener('click', this.onBottomNavClick);
    initScrollBorder(this.dom.search_container);

    this.initEmojiSection();
    this.initStickersSection();
    this.initGifsSection();

    this.setSection('emoji');
  }

  initEmojiSection() {
    let emojiSectionHtml = '';
    let topNavHtml = '';
    for (const category in EmojiConfig) {
      let categoryItems = '';
      for (const item of EmojiConfig[category]) {
        categoryItems += `<div class="emoji_dropdown_list_item">${item}</div>`;
      }
      emojiSectionHtml += `<div class="emoji_dropdown_list emoji_dropdown_list-${category}" data-category="${category}">${categoryItems}</div>`;
      topNavHtml += `<div class="emoji_dropdown_top_nav_item emoji_dropdown_top_nav_item-${category}" data-category="${category}"></div>`;
    }
    const container = $('.emoji_dropdown_section_content', this.dom.section_emoji);
    container.innerHTML = emojiSectionHtml;
    container.addEventListener('click', this.onEmojiClick);
    container.addEventListener('scroll', this.onEmojiScroll);

    const topNavContainer = $('.emoji_dropdown_top_nav', this.dom.section_emoji);
    topNavContainer.innerHTML = topNavHtml;
    topNavContainer.addEventListener('click', this.onEmojiNavClick);
  }

  async loadStickers() {
    let allStickers = Storage.get('user_stickers');
    let favedStickers; // = Storage.get('faved_stickers'); // problems with file_reference
    let recentStickers; // = Storage.get('recent_stickers'); // problems with file_reference

    const [allStickersResponse, favedStickersResponse, recentStickersResponse] = await Promise.all([
      ApiClient.callMethod('messages.getAllStickers', {hash: allStickers ? allStickers.hash : 0}),
      ApiClient.callMethod('messages.getFavedStickers', {hash: favedStickers ? favedStickers.hash : 0}),
      ApiClient.callMethod('messages.getRecentStickers', {hash: recentStickers ? recentStickers.hash : 0}),
    ]);

    if (allStickersResponse._ !== 'messages.allStickersNotModified') {
      allStickers = allStickersResponse;
      Storage.set('user_stickers', allStickers);
    }
    if (favedStickersResponse._ !== 'messages.favedStickersNotModified') {
      favedStickers = favedStickersResponse;
      Storage.set('faved_stickers', favedStickers);
    }
    if (recentStickersResponse._ !== 'messages.recentStickersNotModified') {
      recentStickers = recentStickersResponse;
      Storage.set('recent_stickers', recentStickers);
    }

    this.favedStickers = favedStickers;
    this.recentStickers = recentStickers;

    return [allStickers, favedStickers, recentStickers];
  }

  async initStickersSection() {
    const [allStickers, favedStickers, recentStickers] = await this.loadStickers();

    const frag = document.createDocumentFragment();
    const topNavFrag = document.createDocumentFragment();

    if (recentStickers.stickers.length) {
      const setId = 'recent';
      const el = Tpl.html`<div class="emoji_dropdown_list" data-set-id="${setId}"></div>`.buildElement();
      const topButton = Tpl.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${setId}"></div>`.buildElement();
      this.renderStickersList(el, 'Recently used', recentStickers.stickers, true);
      frag.appendChild(el);
      topNavFrag.append(topButton);
    }

    if (favedStickers.stickers.length) {
      const setId = 'faved';
      const el = Tpl.html`<div class="emoji_dropdown_list" data-set-id="${setId}"></div>`.buildElement();
      const topButton = Tpl.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${setId}"></div>`.buildElement();
      this.renderStickersList(el, 'Favorite', favedStickers.stickers, true);
      frag.appendChild(el);
      topNavFrag.append(topButton);
    }

    for (let index = 0; index < allStickers.sets.length; index++) {
      const set = allStickers.sets[index];
      const el = Tpl.html`<div class="emoji_dropdown_list" data-set-id="${set.id}"></div>`.buildElement();
      const topButton = Tpl.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${set.id}"></div>`.buildElement();
      this.initStickerSet(set, el, topButton, index < 3);
      frag.appendChild(el);
      topNavFrag.append(topButton);
    }

    const container = $('.emoji_dropdown_section_content', this.dom.section_stickers);
    container.appendChild(frag);
    container.addEventListener('scroll', this.onStickersScroll);
    container.addEventListener('click', this.onStickerClick);
    container.addEventListener('mouseover', this.onStickerOver);
    container.addEventListener('touchstart', this.onStickerTouchStart);

    const topNavContainer = $('.emoji_dropdown_top_nav', this.dom.section_stickers);
    topNavContainer.append(topNavFrag);
    topNavContainer.addEventListener('click', this.onStickerNavClick);
    if (isTouchDevice()) {
      topNavContainer.style.overflowX = 'auto';
    } else {
      topNavContainer.addEventListener('mousewheel', this.onStickersNavScroll);
    }
  }

  async loadStickerSet(set) {
    if (this.stickerSets.has(set.id)) {
      return this.stickerSets.get(set.id);
    }
    const fullSet = await ApiClient.callMethod('messages.getStickerSet', {
      stickerset: {_: 'inputStickerSetID', id: set.id, access_hash: set.access_hash}
    });
    this.stickerSets.set(set.id, fullSet);
    return fullSet;
  }

  async initStickerSet(set, container, topNavButton, preload = false) {
    const fullSet = await this.loadStickerSet(set);
    this.renderStickersList(container, set.title, fullSet.documents, preload);
    this.loadStickerSetThumb(topNavButton, fullSet);
  }

  renderStickersList(container, title, documents, preload = false) {
    const titleEl = Tpl.html`<div class="emoji_dropdown_list_title">${title}</div>`.buildElement();
    container.appendChild(titleEl);
    for (let index = 0; index < documents.length; index++) {
      const stickerEl = Tpl.html`<div class="emoji_dropdown_list_item" data-sticker-index="${index}"></div>`.buildElement();
      container.appendChild(stickerEl);
    }
    if (preload) {
      this.loadStickersList(container, documents, true);
    }
  }

  onStickerNavClick = (event) => {
    const setId = event.target.dataset.setId;
    const list = $(`.emoji_dropdown_list[data-set-id="${setId}"]`, this.dom.section_stickers);
    list.scrollIntoView();
  };

  onStickersNavScroll = (event) => {
    event.preventDefault();
    const container = event.currentTarget;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    container.scrollLeft += delta;
  };

  loadStickersList(container, documents, preload = false) {
    if (container.dataset.loaded) {
      return;
    }
    container.dataset.loaded = 1;
    for (const el of container.children) {
      if (el.classList.contains('emoji_dropdown_list_title')) {
        continue;
      }
      const document = documents[el.dataset.stickerIndex];
      this.loadStickerThumb(el, document, preload);
    }
  }

  async loadStickerThumb(el, document, preload) {
    const priority = preload ? 0 : 1;
    if (false && this.isAnimatedSticker(document)) { // poor performance
      const url = await FileApiManager.loadDocument(document, {cache: true, priority});
      el.innerHTML = Tpl.html`<tgs-player class="emoji_dropdown_sticker_img" src="${url}" loop renderer="svg"></tgs-player>`;
    } else {
      const url = await FileApiManager.loadDocumentThumb(document, 'm', {cache: true, priority, mimeType: 'image/webp'});
      el.innerHTML = Tpl.html`<img class="emoji_dropdown_sticker_img" src="${url}">`;
    }
  }

  async loadStickerSetThumb(el, fullSet) {
    if (fullSet.set.thumb) {
      const isAnimated = fullSet.set.animated;
      const mimeType = isAnimated ? 'application/x-tgsticker' : 'image/webp';
      const url = await FileApiManager.loadStickerSetThumb(fullSet.set, {cache: true, mimeType});
      if (isAnimated) {
        el.innerHTML = `<tgs-player class="emoji_dropdown_sticker_img" src="${url}"></tgs-player>`;
      } else {
        el.innerHTML = `<img class="emoji_dropdown_sticker_img" src="${url}">`;
      }
    } else if (fullSet.documents[0]) {
      return this.loadStickerThumb(el, fullSet.documents[0]);
    }
  }

  isAnimatedSticker(document) {
    return document.mime_type === 'application/x-tgsticker';
  }

  async initGifsSection() {
    const {gifs} = await ApiClient.callMethod('messages.getSavedGifs', {hash: 0});
    const container = $('.emoji_dropdown_section_content', this.dom.section_gifs);
    this.renderGifsList(gifs, container);
    this.preloadGifsList(gifs);
  }

  renderGifsList(gifs, container) {
    const frag = document.createDocumentFragment();
    for (const document of gifs) {
      this.gifs.set(document.id, document);
      const attributes = MediaApiManager.getDocumentAttributes(document);
      const w = Math.min(150, attributes.w * (100 / attributes.h));
      const el = Tpl.html`<div class="emoji_dropdown_list_item" data-id="${document.id}" style="width: ${w}px;"></div>`.buildElement();
      const inlineThumbUrl = MediaApiManager.getStrippedPhoto(document.thumbs);
      let inlineThumb;
      if (inlineThumbUrl) {
        el.innerHTML = Tpl.html`<div class="emoji_dropdown_gif_inline_preview" style="background-image: url('${inlineThumbUrl}')"></div>`;
        inlineThumb = el.firstElementChild;
      }
      const thumb = MediaApiManager.choosePhotoSize(document.thumbs, 's');
      if (thumb) {
        FileApiManager.loadDocumentThumb(document, 's', {cache: 1})
            .then((url) => {
              el.style.backgroundImage = `url('${url}')`;
              inlineThumb && inlineThumb.remove();
            });
      } /*else if (document.video_thumbs && document.video_thumbs.length) {
        const size = document.video_thumbs[0].type;
        FileApiManager.loadDocumentThumb(document, size, {cache: 1})
            .then((url) => {
              el.innerHTML = Tpl.html`<video class="emoji_dropdown_gif_video" src="${url}" muted loop playsinline></video>`;
              isTouchDevice() && window.document.addEventListener('touchstart', el.firstElementChild.load(), {once: true});
            });
      }*/ else {
        FileApiManager.loadDocument(document, {cache: 1})
            .then((url) => {
              el.innerHTML = Tpl.html`<video class="emoji_dropdown_gif_video" src="${url}" muted loop playsinline></video>`;
              isTouchDevice() && window.document.addEventListener('touchstart', el.firstElementChild.load(), {once: true});
            });
      }
      el.addEventListener(isTouchDevice() ? 'touchstart' : 'mouseover', this.onGifOver);
      el.addEventListener('click', this.onGifClick);
      frag.appendChild(el);
    }
    container.appendChild(frag);
  }

  async preloadGifsList(gifs) {
    for (const document of gifs) {
      if (document.video_thumbs) {
        continue;
      }
      await FileApiManager.loadDocument(document, {cache: 1});
    }
  }

  setSection(section) {
    if (section === this.section) {
      return;
    }
    if (this.section) {
      this.dom[`nav_${this.section}`].classList.remove('emoji_dropdown_bottom_nav_item-active');
    }
    this.section = section;
    this.dom[`nav_${this.section}`].classList.add('emoji_dropdown_bottom_nav_item-active');

    this.dom['nav_search'].hidden = !(section === 'stickers' || section === 'gifs');

    this.dom['nav_delete'].hidden = section !== 'emoji' || !(this.input && this.input.value);

    const index = ['emoji', 'stickers', 'gifs'].indexOf(section);
    const position = -index * (100 / 3);
    this.dom.sections_wrap.style.transform = `translateX(${position}%)`;
  }

  initSearch(section) {
    const searchContainer = this.dom.search_container;
    searchContainer.hidden = false;
    this.container.classList.add('emoji_dropdown-search');
    MessagesController.footer.classList.add('no_transition');
    MessagesController.footer.classList.remove('messages_footer_emoji-shown');

    const resultsContainer = $('.emoji_dropdown_search_results', searchContainer);
    const trendingContainer = $('.emoji_dropdown_search_trending', searchContainer);
    const input = $('.emoji_dropdown_search_input', searchContainer);
    const backButton = $('.emoji_dropdown_search_back_button', searchContainer);

    let trendingGifsNextOffset;

    if (section === 'stickers') {
      searchContainer.classList.add('emoji_dropdown_search-stickers');
      input.placeholder = 'Search Stickers';
      this.loadTrendingStickers(trendingContainer);
    } else if (section === 'gifs') {
      searchContainer.classList.add('emoji_dropdown_search-gifs');
      input.placeholder = 'Search GIFs';
      input.oninput = () => this.searchGifs(input.value, resultsContainer);
      this.searchGifs('', trendingContainer)
          .then(nextOffset => trendingGifsNextOffset = nextOffset);
    }

    input.focus();

    let lastQuery;
    let loading = false;
    let searchAbortController;
    let searchNextOffset;

    const onInput = debounce(() => {
      const q = input.value.trim();
      if (q && q !== lastQuery) {
        if (searchAbortController) {
          searchAbortController.abort();
        }
        lastQuery = q;
        searchNextOffset = null;
        resultsContainer.innerHTML = '';
        searchAbortController = new AbortController();
        loadMore(q, searchAbortController.signal);
      }
      resultsContainer.hidden = !q;
      trendingContainer.hidden = !!q;
    }, 300);

    const loadMore = async (q, signal, offset, isTrending) => {
      loading = true;
      try {
        const container = isTrending ? trendingContainer : resultsContainer;
        let nextOffset;
        if (section === 'stickers') {
          nextOffset = await this.searchStickers(lastQuery, container, signal, offset);
        } else if (section === 'gifs') {
          nextOffset = await this.searchGifs(lastQuery, container, signal, offset);
        }
        if (!signal.aborted) {
          if (isTrending) {
            trendingGifsNextOffset = nextOffset;
          } else {
            searchNextOffset = nextOffset;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        loading = false;
      }
    };

    input.oninput = onInput;

    onInput();

    searchContainer.onscroll = () => {
      const container = searchContainer;
      if (!loading && container.scrollTop + container.offsetHeight > container.scrollHeight - 300) {
        const isTrending = !lastQuery && section === 'gifs';
        const offset = isTrending ? trendingGifsNextOffset : searchNextOffset;
        if (offset) {
          searchAbortController = new AbortController();
          loadMore(lastQuery, searchAbortController.signal, offset, isTrending);
        }
      }
    };

    backButton.onclick = () => {
      searchContainer.hidden = true;
      this.container.classList.remove('emoji_dropdown-search');
      MessagesController.footer.classList.add('messages_footer_emoji-shown');
      requestAnimationFrame(() => MessagesController.footer.classList.remove('no_transition'));
      searchContainer.classList.remove('emoji_dropdown_search-stickers', 'emoji_dropdown_search-gifs');
      resultsContainer.innerHTML = '';
      trendingContainer.innerHTML = '';
      input.oninput = null;
      input.value = '';
      backButton.onclick = null;
    };
  }

  async loadTrendingStickers(container) {
    const loader = buildLoaderElement(container);
    const {sets} = await ApiClient.callMethod('messages.getFeaturedStickers');
    loader.remove();
    this.renderFoundStickers(sets, container);
  }

  async searchStickers(q, container, signal, offset) {
    const loader = !offset ? buildLoaderElement(container) : null;
    const {sets, hash} = await ApiClient.callMethod('messages.searchStickerSets', {q, hash: offset});
    if (!sets || signal && signal.aborted) {
      return;
    }
    loader && loader.remove();
    this.renderFoundStickers(sets, container, signal);
    if (sets.length && hash) {
      return hash;
    }
  }

  renderFoundStickers(sets, container, signal) {
    const frag = document.createDocumentFragment();
    for (const setCovered of sets) {
      const set = setCovered.set;
      const isAdded = !!set.installed_date;
      const setContainer = Tpl.html`
        <div class="emoji_dropdown_search_sticker_set">
          <div class="emoji_dropdown_search_sticker_set_header">
            <div class="emoji_dropdown_search_sticker_set_description">
              <div class="emoji_dropdown_search_sticker_set_title">${set.title}</div>
              <div class="emoji_dropdown_search_sticker_set_count">${set.count} stickers</div>
            </div>
            <button class="emoji_dropdown_search_sticker_set_add_button ${isAdded ? 'emoji_dropdown_search_sticker_set_add_button-added' : ''}" data-set-id="${set.id}">${isAdded ? 'Added' : 'Add'}</button>
          </div>
          <div class="emoji_dropdown_search_sticker_set_preview" data-set-id="${set.id}"></div>
        </div>
      `.buildElement();
      frag.appendChild(setContainer);
      const previewContainer = $('.emoji_dropdown_search_sticker_set_preview', setContainer);
      const addButton = $('.emoji_dropdown_search_sticker_set_add_button', setContainer);
      addButton.addEventListener('click', this.onStickerSetAdd);
      this.loadFoundStickersPreview(set, previewContainer, signal);
    }
    container.appendChild(frag);
  }

  onStickerSetAdd = (event) => {
    const button = event.currentTarget;
    const setId = button.dataset.setId;
    const fullSet = this.stickerSets.get(setId);
    if (button.classList.toggle('emoji_dropdown_search_sticker_set_add_button-added')) {
      this.installStickerSet(fullSet);
      button.innerText = 'Added';
    } else {
      this.uninstallStickerSet(fullSet);
      button.innerText = 'Add';
    }
  };

  installStickerSet(fullSet) {
    const set = fullSet.set;
    const inputStickerSetId = {_: 'inputStickerSetID', id: set.id, access_hash: set.access_hash};
    ApiClient.callMethod('messages.installStickerSet', {stickerset: inputStickerSetId});
    fullSet.set.installed_date = ApiClient.getServerTimeNow();
    const el = Tpl.html`<div class="emoji_dropdown_list" data-set-id="${set.id}"></div>`.buildElement();
    const topButton = Tpl.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${set.id}"></div>`.buildElement();
    this.initStickerSet(set, el, topButton);

    const topNavContainer = $('.emoji_dropdown_top_nav', this.dom.section_stickers);
    const sectionContentContainer = $('.emoji_dropdown_section_content', this.dom.section_stickers);
    if (topNavContainer.children.length) {
      const children = topNavContainer.children;
      let index = 0;
      while (index + 1 < children.length && isNaN(children[index + 1].dataset.setId)) {
        index++;
      }
      topNavContainer.children[index].after(topButton);
      sectionContentContainer.children[index].after(el);
    } else {
      topNavContainer.append(topButton);
      sectionContentContainer.append(el);
    }
  }

  uninstallStickerSet(fullSet) {
    const set = fullSet.set;
    const inputStickerSetId = {_: 'inputStickerSetID', id: set.id, access_hash: set.access_hash};
    ApiClient.callMethod('messages.uninstallStickerSet', {stickerset: inputStickerSetId});
    delete fullSet.set.installed_date;
    $(`.emoji_dropdown_list[data-set-id="${set.id}"]`, this.dom.section_stickers).remove();
    $(`.emoji_dropdown_top_nav_item[data-set-id="${set.id}"]`, this.dom.section_stickers).remove();
  }

  async loadFoundStickersPreview(set, container, signal) {
    const fullSet = await this.loadStickerSet(set);
    const num = Math.min(set.count, 5);
    for (let index = 0; index < num; index++) {
      const stickerEl = Tpl.html`<div class="emoji_dropdown_list_item" data-sticker-index="${index}"></div>`.buildElement();
      container.appendChild(stickerEl);
    }
    container.addEventListener('mouseover', this.onStickerOver);
    const documents = fullSet.documents.slice(0, num);
    this.loadStickersList(container, documents, signal);
  }

  async searchGifs(q, container, signal, offset) {
    const loader = !offset ? buildLoaderElement(container) : null;
    const botUser = await this.getGifSearchBotUser();
    const {results, next_offset: nextOffset} = await ApiClient.callMethod('messages.getInlineBotResults', {
      bot: MessagesApiManager.getInputUser(botUser),
      peer: {_: 'inputPeerSelf'},
      query: q,
      offset,
    });
    if (signal && signal.aborted) {
      return;
    }
    loader && loader.remove();
    const gifs = results.map(result => result.document);
    this.renderGifsList(gifs, container);
    if (gifs.length && nextOffset) {
      return  nextOffset;
    }
  }

  async getGifSearchBotUser() {
    if (!this.gifBotUser) {
      const {users: [user]} = await ApiClient.callMethod('contacts.resolveUsername', {username: 'gif'});
      this.gifBotUser = user;
    }
    return this.gifBotUser;
  }

  onBottomNavClick = (event) => {
    const target = event.target;
    if (target.classList.contains('emoji_dropdown_bottom_nav_item')) {
      const section = target.dataset.jsLabel.replace(/^nav_/, '');
      if (section === 'search') {
        this.initSearch(this.section);
      } else if (section === 'delete') {
        this.input.focus();
        document.execCommand('delete', false);
        if (isTouchDevice()) {
          this.input.blur();
        }
      } else {
        this.setSection(section);
      }
    }
  };

  onEmojiClick = (event) => {
    const target = event.target;
    if (event.target.classList.contains('emoji_dropdown_list_item')) {
      this.input.focus();
      document.execCommand('insertText', false, target.innerText);
      if (isTouchDevice()) {
        this.input.blur();
      }
    }
  };

  onEmojiNavClick = (event) => {
    const category = event.target.dataset.category;
    const list = $(`.emoji_dropdown_list-${category}`, this.dom.section_emoji);
    const container = $('.emoji_dropdown_section_content', this.dom.section_emoji);
    container.style.overflow = 'hidden';
    list.scrollIntoView();
    container.style.overflow = '';
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
    const prevNavItem = $(`.emoji_dropdown_top_nav_item-active`, this.dom.section_emoji);
    if (prevNavItem) {
      prevNavItem.classList.remove('emoji_dropdown_top_nav_item-active');
    }
    const newNavItem = $(`.emoji_dropdown_top_nav_item-${category}`, this.dom.section_emoji);
    newNavItem.classList.add('emoji_dropdown_top_nav_item-active');
  };

  onStickersScroll = (event) => {
    const container = event.currentTarget;
    const containerHeight = container.offsetHeight;
    const scrollTop = container.scrollTop;
    const listsToLoad = [];
    for (const list of container.children) {
      if (list.offsetTop + list.offsetHeight < scrollTop - 50) {
        continue;
      }
      if (list.offsetTop > scrollTop + containerHeight + 50) {
        break;
      }
      listsToLoad.push(list);
    }
    for (const list of listsToLoad) {
      if (isFinite(list.dataset.setId)) {
        const fullSet = this.stickerSets.get(list.dataset.setId);
        if (fullSet) {
          this.loadStickersList(list, fullSet.documents);
        }
      }
    }
  };

  onStickerClick = (event) => {
    const el = event.target;
    if (!el.classList.contains('emoji_dropdown_list_item')) {
      return;
    }
    const setId = el.parentNode.dataset.setId;
    const index = el.dataset.stickerIndex;
    const document = this.getSetSticker(setId, index);
    MessagesFormController.onStickerSend(document);
    // this.hide();
  };

  onStickerOver = (event) => {
    const el = event.target;
    if (!el.classList.contains('emoji_dropdown_list_item')) {
      return;
    }

    const stickerImg = el.firstElementChild;
    if (stickerImg) {
      const setId = el.parentNode.dataset.setId;
      const index = el.dataset.stickerIndex;
      const document = this.getSetSticker(setId, index);
      if (this.isAnimatedSticker(document)) {
        this.playAnimatedSticker(el, stickerImg, document);
      }
    }
  };

  onStickerTouchStart = (event) => {
    const target = event.target;
    if (!target.classList.contains('emoji_dropdown_list_item')) {
      return;
    }
    this.onStickerOver(event);
    const preview = () => {
      const replaceEl = Tpl.html`<div class="emoji_dropdown_list_item"></div>`.buildElement();
      target.replaceWith(replaceEl);
      target.classList.add('emoji_dropdown_list_item-preview');
      (replaceEl.closest('.stickers_popup_content') || this.container).appendChild(target);
      cancelSelection();
      document.body.classList.add('no_select');
      document.addEventListener('touchend', () => {
        target.classList.remove('emoji_dropdown_list_item-preview');
        replaceEl.replaceWith(target);
        document.body.classList.remove('no_select');
      }, {once: true});
    };
    const touchEnd = () => {
      clearTimeout(previewTimeout);
      document.removeEventListener('touchmove', touchEnd);
      document.removeEventListener('touchend', touchEnd);
    };
    let previewTimeout = setTimeout(preview, 300);
    document.addEventListener('touchmove', touchEnd);
    document.addEventListener('touchend', touchEnd);
  }

  async playAnimatedSticker(container, stickerImg, document) {
    let out = false;
    let stickerTgs;
    const onOut = () => {
      out = true;
      stop();
    };

    if (isTouchDevice()) {
      container.addEventListener('touchend', onOut, {once: true});
    } else {
      container.addEventListener('mouseout', onOut, {once: true});
    }

    const url = await FileApiManager.loadDocument(document, {cache: 1, priority: 10});
    if (!out) {
      stickerTgs = Tpl.html`<tgs-player class="emoji_dropdown_sticker_img" hidden src="${url}" loop></tgs-player>`.buildElement();
      container.appendChild(stickerTgs);
      stickerTgs.addEventListener('ready', () => (out ? stop() : start()), {once: true});
    }

    function start() {
      stickerImg.hidden = true;
      stickerTgs.hidden = false;
      stickerTgs.play();
    }

    function stop() {
      if (stickerTgs) {
        stickerTgs.stop();
        stickerTgs.remove();
      }
      stickerImg.hidden = false;
    }
  }

  getSetSticker(setId, index) {
    if (setId === 'recent') {
      return  this.recentStickers.stickers[index];
    } else if (setId === 'faved') {
      return  this.favedStickers.stickers[index];
    } else {
      const fullSet = this.stickerSets.get(setId);
      return  fullSet.documents[index];
    }
  }

  onGifClick = (event) => {
    const el = event.target;
    if (!el.classList.contains('emoji_dropdown_list_item')) {
      return;
    }
    const document = this.gifs.get(el.dataset.id);
    MessagesFormController.onStickerSend(document);
    // this.hide();
  };

  onGifOver = (event) => {
    const el = event.target;
    if (!el.classList.contains('emoji_dropdown_list_item')) {
      return;
    }
    const document = this.gifs.get(el.dataset.id);
    this.playGif(el, document);
  };

  async playGif(container, document) {
    let out = false;
    let video = null;
    let keepVideo = false;
    if (container.firstElementChild && container.firstElementChild.tagName === 'VIDEO') {
      video = container.firstElementChild;
      keepVideo = true;
    }
    const onOut = () => {
      out = true;
      if (video) {
        video.pause();
        if (keepVideo) {
          video.currentTime = 0;
        } else {
          video.remove();
        }
      }
    };
    if (isTouchDevice()) {
      window.document.addEventListener('touchend', onOut, {once: true});
    } else {
      container.addEventListener('mouseout', onOut, {once: true});
    }

    if (video) {
      video.play();
    } else {
      const url = await FileApiManager.loadDocument(document, {cache: 1, priority: 10});
      if (!out) {
        video = Tpl.html`<video class="emoji_dropdown_gif_video" src="${url}" muted autoplay loop playsinline></video>`.buildElement();
        container.appendChild(video);
      }
    }
  }

  isShown() {
    return !this.container.hidden;
  }

  show() {
    this.container.hidden = false;
    this.button.classList.add('messages_form_emoji_button-active');
    document.addEventListener('mousedown', this.onGlobalClick);
    if (!isTouchDevice()) {
      this.input.focus();
    }

    requestAnimationFrame(() => {
      MessagesController.footer.classList.add('messages_footer_emoji-shown');
    });

    if (isTouchDevice()) {
      // MessagesController.scrollToBottom(true);
    }

    const scrollContainers = $$('.emoji_dropdown_section_content', this.container);
    for (const scrollContainer of scrollContainers) {
      scrollContainer.dispatchEvent(new Event('scroll')); // update bottom nav
    }
  };

  hide(noTransition = false) {
    this.container.hidden = true;
    if (noTransition) {
      MessagesController.footer.classList.add('no_transition');
    }
    MessagesController.footer.classList.remove('messages_footer_emoji-shown');
    if (noTransition) {
      requestAnimationFrame(() => {
        MessagesController.footer.classList.remove('no_transition');
      });
    }
    this.button.classList.remove('messages_form_emoji_button-active');
    document.removeEventListener('mousedown', this.onGlobalClick);
  };

  bind(button, input) {
    this.button = button;
    this.input = input;

    if (isTouchDevice()) {
      button.addEventListener('click', () => {
        if (this.isShown()) {
          this.hide(true);
          input.focus();
        } else {
          this.show();
        }
      });
    } else {
      button.addEventListener('mousedown', this.onButtonClick);
      button.addEventListener('mouseenter', this.onMouseEnter);
      button.addEventListener('mouseleave', this.onMouseLeave);
      this.container.addEventListener('mouseenter', this.onMouseEnter);
      this.container.addEventListener('mouseleave', this.onMouseLeave);
    }

    input.addEventListener('input', () => {
      this.dom.nav_delete.hidden = !input.value || this.section !== 'emoji';
    });
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
    if (!this.container.contains(event.target) && event.target !== this.button) {
      this.hide();
    } else if (!this.dom.search_container.contains(event.target)) {
      event.preventDefault(); // prevent input blur
    }
  };

  async showStickerSetPopup(stickerSetInput) {
    const fullSet = await this.loadStickerSet(stickerSetInput);
    const set = fullSet.set;
    let isAdded = !!set.installed_date;

    const popup = new Popup({
      title: set.title,
      content: Tpl.html`
        <div class="stickers_popup_content">
          <div class="stickers_popup_list"></div>
        </div>
        <div class="stickers_popup_footer">
          <button class="mdc-button stickers_popup_button"></button>
        </div>
      `,
    });

    const container = $('.stickers_popup_list', popup.el);
    const button = $('.stickers_popup_button', popup.el);

    const updateButtonState = (isAdded) => {
      button.classList.toggle('mdc-button--unelevated', !isAdded);
      button.innerText = isAdded ? 'Remove stickers' : `Add ${fullSet.documents.length} stickers`;
    };

    updateButtonState(isAdded);

    const documents = fullSet.documents;
    for (let index = 0; index < documents.length; index++) {
      const stickerEl = Tpl.html`<div class="emoji_dropdown_list_item" data-sticker-index="${index}"></div>`.buildElement();
      container.appendChild(stickerEl);
    }
    container.dataset.setId = set.id;
    container.addEventListener('click', this.onStickerClick);
    container.addEventListener('mouseover', this.onStickerOver);
    container.addEventListener('touchstart', this.onStickerTouchStart);
    this.loadStickersList(container, documents);

    button.addEventListener('click', () => {
      if (isAdded) {
        this.uninstallStickerSet(fullSet);
      } else {
        this.installStickerSet(fullSet);
      }
      isAdded = !isAdded;
      updateButtonState(isAdded);
    });

    container.addEventListener('click', (event) => {
      const el = event.target;
      if (el.classList.contains('emoji_dropdown_list_item')) {
        popup.hide();
      }
    });

    popup.show();

    initScrollBorder(container);
  }
};

window.EmojiDropdown = EmojiDropdown;

export {EmojiDropdown};
