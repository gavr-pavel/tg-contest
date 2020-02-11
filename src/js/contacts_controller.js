import {$, buildHtmlElement} from "./utils";
import {MDCRipple} from "@material/ripple/component";
import {MessagesApiManager} from "./api/messages_api_manager";
import {MessagesController} from "./messages_controller";
import {ChatsController} from "./chats_controller";

const ContactsController = new class {
  init() {
    const backButtonEl = $('.left_sidebar_back_button');

    ApiClient.callMethod('contacts.getContacts', {}).then((res) => {
      ChatsController.container.hidden = true;

      this.container = $('.contacts_sidebar');
      this.container.innerHTML = '';
      this.container.hidden = false;

      MessagesApiManager.updateUsers(res.users);
      this.render(res.users);

      backButtonEl.addEventListener('click', this.onBack);
      backButtonEl.hidden = false;

      $('.left_sidebar_menu_button').hidden = true;
    });
  }

  render(contacts) {
    const frag = document.createDocumentFragment();
    for (const contact of contacts) {
      const el = this.buildPreviewElement(contact);
      frag.append(el);
    }
    this.container.append(frag);
  }

  buildPreviewElement(contact) {
    const userId = contact.id;

    const el = buildHtmlElement(`
      <div class="contact_item mdc-ripple-surface" data-user-id="${userId}">
        <div class="contact_item_photo"></div>
        <div class="contact_item_text"></div>
      </div>
    `);
    this.renderPreviewContent(el, contact);
    this.loadContactPhoto(el, contact);

    el.addEventListener('click', this.onContactClick);
    new MDCRipple(el);

    return el;
  }

  loadContactPhoto(el, contact) {
    const photoEl = $('.contact_item_photo', el);

    const photo = contact.photo;
    if (!photo) {
      this.setContactPhotoPlaceholder(photoEl, contact);
      return;
    }

    FileApiManager.loadPeerPhoto({
        _: 'peerUser',
        user_id: contact.id,
        access_hash: contact.access_hash,
      }, photo.photo_small, false, photo.dc_id, {priority: 10, cache: true})
      .then((url) => {
        photoEl.innerHTML = `<img src="${url}" alt class="contact_item_photo_img">`;
      })
      .catch((error) => {
        console.warn('contact photo load error', error);
      });
  }

  renderPreviewContent(el, contact) {
    const name = [contact.first_name, contact.last_name].join(' ').trim() || contact.username;
    const status = contact.status ? MessagesController.getUserStatus(contact.status) : 'last seen a long time ago';

    $('.contact_item_text', el).innerHTML = `
      <div class="contact_item_text_row">
        <div class="contact_item_title">${name}</div>
      </div>
      <div class="contact_item_text_row">
        <div class="contact_item_status">${status}</div>
      </div>
    `;
  }

  setContactPhotoPlaceholder(photoEl, contact) {
    const userId = contact.id;
    const name = [contact.first_name, contact.last_name].join(' ').trim();
    const colors = ChatsController.getPlaceholderColors();

    photoEl.style.backgroundColor = colors[userId % colors.length];
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
      const inputDialogPeer = {_: 'inputDialogPeer', peer: MessagesApiManager.getInputPeerById(userId)};
      console.log(inputDialogPeer);
      ApiClient.callMethod('messages.getPeerDialogs', {
        peers: [inputDialogPeer],
      }).then((res) => {
        MessagesApiManager.updateUsers(res.users);
        MessagesApiManager.updateChats(res.chats);
        MessagesApiManager.updateMessages(res.messages);
        MessagesApiManager.updateDialogs(res.dialogs);

        const dialog = res.dialogs.length ? res.dialogs[0] : [];
        MessagesController.setChat(dialog);

        this.onDialogOpened();
      });
    }
  };
};

window.ContactsController = ContactsController;

export {ContactsController};
