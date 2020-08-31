(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{33:function(e,t,i){"use strict";i.r(t),i.d(t,"FileUploadPopup",(function(){return u}));var s=i(0),n=i(9),o=i(16),l=i(36),a=i(39);i(45);function d(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}const u=new class{constructor(){d(this,"onMenuItemClick",e=>{const t=e.currentTarget.dataset.type;if("media"===t||"file"===t){const e="media"===t,i=document.createElement("input");i.type="file",i.accept=e?"image/*, video/*":"*/*",i.multiple=!0,i.click(),window.input=i,i.onchange=()=>{this.onFilesSelected(i.files,e),this.fileInput=null},this.fileInput=i}this.hideMenu()}),d(this,"onMenuButtonClick",()=>{this.isMenuOpen()||this.showMenu()}),d(this,"onMenuMouseEnter",()=>{clearTimeout(this.hideTimeout),this.isMenuOpen()||this.showMenu()}),d(this,"onMenuMouseLeave",()=>{this.hideTimeout=setTimeout(()=>{this.isMenuOpen()&&this.hideMenu(),this.hideTimeout=null},500)}),d(this,"onGlobalClick",e=>{this.menu.contains(e.target)||this.hideMenu()})}init(){this.menu=s.e.html`
      <div class="mdc-menu mdc-menu-surface messages_form_media_menu" hidden>
        <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
          <li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-media" data-type="media" role="menuitem">
            <span class="mdc-list-item__text">Photo or Video</span>
          </li>
          <li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-file" data-type="file" role="menuitem">
            <span class="mdc-list-item__text">Document</span>
          </li>
          <!--li class="mdc-list-item messages_form_media_menu_item messages_form_media_menu_item-poll" data-type="poll" role="menuitem">
            <span class="mdc-list-item__text">Poll</span>
          </li-->
        </ul>
      </div>
    `.buildElement();for(const e of Object(s.a)(".mdc-list",this.menu).children)Object(s.g)(e),e.addEventListener("click",this.onMenuItemClick)}bind(e){e.parentNode.append(this.menu),Object(s.J)()?e.addEventListener("touchstart",e=>{e.preventDefault(),this.isMenuOpen()?this.hideMenu():(e.stopPropagation(),this.showMenu())}):(e.addEventListener("mousedown",this.onMenuButtonClick),e.addEventListener("mouseenter",this.onMenuMouseEnter),e.addEventListener("mouseleave",this.onMenuMouseLeave),this.menu.addEventListener("mouseenter",this.onMenuMouseEnter),this.menu.addEventListener("mouseleave",this.onMenuMouseLeave)),this.menuButton=e}isMenuOpen(){return!this.menu.hidden}showMenu(){this.menu.hidden=!1,this.menuButton.classList.add("messages_form_media_button-active"),document.addEventListener("mousedown",this.onGlobalClick)}hideMenu(){this.menu.hidden=!0,this.menuButton.classList.remove("messages_form_media_button-active"),document.removeEventListener("mousedown",this.onGlobalClick)}onFilesSelected(e,t){e.length&&(t?this.showPhotosUploadPopup(e):this.showFilesUploadPopup(e))}showPhotosUploadPopup(e){const t=e.length>3?"many":"n"+e.length,i=s.e.html`<div class="messages_upload_popup_media messages_upload_popup_media-${t}"></div>`.buildElement();let o,l=0,a=0;for(const t of e){let e;t.type.startsWith("video/")?(a++,e=s.e.html`<video src="${URL.createObjectURL(t)}" class="messages_upload_popup_media_item"></video>`.buildElement()):(l++,e=s.e.html`<img src="${URL.createObjectURL(t)}" class="messages_upload_popup_media_item">`.buildElement()),i.appendChild(e)}o=l&&!a?n.a.getPlural("messages_send_n_photos",e.length):a&&!l?n.a.getPlural("messages_send_n_videos",e.length):n.a.getPlural("messages_send_n_files",e.length),this.buildPopup(o,i,e,!0)}showFilesUploadPopup(e){const t=s.e.html``;for(const i of e){const e=i.name.split(".").pop()||"";t.appendHtml`
        <div class="messages_upload_popup_files_item">
          <div class="messages_upload_popup_files_item_thumb">${e}</div>
          <div class="messages_upload_popup_files_item_description">
            <div class="messages_upload_popup_files_item_name _cut_text">${i.name}</div>
            <div class="messages_upload_popup_files_item_size">${Object(s.w)(i.size)}</div>
          </div>
        </div>
      `}const i=n.a.getPlural("messages_send_n_files",e.length);this.buildPopup(i,t.buildFragment(),e)}buildPopup(e,t,i,n=!1){const d=s.e.html`
      <div class="messages_upload_popup_content"></div>
      <div class="mdc-text-field mdc-text-field--outlined messages_upload_popup_caption_text_field">
        <input type="text" class="mdc-text-field__input messages_upload_popup_caption_input">
        <div class="mdc-notched-outline">
          <div class="mdc-notched-outline__leading"></div>
          <div class="mdc-notched-outline__notch">
            <label class="mdc-floating-label">Caption</label>
          </div>
          <div class="mdc-notched-outline__trailing"></div>
        </div>
      </div>
    `,u=new a.a({title:e,content:d,buttonText:"Send",onButtonClick:()=>{const e=Object(s.a)(".messages_upload_popup_caption_input",layer).value.trim();o.a.onMediaSend(i,n,e),u.close()}});Object(s.a)(".messages_upload_popup_content",u.el).appendChild(t),u.show(),new l.a(Object(s.a)(".mdc-text-field",u.el))}};window.FileUploadPopup=u},39:function(e,t,i){"use strict";i.d(t,"a",(function(){return o}));var s=i(0);i(40);function n(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class o{constructor({title:e,content:t,buttonText:i=null,onButtonClick:o=null}){n(this,"onLayerClick",e=>{e.target===e.currentTarget&&this.hide()}),n(this,"show",()=>{Object(s.a)(".main_container").appendChild(this.el),requestAnimationFrame(()=>{this.el.hidden=!1})}),n(this,"hide",()=>{this.el.hidden=!0,setTimeout(()=>{this.el.remove(),this.el=null},400)});let l="";i&&(l=s.e.html`
        <button class="mdc-button mdc-button--unelevated popup_header_button">${i}</button>
      `),this.el=s.e.html`
      <div class="popup_layer" hidden>
        <div class="popup">
          <div class="popup_header">
            <button class="mdc-icon-button popup_close_button"></button>
            <div class="popup_title">${e}</div>
            ${l}        
          </div>
          <div class="popup_content">${t}</div>
        </div>
      </div>
    `.buildElement(),this.el.addEventListener("click",this.onLayerClick),Object(s.a)(".popup_close_button",this.el).addEventListener("click",this.hide),l&&o&&Object(s.a)(".popup_header_button",this.el).addEventListener("click",o)}}},40:function(e,t,i){},45:function(e,t,i){}}]);