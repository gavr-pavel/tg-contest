import {$, Tpl, buildLoaderElement, attachRipple} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';

const ArchivedChatsController = new class {
  chatElements = new Map();

  show() {
    this.container = $('.archived_chats_sidebar');
    this.container.hidden = false;

    this.container.innerHTML = `
      <div class="sidebar_header">
        <div class="sidebar_header_title">Archived chats</div>
      </div>
      <div class="archived_chats_list"></div>
    `;

    this.scrollContainer = $('.archived_chats_list', this.container);

    this.loader = buildLoaderElement(this.scrollContainer);

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    MessagesApiManager.emitter.on('dialogsUpdate', this.onDialogsUpdate);

    if (MessagesApiManager.archivedDialogs) {
      this.renderChats(MessagesApiManager.archivedDialogs);
      this.saveOffset(MessagesApiManager.archivedDialogs.slice(-1)[0]);
    }
    this.loadMore();
  }

  onBack = (event) => {
    this.chatElements.clear();
    this.container.hidden = true;
    const backButtonEl = event.currentTarget;
    backButtonEl.removeEventListener('click', this.onBack);
    backButtonEl.hidden = true;
  };

  onDialogsUpdate = (event) => {
    const {dialogs, folderId} = event.detail;
    if (folderId === 1) {
      this.renderChats(dialogs);
    }
  };

  loadMore() {
    this.loading = true;
    MessagesApiManager.loadArchivedDialogs(this.offset)
        .then((dialogs) => {
          if (!dialogs.length) {
            this.noMore = true;
          } else {
            this.renderChats(dialogs);
            this.saveOffset(dialogs.slice(-1)[0]);
          }
        })
        .finally(() => {
          this.loading = false;
        });
  }

  saveOffset(dialog) {
    const message = MessagesApiManager.messages.get(dialog.top_message);
    this.offset = {
      id: dialog.top_message,
      peer: dialog.peer,
      date: message.date,
    };
  }

  renderChats(dialogs) {
    this.loader.remove();

    const frag = document.createDocumentFragment();
    for (const dialog of dialogs) {
      const peerId = MessagesApiManager.getPeerId(dialog.peer);
      if (this.chatElements.has(peerId)) {
        continue;
      }
      const el = this.buildChatPreviewElement(dialog);
      frag.append(el);
    }
    this.scrollContainer.append(frag);
  }

  buildChatPreviewElement(dialog) {
    const peerId = MessagesApiManager.getPeerId(dialog.peer);
    const el = Tpl.html`
      <div class="chats_item" data-peer-id="${peerId}">
        <div class="chats_item_content mdc-ripple-surface">
          <div class="chats_item_photo"></div>
          <div class="chats_item_text"></div>        
        </div>
      </div>
    `.buildElement();
    ChatsController.renderChatPreviewContent(el, dialog);
    ChatsController.loadChatPhoto(el, dialog);
    el.addEventListener('click', ChatsController.onChatClick);
    attachRipple(el.firstElementChild);
    this.chatElements.set(peerId, el);
    return el;
  }
};

window.ArchivedChatsController = ArchivedChatsController;

export {ArchivedChatsController};
