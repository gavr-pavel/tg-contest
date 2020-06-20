import {$, Tpl, buildLoaderElement, attachRipple, attachMenuListener} from './utils';
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

    MessagesApiManager.emitter.on('onDialogOrderUpdate', this.onDialogOrderUpdate);

    if (MessagesApiManager.archivedDialogs.length) {
      this.renderChats(MessagesApiManager.archivedDialogs);
      const lastItem = MessagesApiManager.archivedDialogs.slice(-1)[0];
      if (!lastItem.pinned) {
        this.saveOffset(lastItem);
      }
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
      const el = ChatsController.chatElements.get(peerId) || ChatsController.buildChatPreviewElement(dialog);
      frag.append(el);
    }
    this.scrollContainer.append(frag);
  }

  onDialogOrderUpdate = (event) => {
    const {dialog, index, folderId} = event.detail;
    if (folderId !== 1) {
      return;
    }
    const chatId = MessagesApiManager.getPeerId(dialog.peer);
    let el = this.chatElements.get(chatId);
    if (el) {
      el.classList.toggle('chats_item-pinned', !!dialog.pinned);
      ChatsController.renderChatPreviewContent(el, dialog);
    } else {
      el = ChatsController.buildChatPreviewElement(dialog);
    }
    const container = this.scrollContainer;
    const nextEl = container.children[index];
    if (nextEl) {
      nextEl.before(el);
    } else {
      container.appendChild(el);
    }
  };

  // buildChatPreviewElement(dialog) {
  //   const peerId = MessagesApiManager.getPeerId(dialog.peer);
  //   const el = Tpl.html`
  //     <div class="chats_item" data-peer-id="${peerId}">
  //       <div class="chats_item_content mdc-ripple-surface">
  //         <div class="chats_item_photo"></div>
  //         <div class="chats_item_text"></div>
  //       </div>
  //     </div>
  //   `.buildElement();
  //   ChatsController.renderChatPreviewContent(el, dialog);
  //   ChatsController.loadChatPhoto(el, dialog);
  //   el.addEventListener('click', ChatsController.onChatClick);
  //   attachRipple(el.firstElementChild);
  //   attachMenuListener(el, ChatsController.onChatMenu);
  //   ChatsController.chatElements.set(peerId, el);
  //   return el;
  // }
};

window.ArchivedChatsController = ArchivedChatsController;

export {ArchivedChatsController};
