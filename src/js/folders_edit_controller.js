import '../css/folders_settings.scss';
import {$, $$, attachRipple, buildMenu, initScrollBorder, Tpl} from './utils';
import {MDCTextField} from '@material/textfield/index';
import {ChatsController} from './chats_controller';
import {MessagesApiManager} from './api/messages_api_manager';
import {FoldersChatsController} from './folders_chats_controller';

class FoldersEditController {
  show(filter, create = false, onSave) {
    this.filter = filter;

    this.container = Tpl.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">${create ? 'New Folder' : 'Edit Folder'}</div>
          <button class="mdc-icon-button folders_settings_header_save_button ${create ? 'folders_settings_header_create_button' : 'folders_settings_header_edit_button'}" hidden></button>
          <button class="mdc-icon-button sidebar_extra_menu_button" hidden></button>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_intro">
            <tgs-player src="tgs/Folders_2.tgs" autoplay class="folders_settings_intro_image"></tgs-player>
            <div class="folders_settings_intro_text" ${create ? '': 'hidden'}>Choose chats and type of chats that will<br>appear and never appear in this folder.</div>
            <div class="mdc-text-field mdc-text-field--outlined folders_settings_title_text_field">
              <input class="mdc-text-field__input" value="${filter.title}">
              <div class="mdc-notched-outline">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__notch">
                  <label class="mdc-floating-label">Folder Name</label>
                </div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
          </div>
          <div class="folders_settings_chats_list">
            <div class="folders_settings_chats_list_title">Included chats</div>
            <button class="folders_settings_chats_list_add_button" data-type="included">Add Chats</button>
            <div class="folders_settings_chats_list_content folders_settings_chats_list_content-included"></div>
          </div>
          <div class="folders_settings_chats_list">
            <div class="folders_settings_chats_list_title">Excluded chats</div>
            <button class="folders_settings_chats_list_add_button" data-type="excluded">Add Chats</button>
            <div class="folders_settings_chats_list_content folders_settings_chats_list_content-excluded"></div>
          </div>
        </div>
      </div>
    `.buildElement();

    $('.left_sidebar').appendChild(this.container);

    initScrollBorder($('.folders_settings', this.container));

    const saveButton = $('.folders_settings_header_save_button', this.container);
    saveButton.addEventListener('click', () => {
      this.hide();
      onSave(this.filter);
    });
    this.saveButton = saveButton;

    const moreButton = $('.sidebar_extra_menu_button', this.container);
    moreButton.addEventListener('click', () => {
    });

    const titleField = new MDCTextField($('.folders_settings_title_text_field', this.container));
    titleField.input_.addEventListener('input', () => {
      filter.title = titleField.value.trim();
      this.titleChanged = true;
      this.checkDiff();
    });

    for (const addChatsButton of $$('.folders_settings_chats_list_add_button', this.container)) {
      addChatsButton.addEventListener('click', this.onAddChatsClick);
    }

    const backButtonEl = $('.sidebar_back_button', this.container);
    backButtonEl.addEventListener('click', this.onBack);
    attachRipple(backButtonEl);

    requestAnimationFrame(() => this.container.hidden = false);

    if (!create) {
      Promise.all([
        this.loadPeers(filter.include_peers),
        this.loadPeers(filter.exclude_peers)
      ]).then(([includePeers, excludePeers]) => {
        this.renderIncludedChats(filter, includePeers);
        this.renderExcludedChats(filter, excludePeers);
      });
    }
  }

  hide() {
    this.container.hidden = true;
    setTimeout(() => this.container.remove(), 1000);
  }

  onBack = () => {
    this.hide();
  };

  async loadPeers(peers) {
    await MessagesApiManager.loadPeers(peers);
    return peers.map(inputPeer => MessagesApiManager.getPeerByInputPeer(inputPeer));
  }

  getIncludedChatTypes(filter) {
    return [
      [filter.contacts, 'Contacts', 'contacts'],
      [filter.non_contacts, 'Non-Contacts', 'non_contacts'],
      [filter.groups, 'Groups', 'groups'],
      [filter.broadcasts, 'Channels', 'broadcasts'],
      [filter.bots, 'Bots', 'bots'],
    ];
  }

  getExcludedChatTypes(filter) {
    return [
      [filter.exclude_muted, 'Muted', 'exclude_muted'],
      [filter.exclude_read, 'Read', 'exclude_read'],
      [filter.exclude_archived, 'Archived', 'exclude_archived'],
    ];
  }

  renderIncludedChats(filter, peers) {
    const types = this.getIncludedChatTypes(filter);
    const container = $('.folders_settings_chats_list_content-included', this.container);
    this.renderChatsList(types, peers, container);
  }

  renderExcludedChats(filter, peers) {
    const types = this.getExcludedChatTypes(filter);
    const container = $('.folders_settings_chats_list_content-excluded', this.container);
    this.renderChatsList(types, peers, container);
  }

  renderChatsList(types, peers, container) {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const [enabled, name, type] of types) {
      if (enabled) {
        const el = this.buildChatElement(name, type);
        frag.appendChild(el);
      }
    }
    for (const peer of peers) {
      const name = MessagesApiManager.getPeerName(peer);
      const el = this.buildChatElement(name, null, peer);
      frag.appendChild(el);
    }
    if (frag.childElementCount) {
      container.appendChild(frag);
      container.hidden = false;
    }
  }

  buildChatElement(name, type, peer = null) {
    const el = Tpl.html`
      <div class="folders_settings_chat">
        ${ peer
          ? Tpl.html`<div class="folders_settings_chat_photo"></div>`
          : Tpl.html`<div class="folders_settings_chat_icon folders_settings_chat_icon-${type}"></div>`
        }
        <div class="folders_settings_chat_name _cut_text">${name}</div>
      </div>
    `.buildElement();
    if (peer) {
      const photoEl = $('.folders_settings_chat_photo', el);
      ChatsController.loadPeerPhoto(photoEl, peer);
    }
    return el;
  }

  onAddChatsClick = (event) => {
    const button = event.currentTarget;
    const included = button.dataset.type === 'included';
    const filter = this.filter;
    const title = included ? 'Included Chats' : 'Excluded Chats';
    const types = included ? this.getIncludedChatTypes(filter) : this.getExcludedChatTypes(filter);
    const peers = (included ? filter.include_peers : filter.exclude_peers).map(inputPeer => (
        MessagesApiManager.getPeerByInputPeer(inputPeer)
    ));
    new FoldersChatsController().show(types, peers, title, (diffTypes, peers) => {
      const filter = this.filter;
      for (const [type, enabled] of diffTypes.entries()) {
        if (enabled) {
          filter[type] = true;
        } else {
          delete filter[type];
        }
      }
      if (included) {
        filter.include_peers = peers.map(peer => MessagesApiManager.getInputPeer(peer));
        this.renderIncludedChats(filter, peers);
      } else {
        filter.exclude_peers = peers.map(peer => MessagesApiManager.getInputPeer(peer));
        this.renderExcludedChats(filter, peers);
      }
      this.chatsChanged = true;
      this.checkDiff();
    });
  }

  checkDiff() {
    const filter = this.filter;
    const includedChats = this.getIncludedChatTypes(filter).some(([enabled]) => enabled) || !!filter.include_peers.length;
    this.saveButton.hidden = !filter.title || !includedChats || !this.titleChanged && !this.chatsChanged;
  }
}

export {FoldersEditController};
