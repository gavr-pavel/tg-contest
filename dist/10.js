(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{44:function(t,e,n){"use strict";n.r(e),n.d(e,"SettingsController",(function(){return r}));var i=n(0),s=n(28),a=n(1),c=n(11);function o(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}const r=new class{constructor(){o(this,"onBack",t=>{this.container.hidden=!0,this.container.innerHTML="";const e=t.currentTarget;e.removeEventListener("click",this.onBack),e.hidden=!0}),o(this,"onExtraMenuClick",()=>{const t=Object(i.a)(".sidebar_extra_menu",this.container),e=new s.a(t);console.log(e),e.open||(e.open=!0)}),o(this,"onLogoutClick",()=>{App.logOut()})}show(){const t=App.getAuthUserId(),e=a.a.users.get(t),n=a.a.getUserName(e);this.container=Object(i.a)(".settings_sidebar"),this.container.hidden=!1,this.container.innerHTML=`\n      <div class="sidebar_header">\n        <div class="sidebar_header_title">Settings</div>\n        <div class="mdc-menu-surface--anchor">\n          <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>\n          <div class="sidebar_extra_menu mdc-menu mdc-menu-surface">\n            <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">\n              <li class="mdc-list-item settings_extra_menu_item-log_out" role="menuitem">\n                <span class="mdc-list-item__text">Log out</span>\n              </li>\n            </ul>\n          </div>        \n        </div>\n      </div>\n      <div class="sidebar_user_info">\n        <div class="sidebar_user_photo"></div>\n        <div class="sidebar_user_name">${n}</div>\n        <div class="sidebar_user_desc">+${e.phone}</div>\n      </div>\n      <ul class="settings_main_menu_list mdc-list">\n        <li class="mdc-list-item settings_main_menu_item-edit" tabindex="0">\n          <span class="mdc-list-item__text">Edit Profile</span>\n        </li>\n        <li class="mdc-list-item settings_main_menu_item-general">\n          <span class="mdc-list-item__text">General Settings</span>\n        </li>\n        <li class="mdc-list-item settings_main_menu_item-notifications">\n          <span class="mdc-list-item__text">Notifications</span>\n        </li>\n        <li class="mdc-list-item settings_main_menu_item-privacy">\n          <span class="mdc-list-item__text">Privacy and Security</span>\n        </li>\n        <li class="mdc-list-item settings_main_menu_item-language">\n          <span class="mdc-list-item__text">Language</span>\n        </li>\n      </ul>\n    `,this.loadUserPhoto(e);const s=Object(i.a)(".chats_header_back_button");Object(i.g)(s),s.addEventListener("click",this.onBack),s.hidden=!1;const c=Object(i.a)(".sidebar_extra_menu_button",this.container);Object(i.g)(c),c.addEventListener("click",this.onExtraMenuClick),Object(i.a)(".settings_extra_menu_item-log_out",this.container).addEventListener("click",this.onLogoutClick),Object(i.g)(...Object(i.b)(".mdc-list-item",this.container))}loadUserPhoto(t){const e=Object(i.a)(".sidebar_user_photo",this.container),n=a.a.getUserPeer(t);c.a.loadPeerPhoto(e,n,!0)}};window.SettingsController=r}}]);