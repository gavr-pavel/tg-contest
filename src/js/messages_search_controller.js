import {$, buildHtmlElement, debounce, encodeHtmlEntities} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';

const MessagesSearchController = new class {
  show(peerId) {
    this.container = $('.right_sidebar');
    this.container.hidden = false;

    if (peerId === this.peerId) {
      return;
    }
    this.peerId = peerId;

    this.container.innerHTML = `
      <div class="sidebar_header">
        <button type="button" class="sidebar_close_button mdc-icon-button"></button>
        <input class="messages_search_input" type="text">
      </div>
      <div class="messages_search_results_list">
        <div class="messages_search_results_list_placeholder">Start typing...</div>
      </div>
    `;

    const closeButton = $('.sidebar_close_button', this.container);
    closeButton.addEventListener('click', this.close);

    this.input = $('.messages_search_input', this.container);
    this.input.addEventListener('input', debounce(this.onInput, 100));

    this.listWrap = $('.messages_search_results_list', this.container);
  }

  close = () => {
    this.container.hidden = true;
  };

  onInput = () => {
    const q = this.input.value.trim();
    this.listWrap.innerHTML = '';
    this.loadResults(q);
  };

  async loadResults(text) {
    const res = await ApiClient.callMethod('messages.search', {
      peer: MessagesApiManager.getInputPeerById(this.peerId),
      q: text,
      filter: {_: 'inputMessagesFilterEmpty'},
      offset_id: 0,
      limit: 10,
    });

    MessagesApiManager.updateMessages(res.messages);
    MessagesApiManager.updateChats(res.chats);
    MessagesApiManager.updateUsers(res.users);

    const count = res.count || res.messages.length;
    this.renderResultsHeader(count);
    this.renderResults(res.messages);
  }

  renderResultsHeader(count) {
    this.listWrap.prepend(`
      <div class="messages_search_results_header">${count} messages found</div>
    `);
  }

  renderResults(messages) {
    const frag = document.createDocumentFragment();

    for (const message of messages) {
      const peer = MessagesApiManager.getMessagePeer(message);
      const peerName = MessagesApiManager.getPeerName(peer);
      const el = buildHtmlElement(`
        <div class="messages_search_results_item">${encodeHtmlEntities(peerName)}: ${encodeHtmlEntities(message.message)}}</div>
      `);
      frag.append(el);
    }

    const listWrap = $('.messages_search_results_list', this.container);
    listWrap.append(frag);
  }
};

window.MessagesSearchController = MessagesSearchController;

export {MessagesSearchController};
