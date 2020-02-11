import {$, buildHtmlElement} from "./utils";
import {MDCMenu} from '@material/menu';
import {MessagesApiManager} from "./api/messages_api_manager";

const SettingsController = new class {
  init() {
    const userId = App.getAuthUserId();
    const user = MessagesApiManager.users.get(userId);
    const userName = MessagesApiManager.getUserName(user);

    this.container = buildHtmlElement(`
      <div class="settings_menu">
        <div class="settings_menu_header">
          <div class="settings_menu_title">Settings</div>
          <button type="button" class="settings_extra_menu_button mdc-icon-button"></button>
          <div class="settings_extra_menu_list mdc-menu mdc-menu-surface">
            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
              <li class="mdc-list-item settings_extra_menu_item-log_out" role="menuitem">
                <span class="mdc-list-item__text">Log out</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="settings_menu_user_info">
          <div class="settings_menu_user_photo"></div>
          <div class="settings_menu_user_name">${userName}</div>
          <div class="settings_menu_user_phone">+${user.phone}</div>
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

    $('.left_sidebar').appendChild(this.container);

    FileApiManager.loadPeerPhoto({
      _: 'peerUser',
      user_id: userId,
    }, user.photo.photo_big, true, user.photo.dc_id, {priority: 10, cache: true}).then((url) => {
      $('.settings_menu_user_photo').style.backgroundImage = `url(${url})`;
    });

    const backButtonEl = $('.left_sidebar_back_button');
    backButtonEl.addEventListener('click', this.onBack);
    backButtonEl.hidden = false;

    const extraMenuButtonEl = $('.settings_extra_menu_button');
    extraMenuButtonEl.addEventListener('click', this.onExtraMenuClick);

    const logoutButtonEl = $('.settings_extra_menu_item-log_out');
    logoutButtonEl.addEventListener('click', this.onLogoutClick);
  }

  onBack = () => {
    this.container.remove();

    const backButtonEl = $('.left_sidebar_back_button');
    backButtonEl.hidden = true;
    backButtonEl.removeEventListener('click', this.onBack);
  };

  onExtraMenuClick = () => {
    const menuEl = $('.settings_extra_menu_list');
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
