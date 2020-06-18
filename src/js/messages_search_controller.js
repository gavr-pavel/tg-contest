import {$, attachRipple, debounce, Tpl} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {ChatsController} from './chats_controller';
import {I18n} from './i18n';
import {MediaViewController} from './media_view_controller';
import {MessagesController} from './messages_controller';

const MessagesSearchController = new class {
  show(peerId) {
    this.container = $('.right_sidebar');
    this.container.parentNode.hidden = false;

    if (peerId === this.peerId) {
      return;
    }
    this.peerId = peerId;

    this.container.innerHTML = `
      <div class="sidebar_header">
        <button type="button" class="sidebar_close_button mdc-icon-button"></button>
        <input class="sidebar_search_input messages_search_input" type="text" placeholder="Start typing...">
      </div>
      <div class="messages_search_results_list"></div>
    `;

    const closeButton = $('.sidebar_close_button', this.container);
    attachRipple(closeButton);
    closeButton.addEventListener('click', this.close);

    this.input = $('.messages_search_input', this.container);
    this.input.addEventListener('input', debounce(this.onInput, 100));

    this.container.addEventListener('transitionend', () => {
      this.input.focus();
    }, {once: true});

    this.listWrap = $('.messages_search_results_list', this.container);
    this.listWrap.onscroll = this.onScroll;

    document.addEventListener('keyup', this.onKeyUp);

    this._open = true;
  }

  isOpen() {
    return Boolean(this._open);
  }

  close = () => {
    if (this._open) {
      this._open = false;
      this.container.parentNode.hidden = true;
      this.peerId = null;
      document.removeEventListener('keyup', this.onKeyUp);
    }
  };

  onKeyUp = (event) => {
    if (event.keyCode === 27 && !MediaViewController.isOpen()) {
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
    const res = await ApiClient.callMethod('messages.search', {
      peer: MessagesApiManager.getInputPeerById(this.peerId),
      q: text,
      filter: {_: 'inputMessagesFilterEmpty'},
      offset_id: offsetId,
      limit: 30,
    });

    MessagesApiManager.updateMessages(res.messages);
    MessagesApiManager.updateChats(res.chats);
    MessagesApiManager.updateUsers(res.users);

    const count = res.count || res.messages.length;

    if (!offsetId) {
      this.listWrap.innerHTML = '';
      this.renderResultsHeader(count);
    }
    this.renderResults(res.messages);
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
    if (this.loading) {
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
