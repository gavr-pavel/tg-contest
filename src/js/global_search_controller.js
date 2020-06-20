import {$, attachRipple, buildLoaderElement, debounce, formatCountLong, Tpl} from './utils';
import {ChatsController} from './chats_controller';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {App} from './app';
import {I18n} from './i18n';

const GlobalSearchController = new class {
  users = new Map();
  chats = new Map();

  show(input) {
    this.input = input;
    this.input.addEventListener('input', this.onInput);

    ChatsController.scrollContainer.hidden = true;
    this.container = $('.global_search_sidebar');
    this.container.hidden = false;

    this.container.onscroll = this.onScroll;

    this.loader = buildLoaderElement();

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    $('.chats_header_menu_button').hidden = true;

    this.onInput();
  }

  onBack = () => {
    this.input.removeEventListener('input', this.onInput);
    this.input.value = '';
    this.users.clear();
    this.chats.clear();

    this.container.hidden = true;
    this.container.innerHTML = '';
    ChatsController.scrollContainer.hidden = false;

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.hidden = true;
    backButtonEl.removeEventListener('click', this.onBack);

    $('.chats_header_menu_button').hidden = false;
  };

  onInput = debounce(() => {
    const value = this.input.value.trim();
    if (value === this.lastQuery) {
      return;
    }
    this.lastQuery = value;
    this.nextRate = null;
    this.noMore = false;
    if (this.loadMoreAbortController) {
      this.loadMoreAbortController.abort();
      this.loadMoreAbortController = null;
    }
    if (value) {
      this.container.innerHTML = '';
      this.container.append(this.loader);
      this.loadResults(value);
    } else {
      this.onBack();
    }
  }, 100);

  onScroll = () => {
    const container = this.container;
    if (!this.loading && !this.noMore && this.nextRate && container.scrollTop + container.offsetHeight > container.scrollHeight - 500) {
      this.loadMore();
    }
  };

  loadMore() {
    this.loadMoreAbortController = new AbortController();
    const signal = this.loadMoreAbortController.signal;
    const q = this.lastQuery;
    this.loading = true;
    ApiClient.callMethod('messages.searchGlobal', {
      q,
      limit: 20,
      offset_rate: this.nextRate,
      offset_peer: {_: 'inputPeerEmpty'}
    }).then((messages) => {
      if (signal.aborted) {
        return;
      }
      if (!messages.messages.length || messages.next_rate === this.nextRate) {
        this.noMore = true;
        this.nextRate = null;
      } else {
        MessagesApiManager.updateUsers(messages.users);
        MessagesApiManager.updateChats(messages.chats);
        this.nextRate = messages.next_rate;
        const container = $('.global_search_sublist-messages', this.container);
        this.appendMessages(container, messages.messages, q);
      }
    }).catch((error) => {
      console.log(error);
      const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
      App.alert(errorText);
    }).finally(() => {
      this.loading = false;
    });
  }

  async loadResults(q, contactsLimit = 20, messagesLimit = 20) {
    const [contacts, messages] = await Promise.all([
      ApiClient.callMethod('contacts.search', {q, limit: contactsLimit}),
      ApiClient.callMethod('messages.searchGlobal', {q, limit: messagesLimit, offset_peer: {_: 'inputPeerEmpty'}})
    ]);

    // this.saveTmpPeers(this.users, contacts.users, messages.users);
    // this.saveTmpPeers(this.chats, contacts.chats, messages.chats);
    MessagesApiManager.updateUsers(contacts.users);
    MessagesApiManager.updateUsers(messages.users);
    MessagesApiManager.updateChats(contacts.chats);
    MessagesApiManager.updateChats(messages.chats);

    this.nextRate = messages.next_rate;

    this.renderResults(q, contacts.my_results, contacts.results, messages.messages);
  }

  renderResults(q, myResults, globalResults, messages) {
    const frag = document.createDocumentFragment();
    frag.append(
      this.buildContactsSublist('Contacts and Chats', myResults, q, false),
      this.buildContactsSublist('Global Search', globalResults, q, true),
      this.buildMessagesSublist('Messages', messages, q)
    );
    this.container.innerHTML = '';
    this.container.append(frag);
  }

  buildContactsSublist(header, results, q, global) {
    if (!results.length) {
      return '';
    }
    const container = Tpl.html`
      <div class="global_search_sublist global_search_sublist-contacts">
        <div class="global_search_sublist_header">${header}</div>
      </div>
    `.buildElement();
    for (const peer of results) {
      const peerId = MessagesApiManager.getPeerId(peer);
      const peerData = MessagesApiManager.getPeerData(peer);
      const name = MessagesApiManager.getPeerName(peer);
      let status = '';
      if (!global && peer._ === 'peerUser') {
        const user = MessagesApiManager.getPeerData(peer);
        status = MessagesController.getUserStatusText(user);
      } else {
        if (peerData.username) {
          status = '@' + peerData.username;
        }
        if (peerData.participants_count) {
          const isChannel = peerData._ === 'channel' && !peerData.megagroup;
          status += (status ? ', ' : '') + I18n.getPlural(isChannel ? 'chats_n_followers' : 'chats_n_members', peerData.participants_count, {
            n: formatCountLong(peerData.participants_count)
          });
        }
      }

      const el = Tpl.html`
        <div class="contacts_item" data-peer-id="${peerId}">
          <div class="contacts_item_content mdc-ripple-surface">
            <div class="contacts_item_photo"></div>
            <div class="contacts_item_text">
              <div class="contacts_item_text_row">
                <div class="contacts_item_title">${name}</div>
              </div>
              <div class="contacts_item_text_row">
                <div class="contacts_item_status">${status}</div>
              </div>
            </div>
          </div>
        </div>
      `.buildElement();
      ChatsController.loadPeerPhoto($('.contacts_item_photo', el), peer);
      el.addEventListener('click', this.onPeerClick);
      attachRipple(el.firstElementChild);

      container.append(el);
    }
    return container;
  }

  buildMessagesSublist(header, messages, q) {
    if (!messages.length) {
      return '';
    }
    const container = Tpl.html`
      <div class="global_search_sublist global_search_sublist-messages">
        <div class="global_search_sublist_header">${header}</div>
      </div>
    `.buildElement();

    this.appendMessages(container, messages, q);

    return container;
  }

  appendMessages(container, messages, q) {
    const frag = document.createDocumentFragment();
    for (const message of messages) {
      const peer = MessagesApiManager.getMessageDialogPeer(message);
      const peerId = MessagesApiManager.getPeerId(peer);
      const title = MessagesApiManager.getPeerName(peer);
      const date = ChatsController.formatMessageDate(message);
      const messagePreview = ChatsController.getMessagePreview(message, q);
      const el = Tpl.html`
        <div class="messages_search_results_item" data-peer-id="${peerId}" data-message-id="${message.id}">
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
      ChatsController.loadPeerPhoto($('.messages_search_results_item_photo', el), peer);
      el.addEventListener('click', this.onPeerClick);
      frag.appendChild(el);
    }
    container.appendChild(frag);
  }

  onPeerClick = (event) => {
    const el = event.currentTarget;
    const peerId = +el.dataset.peerId;
    const messageId = +(el.dataset.messageId || 0);
    MessagesController.setChatByPeerId(peerId, messageId);
  };

  saveTmpPeers(map, ...lists) {
    for (const list of lists) {
      for (const object of list) {
        map.set(object.id, object);
      }
    }
  }
};

window.GlobalSearchController = GlobalSearchController;

export {GlobalSearchController};
