import {$, $$, attachRipple} from './utils';
import {MDCMenu} from '@material/menu';
import {MessagesApiManager} from "./api/messages_api_manager";
import {ChatsController} from './chats_controller';

const SettingsController = new class {
  show() {
    const userId = App.getAuthUserId();
    const user = MessagesApiManager.users.get(userId);
    const userName = MessagesApiManager.getUserName(user);

    this.container = $('.settings_sidebar');
    this.container.hidden = false;
    this.container.innerHTML = `
      <div class="sidebar_header">
        <button class="mdc-icon-button sidebar_back_button"></button>
        <div class="sidebar_header_title">Settings</div>
        <div class="mdc-menu-surface--anchor">
          <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>
          <div class="sidebar_extra_menu mdc-menu mdc-menu-surface">
            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
              <li class="mdc-list-item settings_extra_menu_item-log_out" role="menuitem">
                <span class="mdc-list-item__text">Log out</span>
              </li>
            </ul>
          </div>        
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
        <li class="mdc-list-item settings_main_menu_item-folders">
          <span class="mdc-list-item__text">Chat Folders</span>
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
    `;

    this.loadUserPhoto(user);

    const backButtonEl = $('.sidebar_back_button', this.container);
    backButtonEl.addEventListener('click', this.onBack);
    attachRipple(backButtonEl);

    const extraMenuButtonEl = $('.sidebar_extra_menu_button', this.container);
    extraMenuButtonEl.addEventListener('click', this.onExtraMenuClick);
    attachRipple(extraMenuButtonEl);

    const logoutButtonEl = $('.settings_extra_menu_item-log_out', this.container);
    logoutButtonEl.addEventListener('click', this.onLogoutClick);

    $('.settings_main_menu_item-folders', this.container).addEventListener('click', () => {
      import('./folders_settings_controller')
          .then(({FoldersSettingsController}) => new FoldersSettingsController().show());
    });

    attachRipple(...$$('.mdc-list-item', this.container));
  }

  loadUserPhoto(user) {
    const photoEl = $('.sidebar_user_photo', this.container);
    const peer = MessagesApiManager.getUserPeer(user);
    ChatsController.loadPeerPhoto(photoEl, peer, true);
  }

  onBack = (event) => {
    this.container.hidden = true;
    this.container.innerHTML = '';
    const backButtonEl = event.currentTarget;
    backButtonEl.removeEventListener('click', this.onBack);
    backButtonEl.hidden = true;
  };

  onExtraMenuClick = (event) => {
    const button = event.currentTarget;
    const menuEl = $('.sidebar_extra_menu', this.container);
    const menu = new MDCMenu(menuEl);
    if (!menu.open) {
      menu.open = true;
      if (!App.isMobileView()) {
        menu.setAnchorElement(button)
        menu.setAnchorMargin({top: 45, left: -100});
      }
    }
  };

  onLogoutClick = () => {
    App.logOut();
  };
};

window.SettingsController = SettingsController;

export {SettingsController};
