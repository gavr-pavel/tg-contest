import {$, buildHtmlElement} from "./utils";
import {MDCMenu} from '@material/menu';
import {MessagesApiManager} from "./api/messages_api_manager";

const SettingsController = new class {
  show() {
    this.leftSidebar = $('.left_sidebar');

    const userId = App.getAuthUserId();
    const user = MessagesApiManager.users.get(userId);
    const userName = MessagesApiManager.getUserName(user);

    this.container = buildHtmlElement(`
      <div class="settings_menu">
        <div class="settings_menu_header">
          <div class="sidebar_header_title">Settings</div>
          <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>
          <div class="sidebar_extra_menu_list mdc-menu mdc-menu-surface">
            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
              <li class="mdc-list-item settings_extra_menu_item-log_out" role="menuitem">
                <span class="mdc-list-item__text">Log out</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="sidebar_user_info">
          <div class="sidebar_user_photo"></div>
          <div class="sidebar_user_name">${userName}</div>
          <div class="sidebar_user_desc">+${user.phone}</div>
        </div>
        <ul class="settings_main_menu_list mdc-list">
          <li class="mdc-list-item settings_main_menu_item-edit" tabindex="0">
            <span class="mdc-list-item__text">Edit Profile</span>
          </li>
          <li class="mdc-list-item settings_main_menu_item-general">
            <span class="mdc-list-item__text">General Settings</span>
          </li>
          <li class="mdc-list-item settings_main_menu_item-notifications">
            <span class="mdc-list-item__text">Notifications</span>
          </li>
          <li class="mdc-list-item settings_main_menu_item-privacy">
            <span class="mdc-list-item__text">Privacy and Security</span>
          </li>
          <li class="mdc-list-item settings_main_menu_item-language">
            <span class="mdc-list-item__text">Language</span>
          </li>
        </ul>
      </div>
    `);
    this.leftSidebar.appendChild(this.container);

    this.loadUserPhoto(user);
    this.bindListeners();
  }

  bindListeners() {
    const backButtonEl = $('.sidebar_back_button', this.leftSidebar);
    backButtonEl.addEventListener('click', this.onBack, {once: true});
    backButtonEl.hidden = false;

    const extraMenuButtonEl = $('.sidebar_extra_menu_button', this.container);
    extraMenuButtonEl.addEventListener('click', this.onExtraMenuClick);

    const logoutButtonEl = $('.settings_extra_menu_item-log_out', this.container);
    logoutButtonEl.addEventListener('click', this.onLogoutClick);
  }

  loadUserPhoto(user) {
    const photo = user.photo;
    if (!photo) {
      return;
    }
    const peerUser = MessagesApiManager.getUserPeer(user);
    FileApiManager.loadPeerPhoto(peerUser, photo.photo_big, true, photo.dc_id, {priority: 10, cache: true})
        .then((url) => {
          $('.sidebar_user_photo', this.container).style.backgroundImage = `url(${url})`;
        });
  }

  onBack = (event) => {
    this.container.remove();
    const backButtonEl = event.currentTarget;
    backButtonEl.hidden = true;
  };

  onExtraMenuClick = () => {
    const menuEl = $('.sidebar_extra_menu_list', this.container);
    const menu = new MDCMenu(menuEl);

    if (!menu.open) {
      menu.open = true;
      menu.setAbsolutePosition(239, 57);
    }
  };

  onLogoutClick = () => {
    App.logOut();
  };
};

window.SettingsController = SettingsController;

export {SettingsController};
