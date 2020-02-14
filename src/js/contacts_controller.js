import {$, buildHtmlElement} from "./utils";
import {MDCRipple} from "@material/ripple/component";
import {MessagesApiManager} from "./api/messages_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";

const ContactsController = new class {
  show() {
    ChatsController.container.hidden = true;

    this.container = $('.contacts_sidebar');
    this.container.innerHTML = '';
    this.container.hidden = false;

    this.loader = buildHtmlElement('<div class="lds-ring"><div></div><div></div><div></div><div></div></div>');
    this.container.append(this.loader);

    const backButtonEl = $('.left_sidebar .sidebar_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    $('.left_sidebar_menu_button').hidden = true;

    ApiClient.callMethod('contacts.getContacts').then((res) => {
      MessagesApiManager.updateUsers(res.users);
      this.loader.remove();
      this.render(res.contacts);
    });
  }

  render(contacts) {
    const frag = document.createDocumentFragment();
    for (const contact of contacts) {
      const user = MessagesApiManager.users.get(contact.user_id);
      const el = this.buildPreviewElement(user);
      frag.append(el);
    }
    this.container.append(frag);
  }

  buildPreviewElement(user) {
    const el = buildHtmlElement(`
      <div class="contacts_item" data-user-id="${user.id}">
        <div class="contacts_item_content mdc-ripple-surface">
          <div class="contacts_item_photo"></div>
          <div class="contacts_item_text"></div>      
        </div>
      </div>
    `);
    this.renderPreviewContent(el, user);
    this.loadContactPhoto(el, user);

    el.addEventListener('click', this.onContactClick);
    new MDCRipple(el.firstElementChild);

    return el;
  }

  loadContactPhoto(el, user) {
    const photoEl = $('.contacts_item_photo', el);
    const peer = MessagesApiManager.getUserPeer(user);
    ChatsController.loadPeerPhoto(photoEl, peer);
  }

  renderPreviewContent(el, user) {
    const name = MessagesApiManager.getUserName(user) || `+${user.phone}`;
    const status = MessagesController.getUserStatusText(user);

    $('.contacts_item_text', el).innerHTML = `
      <div class="contacts_item_text_row">
        <div class="contacts_item_title">${name}</div>
      </div>
      <div class="contacts_item_text_row">
        <div class="contacts_item_status">${status}</div>
      </div>
    `;
  }

  onBack = () => {
    this.container.hidden = true;
    ChatsController.container.hidden = false;

    const backButtonEl = $('.left_sidebar .sidebar_back_button');
    backButtonEl.hidden = true;
    backButtonEl.removeEventListener('click', this.onBack);

    $('.left_sidebar_menu_button').hidden = false;
  };

  onDialogOpened() {
    this.onBack();
  }

  onContactClick = (event) => {
    const el = event.currentTarget;
    const userId = +el.dataset.userId;

    let dialog = MessagesApiManager.getDialog(userId);
    if (dialog) {
      MessagesController.setChat(dialog);
      this.onDialogOpened();
    } else {
      MessagesApiManager.loadPeerDialog(MessagesApiManager.getPeerById(userId))
          .then((dialog) => {
            if (dialog) {
              MessagesController.setChat(dialog);
              this.onDialogOpened();
            }
          });
    }
  };
};

window.ContactsController = ContactsController;

export {ContactsController};
