import {$, buildHtmlElement, buildLoaderElement, encodeHtmlEntities} from './utils';
import {ChatsController} from './chats_controller';
import {MessagesApiManager} from './api/messages_api_manager';
import {MessagesController} from './messages_controller';
import {MDCRipple} from '@material/ripple/component';

const GlobalSearchController = new class {
  users = new Map();
  chats = new Map();

  show(input) {
    this.input = input;
    this.input.addEventListener('input', this.onInput);

    ChatsController.container.hidden = true;
    this.container = $('.global_search_sidebar');
    this.container.hidden = false;

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
    ChatsController.container.hidden = false;

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.hidden = true;
    backButtonEl.removeEventListener('click', this.onBack);

    $('.chats_header_menu_button').hidden = false;
  };

  onInput = () => {
    const value = this.input.value.trim();
    if (value) {
      this.container.innerHTML = '';
      this.container.append(this.loader);
      this.loadResults(value);
    } else {
      this.onBack();
    }
  };

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

    this.renderResults(contacts.my_results, contacts.results, messages.messages);
  }

  renderResults(myResults, globalResults, messages) {
    const frag = document.createDocumentFragment();
    frag.append(
      this.buildContactsSublist('Contacts and Chats', myResults),
      this.buildContactsSublist('Global Search', globalResults),
      this.buildMessagesSublist('Messages', messages)
    );
    this.container.innerHTML = '';
    this.container.append(frag);
  }

  buildContactsSublist(header, results) {
    if (!results.length) {
      return '';
    }
    const container = buildHtmlElement(`
      <div class="global_search_sublist">
        <div class="global_search_sublist_header">${header}</div>
      </div>
    `);
    for (const peer of results) {
      const peerId = MessagesApiManager.getPeerId(peer);
      const name = MessagesApiManager.getPeerName(peer);
      const status = peer._ === 'peerUser' ? MessagesController.getUserStatusText(MessagesApiManager.getPeerData(peer)) : '';

      const el = buildHtmlElement(`
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
    `);
      ChatsController.loadPeerPhoto($('.contacts_item_photo', el), peer);
      el.addEventListener('click', this.onPeerClick);
      new MDCRipple(el.firstElementChild);

      container.append(el);
    }
    return container;
  }

  buildMessagesSublist(header, messages) {
    if (!messages.length) {
      return '';
    }
    const container = buildHtmlElement(`
      <div class="global_search_sublist">
        <div class="global_search_sublist_header">${header}</div>
      </div>
    `);
    for (const message of messages) {
      const peer = MessagesApiManager.getMessageDialogPeer(message);
      const peerId = MessagesApiManager.getPeerId(peer);
      const title = MessagesApiManager.getPeerName(peer);
      const date = ChatsController.formatMessageDate(message);
      const messagePreview = ChatsController.getMessagePreview(message);
      const el = buildHtmlElement(`
        <div class="messages_search_results_item" data-peer-id="${peerId}" data-message-id="${message.id}">
          <div class="messages_search_results_item_content mdc-ripple-surface">
            <div class="messages_search_results_item_photo"></div>
            <div class="messages_search_results_item_text">
              <div class="messages_search_results_item_text_row">
                <div class="messages_search_results_item_title">${encodeHtmlEntities(title)}</div>
                <div class="messages_search_results_item_date">${date}</div>
              </div>
              <div class="messages_search_results_item_text_row">
                <div class="messages_search_results_item_message">${messagePreview}</div>
              </div>
            </div>      
          </div>
        </div>
      `);
      ChatsController.loadPeerPhoto($('.messages_search_results_item_photo', el), peer);
      el.addEventListener('click', this.onPeerClick);
      container.append(el);
    }
    return container;
  }

  onPeerClick = (event) => {
    const el = event.currentTarget;
    const peerId = +el.dataset.peerId;
    MessagesController.setChatByPeerId(peerId);
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
