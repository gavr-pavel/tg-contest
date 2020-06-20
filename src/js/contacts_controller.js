import {$, attachRipple, buildLoaderElement, Tpl} from './utils';
import {MDCRipple} from "@material/ripple/component";
import {MessagesApiManager} from "./api/messages_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";

const ContactsController = new class {
  show() {
    ChatsController.scrollContainer.hidden = true;

    this.container = $('.contacts_sidebar');
    this.container.hidden = false;

    this.loader = buildLoaderElement(this.container);

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    $('.chats_header_menu_button').hidden = true;

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
      const el = this.buildItemElement(user);
      frag.append(el);
    }
    this.container.append(frag);
  }

  buildItemElement(user) {
    const name = MessagesApiManager.getUserName(user) || `+${user.phone}`;
    const status = MessagesController.getUserStatusText(user);

    const el = Tpl.html`
      <div class="contacts_item" data-user-id="${user.id}">
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

    this.loadContactPhoto(el, user);

    el.addEventListener('click', this.onContactClick);
    attachRipple(el.firstElementChild);

    return el;
  }

  loadContactPhoto(el, user) {
    const photoEl = $('.contacts_item_photo', el);
    const peer = MessagesApiManager.getUserPeer(user);
    ChatsController.loadPeerPhoto(photoEl, peer);
  }

  onBack = () => {
    this.container.hidden = true;
    this.container.innerHTML = '';
    ChatsController.scrollContainer.hidden = false;

    const backButtonEl = $('.chats_header_back_button');
    backButtonEl.hidden = true;
    backButtonEl.removeEventListener('click', this.onBack);

    $('.chats_header_menu_button').hidden = false;
  };

  onContactClick = (event) => {
    const el = event.currentTarget;
    const userId = +el.dataset.userId;
    MessagesController.setChatByPeerId(userId);
  };
};

window.ContactsController = ContactsController;

export {ContactsController};
