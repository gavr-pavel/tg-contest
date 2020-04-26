import {$, buildLoaderElement} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {MDCRipple} from '@material/ripple/component';

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

    if (MessagesApiManager.archivedDialogs.length) {
      this.renderChats(MessagesApiManager.archivedDialogs);
    } else {
      this.loadMore();
    }
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
          }
        })
        .finally(() => {
          this.loading = false;
        });
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

    const lastDialog = dialogs[dialogs.length - 1];
    const lastDialogMessage = MessagesApiManager.messages.get(lastDialog.top_message);
    this.offset = {
      id: lastDialog.top_message,
      peer: lastDialog.peer,
      date: lastDialogMessage.date,
    };
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
    new MDCRipple(el.firstElementChild);
    this.chatElements.set(peerId, el);
    return el;
  }
};

window.ArchivedChatsController = ArchivedChatsController;

export {ArchivedChatsController};
