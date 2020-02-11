import {$, buildHtmlElement} from "./utils";
import {MDCRipple} from "@material/ripple/component";
import {MessagesApiManager} from "./api/messages_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";

const ContactsController = new class {
  init() {
    const backButtonEl = $('.left_sidebar_back_button');

    ApiClient.callMethod('contacts.getContacts').then((res) => {
      ChatsController.container.hidden = true;

      this.container = $('.contacts_sidebar');
      this.container.innerHTML = '';
      this.container.hidden = false;

      MessagesApiManager.updateUsers(res.users);
      this.render(res.contacts);

      backButtonEl.addEventListener('click', this.onBack);
      backButtonEl.hidden = false;

      $('.left_sidebar_menu_button').hidden = true;
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
      <div class="contact_item mdc-ripple-surface" data-user-id="${user.id}">
        <div class="contact_item_photo"></div>
        <div class="contact_item_text"></div>
      </div>
    `);
    this.renderPreviewContent(el, user);
    this.loadContactPhoto(el, user);

    el.addEventListener('click', this.onContactClick);
    new MDCRipple(el);

    return el;
  }

  loadContactPhoto(el, user) {
    const photoEl = $('.contact_item_photo', el);

    const photo = user.photo;
    if (!photo) {
      this.setContactPhotoPlaceholder(photoEl, user);
      return;
    }

    const peer = MessagesApiManager.getUserPeer(user);

    FileApiManager.loadPeerPhoto(peer, photo.photo_small, false, photo.dc_id, {priority: 10, cache: true})
      .then((url) => {
        photoEl.innerHTML = `<img src="${url}" alt class="contact_item_photo_img">`;
      })
      .catch((error) => {
        console.warn('contact photo load error', error);
      });
  }

  renderPreviewContent(el, user) {
    const name = MessagesApiManager.getUserName(user) || `+${user.phone}`;
    const status = user.status ? MessagesController.getUserStatus(user.status) : 'last seen a long time ago';

    $('.contact_item_text', el).innerHTML = `
      <div class="contact_item_text_row">
        <div class="contact_item_title">${name}</div>
      </div>
      <div class="contact_item_text_row">
        <div class="contact_item_status">${status}</div>
      </div>
    `;
  }

  setContactPhotoPlaceholder(photoEl, user) {
    const name = MessagesApiManager.getUserName(user);
    photoEl.style.backgroundColor = ChatsController.getPlaceholderColor(user.id);
    photoEl.innerHTML = '<div class="contact_item_photo_placeholder">' + name.charAt(0) + '</div>';
  }

  onBack = () => {
    this.container.hidden = true;
    ChatsController.container.hidden = false;

    const backButtonEl = $('.left_sidebar_back_button');
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
