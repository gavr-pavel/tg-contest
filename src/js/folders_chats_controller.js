import '../css/folders_settings.scss';
import {$, attachRipple, initScrollBorder, Tpl} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {ChatsController} from './chats_controller';
import {App} from './app';

class FoldersChatsController {
  show(types, peers, title, onSave) {
    this.container = Tpl.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">${title}</div>
          <button class="mdc-icon-button folders_settings_header_save_button" hidden></button>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_chats_list folders_settings_chats_list-types">
            <div class="folders_settings_chats_list_title">Chat types</div>
          </div>
          <div class="folders_settings_chats_list folders_settings_chats_list-peers">
            <div class="folders_settings_chats_list_title">Chats</div>
          </div>
        </div>
      </div>
    `.buildElement();

    $('.left_sidebar').appendChild(this.container);

    const scrollContainer = $('.folders_settings', this.container);
    scrollContainer.addEventListener('scroll', this.onScroll);
    initScrollBorder(scrollContainer);
    this.scrollContainer = scrollContainer;

    const saveButton = $('.folders_settings_header_save_button', this.container);
    saveButton.addEventListener('click', () => {
      this.hide();
      const peers = Array.from(this.selectedPeers.values());
      onSave(this.diffTypes, peers);
    });
    this.saveButton = saveButton;

    const backButtonEl = $('.sidebar_back_button', this.container);
    backButtonEl.addEventListener('click', this.onBack);
    attachRipple(backButtonEl);

    requestAnimationFrame(() => this.container.hidden = false);

    this.diffTypes = new Map();
    this.diffPeers = new Map();
    this.selectedPeers = new Map(peers.map(peer => [MessagesApiManager.getPeerId(peer), peer]));

    this.renderChatTypes(types);

    this.peersOffset = {
      id: 0,
      peer: 0,
      date: 0,
    };
    this.noMore = false;
    this.loadMorePeers();
  }

  hide() {
    this.container.hidden = true;
    setTimeout(() => this.container.remove(), 1000);
  }

  onBack = () => {
    this.hide();
  }

  renderChatTypes(types) {
    const frag = document.createDocumentFragment();
    for (const [enabled, name, type] of types) {
      const el = Tpl.html`
        <div class="folders_settings_chat folders_settings_chat-option ${enabled ? 'folders_settings_chat-selected' : ''}" data-type="${type}">
          <div class="folders_settings_chat_icon folders_settings_chat_icon-${type}"></div>
          <div class="folders_settings_chat_name _cut_text">${name}</div>
        </div>
      `.buildElement();
      el.addEventListener('click', this.onChatTypeClick);
      frag.appendChild(el);
    }
    const container = $('.folders_settings_chats_list-types', this.container);
    container.appendChild(frag);
  }
  async loadMorePeers() {
    if (this.noMore || this.loading) {
      return;
    }

    let dialogs = [];
    const offsetDate = this.peersOffset.peer ? MessagesApiManager.getPeerId(this.peersOffset.peer) : 0;
    const index = MessagesApiManager.dialogs.findIndex((dialog) => {
      const message = MessagesApiManager.messages.get(dialog.top_message);
      return message && message.date < offsetDate;
    });
    if (index > -1) {
      dialogs = MessagesApiManager.dialogs.slice(index, index + 20);
    }
    if (!dialogs.length) {
      this.loading = true;
      try {
        dialogs = await MessagesApiManager.loadDialogs(this.peersOffset);
      } catch(e) {
        console.log(error);
        const errorText = 'An error occurred' + (error.error_message ? ': ' + error.error_message : '');
        App.alert(errorText);
        return;
      } finally {
        this.loading = false;
      }
      if (!dialogs.length) {
        this.noMore = true;
        return;
      }
      const lastDialog = dialogs[dialogs.length - 1];
      const lastDialogMessage = MessagesApiManager.messages.get(lastDialog.top_message);
      if (lastDialogMessage) {
        this.peersOffset = {
          id: lastDialog.top_message,
          peer: lastDialog.peer,
          date: lastDialogMessage.date,
        };
      }
    }
    const peers = dialogs.map(dialog => dialog.peer);
    this.renderPeers(peers);
  }

  onScroll = () => {
    const container = this.scrollContainer;
    if (this.loading || !this.noMore && container.scrollTop + container.offsetHeight > container.scrollHeight - 300) {
      this.loadMorePeers();
    }
  }

  renderPeers(peers) {
    const frag = document.createDocumentFragment();
    for (const peer of peers) {
      if (MessagesApiManager.getPeerData(peer).deleted) {
        continue;
      }
      const peerId = MessagesApiManager.getPeerId(peer);
      const peerName = MessagesApiManager.getPeerName(peer);
      const enabled = this.selectedPeers.has(peerId);
      const el = Tpl.html`
      <div class="folders_settings_chat folders_settings_chat-option ${enabled ? 'folders_settings_chat-selected' : ''}" data-peer-id="${peerId}">
        <div class="folders_settings_chat_photo"></div>
        <div class="folders_settings_chat_name _cut_text">${peerName}</div>
      </div>
    `.buildElement();
      const photoEl = $('.folders_settings_chat_photo', el);
      ChatsController.loadPeerPhoto(photoEl, peer);
      el.addEventListener('click', this.onPeerClick);
      frag.appendChild(el);
    }
    const container = $('.folders_settings_chats_list-peers', this.container);
    container.appendChild(frag);
  }

  onChatTypeClick = (event) => {
    const el = event.currentTarget;
    const type = el.dataset.type;
    const enabled = el.classList.toggle('folders_settings_chat-selected');
    if (this.diffTypes.has(type)) {
      this.diffTypes.delete(type);
    } else {
      this.diffTypes.set(type, enabled);
    }
    this.checkDiff();
  }

  onPeerClick = (event) => {
    const el = event.currentTarget;
    const peerId = +el.dataset.peerId;
    const enabled = el.classList.toggle('folders_settings_chat-selected');
    if (enabled) {
      this.selectedPeers.set(peerId, MessagesApiManager.getPeerById(peerId));
    } else {
      this.selectedPeers.delete(peerId);
    }
    if (this.diffPeers.has(peerId)) {
      this.diffPeers.delete(peerId);
    } else {
      this.diffPeers.set(peerId, enabled);
    }
    this.checkDiff();
  }

  checkDiff() {
    this.saveButton.hidden = !this.diffTypes.size && !this.diffPeers.size;
  }
}

export {FoldersChatsController};
