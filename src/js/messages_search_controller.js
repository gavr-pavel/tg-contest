import {$, attachRipple, debounce, initScrollBorder, Tpl} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {ChatsController} from './chats_controller';
import {I18n} from './i18n';
import {MessagesController} from './messages_controller';
import {App} from './app';

import '../css/right_sidebar.scss';

const MessagesSearchController = new class {
  show(peerId) {
    this.container = $('.right_sidebar');
    this.container.hidden = false;
    this._open = true;
    App.onRightSidebarOpen();

    this.peerId = peerId;

    this.container.innerHTML = `
      <div class="sidebar_header">
        <button class="mdc-icon-button sidebar_close_button"></button>
        <input class="sidebar_search_input messages_search_input" type="text" placeholder="Start typing...">
      </div>
      <div class="messages_search_results_list"></div>
    `;

    const closeButton = $('.sidebar_close_button', this.container);
    attachRipple(closeButton);
    closeButton.addEventListener('click', this.close);

    this.input = $('.messages_search_input', this.container);
    this.input.addEventListener('input', debounce(this.onInput, 100));

    this.listWrap = $('.messages_search_results_list', this.container);
    this.listWrap.onscroll = this.onScroll;
    initScrollBorder(this.listWrap);

    document.addEventListener('keyup', this.onKeyUp);

    if (App.isMobileView()) {
      this.initMobileMode();
    }

    if (this.mobileMode) {
      this.input.focus();
    } else {
      setTimeout(() => {
        this.input.focus();
      }, 200);
    }
  }

  initMobileMode() {
    this.mobileMode = true;
    this.container.style.pointerEvents = 'none';
    this.container.style.background = 'none';
    const header = $('.sidebar_header', this.container);
    header.style.pointerEvents = 'all';
    MessagesController.footer.classList.add('messages_footer_search-shown');
    this.initFooter();
  }

  initFooter() {
    const footer = Tpl.html`
      <div class="messages_search_footer">
        <div class="messages_search_footer_info"></div>
        <button class="messages_search_footer_button messages_search_footer_button-up" disabled>Previous</button>
        <button class="messages_search_footer_button messages_search_footer_button-down" disabled>Next</button>
      </div>
    `.buildElement();

    this.container.appendChild(footer);

    const info = $('.messages_search_footer_info', footer);
    const buttonUp = $('.messages_search_footer_button-up', footer);
    const buttonDown = $('.messages_search_footer_button-down', footer);

    let index = 0;
    let totalCount = 0;
    let results = [];

    const jumpToIndex = (index) => {
      const message = results[index];
      MessagesController.jumpToMessage(message.id);
      updateInfoText();
      updateButtons();
      if (this.offsetId && results.length - index < 3) {
        this.loadMore();
      }
    };

    const updateInfoText = () => {
      info.innerText = totalCount ? `${index+1} of ${totalCount}` : 'No results';
    };

    const updateButtons = () => {
      buttonUp.disabled = index >= totalCount - 1;
      buttonDown.disabled = index <= 0;
    };

    buttonUp.addEventListener('click', (event) => {
      jumpToIndex(++index);
      this.input.focus();
      event.preventDefault();
    });

    buttonDown.addEventListener('click', (event) => {
      jumpToIndex(--index);
      this.input.focus();
      event.preventDefault();
    });

    this.renderMobileResults = (offsetId, count, messages) => {
      if (!offsetId) {
        totalCount = count;
        index = 0;
        results = [];
        updateInfoText();
      }
      results = results.concat(messages);
      if (totalCount && index >= results.length - messages.length) {
        jumpToIndex(index);
      }
    };

    const onResize = () => {
      footer.style.top = (window.visualViewport.height - footer.offsetHeight) + 'px';
    };

    window.visualViewport.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize);
    onResize();
  }

  isOpen() {
    return Boolean(this._open);
  }

  close = () => {
    if (this._open) {
      this._open = false;
      this.container.hidden = true;
      App.onRightSidebarClose();
      this.peerId = null;
      document.removeEventListener('keyup', this.onKeyUp);
      if (this.mobileMode) {
        MessagesController.footer.classList.remove('messages_footer_search-shown');
        setTimeout(() => {
          this.mobileMode = false;
          this.container.style.pointerEvents = '';
          this.container.style.background = '';
        }, 200);
      }
    }
  };

  onKeyUp = (event) => {
    if (window.MediaViewController && MediaViewController.isOpen()) {
      return;
    }
    if (event.keyCode === 27) {
      this.close();
    }
  };

  onInput = () => {
    const q = this.input.value.trim();
    this.lastQuery = q;
    this.offsetId = 0;
    if (q) {
      this.loadResults(q);
    } else {
      this.listWrap.innerHTML = '';
    }
  };

  async loadResults(text, offsetId = 0) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const res = await ApiClient.callMethod('messages.search', {
      peer: MessagesApiManager.getInputPeerById(this.peerId),
      q: text,
      filter: {_: 'inputMessagesFilterEmpty'},
      offset_id: offsetId,
      limit: 30,
    });

    if (signal.aborted) {
      return;
    }

    MessagesApiManager.updateMessages(res.messages);
    MessagesApiManager.updateChats(res.chats);
    MessagesApiManager.updateUsers(res.users);

    const count = res.count || res.messages.length;

    if (!this.mobileMode) {
      if (!offsetId) {
        this.listWrap.innerHTML = '';
        this.renderResultsHeader(count);
      }
      this.renderResults(res.messages);
    } else {
      this.renderMobileResults(offsetId, count, res.messages);
    }
    if (res.messages.length) {
      this.offsetId = res.messages.slice(-1)[0].id;
    } else {
      this.offsetId = 0;
    }
  }

  renderResultsHeader(count) {
    const text = I18n.getPlural('messages_search_n_results_found', count);
    this.listWrap.insertAdjacentHTML('afterbegin', `
      <div class="messages_search_results_header">${text}</div>
    `);
  }

  renderResults(messages) {
    const frag = document.createDocumentFragment();

    for (const message of messages) {
      const peer = MessagesApiManager.getMessageAuthorPeer(message);
      const title = MessagesApiManager.getPeerName(peer);
      const date = ChatsController.formatMessageDate(message);
      const messagePreview = ChatsController.getMessagePreview(message);
      const el = Tpl.html`
        <div class="messages_search_results_item" data-id="${message.id}">
          <div class="messages_search_results_item_content mdc-ripple-surface">
            <div class="messages_search_results_item_photo"></div>
            <div class="messages_search_results_item_text">
              <div class="messages_search_results_item_text_row">
                <div class="messages_search_results_item_title">${title}</div>
                <div class="messages_search_results_item_date">${date}</div>
              </div>
              <div class="messages_search_results_item_text_row">
                <div class="messages_search_results_item_message">${messagePreview}</div>
              </div>
            </div>      
          </div>
        </div>
      `.buildElement();
      this.loadMessagePeerPhoto(el, peer);
      el.addEventListener('click', this.onMessageClick);
      frag.append(el);
    }

    this.listWrap.append(frag);
  }

  loadMessagePeerPhoto(messageEl, peer) {
    const photoEl = $('.messages_search_results_item_photo', messageEl);
    ChatsController.loadPeerPhoto(photoEl, peer);
  }

  onScroll = () => {
    const container = this.listWrap;
    if (!this.loading && !this.noMore && this.offsetId && container.scrollTop + container.offsetHeight > container.scrollHeight - 500) {
      this.loadMore();
    }
  }

  loadMore() {
    if (this.loading || this.noMore || !this.offsetId) {
      return;
    }
    this.loading = true;
    this.loadResults(this.lastQuery, this.offsetId)
        .finally(() => {
          this.loading = false;
        });
  }

  onMessageClick = (event) => {
    const el = event.currentTarget;
    const msgId = +el.dataset.id;
    MessagesController.jumpToMessage(msgId);
  };
};

window.MessagesSearchController = MessagesSearchController;

export {MessagesSearchController};
