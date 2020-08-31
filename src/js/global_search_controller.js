import {
  $,
  attachRipple,
  buildLoaderElement,
  debounce,
  formatCountLong,
  initHorizontalScroll,
  Storage,
  Tpl
} from './utils';
import {ChatsController} from './chats_controller';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {App} from './app';
import {I18n} from './i18n';

const GlobalSearchController = new class {
  users = new Map();
  chats = new Map();

  show(input) {
    if (this.container && !this.container.hidden) {
      return;
    }

    this.input = input;
    this.input.addEventListener('input', this.onInput);

    ChatsController.hide();
    this.container = $('.global_search_sidebar');
    this.container.innerHTML = Tpl.html`
      <div class="global_search_people global_search_sublist global_search_sublist-people" hidden>
        <div class="global_search_sublist_header">People</div>
      </div>
      <div class="global_search_recent global_search_sublist global_search_sublist-recent" hidden>
        <div class="global_search_sublist_header">Recent<button class="mdc-icon-button global_search_sublist_header_clear"></button></div>
      </div>
      <div class="global_search_results"></div> 
    `;
    this.container.hidden = false;
    this.container.onscroll = this.onScroll;

    this.peopleContainer = $('.global_search_people', this.container);
    this.recentContainer = $('.global_search_recent', this.container);
    this.resultsContainer = $('.global_search_results', this.container);

    this.loader = buildLoaderElement();

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    $('.chats_header_menu_button').hidden = true;

    Promise.all([
      this.loadPeople(),
      this.loadRecent()
    ]).then(([topPeers, recentPeers]) => {
      if (topPeers.length) {
        this.renderPeople(topPeers);
      }
      if (recentPeers.length) {
        this.renderRecent(recentPeers);
      }
    });
  }

  onBack = () => {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.input.removeEventListener('input', this.onInput);
    this.input.value = '';
    this.users.clear();
    this.chats.clear();

    this.container.hidden = true;
    this.container.innerHTML = '';
    ChatsController.show();

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
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.resultsContainer.innerHTML = '';
    if (value) {
      this.peopleContainer.hidden = true;
      this.recentContainer.hidden = true;
      this.resultsContainer.append(this.loader);
      this.loadResults(value);
    } else {
      if (this.peopleContainer.dataset.loaded) {
        this.peopleContainer.hidden = false;
      }
      if (this.recentContainer.dataset.loaded) {
        this.recentContainer.hidden = false;
      }
      // this.onBack();
    }
  }, 100);

  onScroll = () => {
    const container = this.container;
    if (!this.loading && !this.noMore && this.nextRate && container.scrollTop + container.offsetHeight > container.scrollHeight - 500) {
      this.loadMore();
    }
  };

  loadMore() {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
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
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const [contacts, messages] = await Promise.all([
      ApiClient.callMethod('contacts.search', {q, limit: contactsLimit}),
      ApiClient.callMethod('messages.searchGlobal', {q, limit: messagesLimit, offset_peer: {_: 'inputPeerEmpty'}})
    ]);

    if (signal.aborted) {
      return;
    }

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
      this.buildContactsSublist('Contacts and Chats', myResults, false),
      this.buildContactsSublist('Global Search', globalResults, true),
      this.buildMessagesSublist('Messages', messages, q)
    );
    this.resultsContainer.innerHTML = '';
    this.resultsContainer.append(frag);
  }

  buildContactsSublist(header, results, global) {
    if (!results.length) {
      return '';
    }
    const container = Tpl.html`
      <div class="global_search_sublist global_search_sublist-contacts">
        <div class="global_search_sublist_header">${header}</div>
      </div>
    `.buildElement();
    for (const peer of results) {
      const el = this.buildContactElement(peer);
      container.append(el);
    }
    return container;
  }

  buildContactElement(peer, global = false) {
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
    return el;
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
    const inputPeer = MessagesApiManager.getInputPeerById(peerId);
    this.saveRecentPeer(inputPeer);
  };

  // saveTmpPeers(map, ...lists) {
  //   for (const list of lists) {
  //     for (const object of list) {
  //       map.set(object.id, object);
  //     }
  //   }
  // }

  async loadPeople() {
    let res = this.people;
    if (!res) {
      res = await ApiClient.callMethod('contacts.getTopPeers', {
        correspondents: true,
        offset: 0,
        limit: 20,
        hash: 0
      });
      this.people = res;
    }

    if (res._ === 'contacts.topPeersDisabled') {
      return;
    }

    MessagesApiManager.updateUsers(res.users);
    MessagesApiManager.updateChats(res.chats);

    const category = res.categories.find(item => item.category._ === 'topPeerCategoryCorrespondents');
    const peers = category.peers.map(item => item.peer).filter(peer => peer.user_id !== App.getAuthUserId());
    return peers;
  }

  renderPeople(peers) {
    const list = Tpl.html`<div class="global_search_people_list"></div>`.buildElement();
    initHorizontalScroll(list);
    for (const peer of peers) {
      const peerId = MessagesApiManager.getPeerId(peer);
      const name = MessagesApiManager.getPeerName(peer, false);
      const el = Tpl.html`
        <div class="global_search_people_item" data-peer-id="${peerId}">
          <div class="global_search_people_item_photo"></div>
          <div class="global_search_people_item_name">${name}</div>
        </div>
      `.buildElement();
      list.appendChild(el);
      ChatsController.loadPeerPhoto($('.global_search_people_item_photo', el), peer);
      el.addEventListener('click', this.onPeerClick);
    }
    this.peopleContainer.appendChild(list);
    this.peopleContainer.dataset.loaded = true;
    this.peopleContainer.hidden = false;
  }

  async loadRecent() {
    const inputPeers = this.getRecentPeers();
    if (inputPeers.length) {
      try {
        await MessagesApiManager.loadPeers(inputPeers);
        return inputPeers.map(inputPeer => MessagesApiManager.getPeerByInputPeer(inputPeer));
      } catch (e) {
        console.log(e);
      }
    }
    return [];
  }

  renderRecent(peers) {
    const frag = document.createDocumentFragment();
    for (const peer of peers) {
      const el = this.buildContactElement(peer);
      frag.appendChild(el);
    }
    this.recentContainer.appendChild(frag);
    this.recentContainer.dataset.loaded = true;
    this.recentContainer.hidden = false;
    $('.global_search_sublist_header_clear', this.container).onclick = () => {
      Storage.remove('global_search_recent_peers');
      delete this.recentContainer.dataset.loaded;
      this.recentContainer.hidden = true;
    };
  }

  getRecentPeers() {
    return Storage.get('global_search_recent_peers') || [];
  }

  saveRecentPeer(peer) {
    let list = this.getRecentPeers();
    const peerId = MessagesApiManager.getPeerId(peer);
    list = list.filter(p => MessagesApiManager.getPeerId(p) !== peerId);
    list.unshift(peer);
    Storage.set('global_search_recent_peers', list);
  }
};

window.GlobalSearchController = GlobalSearchController;

export {GlobalSearchController};
