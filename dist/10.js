(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{34:function(e,t,i){"use strict";i.r(t),i.d(t,"ChatInfoController",(function(){return D}));var a=i(0),n=i(2),o={animationend:{cssProperty:"animation",prefixed:"webkitAnimationEnd",standard:"animationend"},animationiteration:{cssProperty:"animation",prefixed:"webkitAnimationIteration",standard:"animationiteration"},animationstart:{cssProperty:"animation",prefixed:"webkitAnimationStart",standard:"animationstart"},transitionend:{cssProperty:"transition",prefixed:"webkitTransitionEnd",standard:"transitionend"}};function s(e){return Boolean(e.document)&&"function"==typeof e.document.createElement}function r(e,t){if(s(e)&&t in o){var i=e.document.createElement("div"),a=o[t],n=a.standard,r=a.prefixed;return a.cssProperty in i.style?n:r}return t}var c=i(7),d=i(12),l=i(10),h=i(14),_=i(17),u=i(6),m={ANIM_CHECKED_INDETERMINATE:"mdc-checkbox--anim-checked-indeterminate",ANIM_CHECKED_UNCHECKED:"mdc-checkbox--anim-checked-unchecked",ANIM_INDETERMINATE_CHECKED:"mdc-checkbox--anim-indeterminate-checked",ANIM_INDETERMINATE_UNCHECKED:"mdc-checkbox--anim-indeterminate-unchecked",ANIM_UNCHECKED_CHECKED:"mdc-checkbox--anim-unchecked-checked",ANIM_UNCHECKED_INDETERMINATE:"mdc-checkbox--anim-unchecked-indeterminate",BACKGROUND:"mdc-checkbox__background",CHECKED:"mdc-checkbox--checked",CHECKMARK:"mdc-checkbox__checkmark",CHECKMARK_PATH:"mdc-checkbox__checkmark-path",DISABLED:"mdc-checkbox--disabled",INDETERMINATE:"mdc-checkbox--indeterminate",MIXEDMARK:"mdc-checkbox__mixedmark",NATIVE_CONTROL:"mdc-checkbox__native-control",ROOT:"mdc-checkbox",SELECTED:"mdc-checkbox--selected",UPGRADED:"mdc-checkbox--upgraded"},p={ARIA_CHECKED_ATTR:"aria-checked",ARIA_CHECKED_INDETERMINATE_VALUE:"mixed",NATIVE_CONTROL_SELECTOR:".mdc-checkbox__native-control",TRANSITION_STATE_CHECKED:"checked",TRANSITION_STATE_INDETERMINATE:"indeterminate",TRANSITION_STATE_INIT:"init",TRANSITION_STATE_UNCHECKED:"unchecked"},f={ANIM_END_LATCH_MS:250},v=function(e){function t(i){var a=e.call(this,n.a({},t.defaultAdapter,i))||this;return a.currentCheckState_=p.TRANSITION_STATE_INIT,a.currentAnimationClass_="",a.animEndLatchTimer_=0,a.enableAnimationEndHandler_=!1,a}return n.b(t,e),Object.defineProperty(t,"cssClasses",{get:function(){return m},enumerable:!0,configurable:!0}),Object.defineProperty(t,"strings",{get:function(){return p},enumerable:!0,configurable:!0}),Object.defineProperty(t,"numbers",{get:function(){return f},enumerable:!0,configurable:!0}),Object.defineProperty(t,"defaultAdapter",{get:function(){return{addClass:function(){},forceLayout:function(){},hasNativeControl:function(){return!1},isAttachedToDOM:function(){return!1},isChecked:function(){return!1},isIndeterminate:function(){return!1},removeClass:function(){},removeNativeControlAttr:function(){},setNativeControlAttr:function(){},setNativeControlDisabled:function(){}}},enumerable:!0,configurable:!0}),t.prototype.init=function(){this.currentCheckState_=this.determineCheckState_(),this.updateAriaChecked_(),this.adapter_.addClass(m.UPGRADED)},t.prototype.destroy=function(){clearTimeout(this.animEndLatchTimer_)},t.prototype.setDisabled=function(e){this.adapter_.setNativeControlDisabled(e),e?this.adapter_.addClass(m.DISABLED):this.adapter_.removeClass(m.DISABLED)},t.prototype.handleAnimationEnd=function(){var e=this;this.enableAnimationEndHandler_&&(clearTimeout(this.animEndLatchTimer_),this.animEndLatchTimer_=setTimeout((function(){e.adapter_.removeClass(e.currentAnimationClass_),e.enableAnimationEndHandler_=!1}),f.ANIM_END_LATCH_MS))},t.prototype.handleChange=function(){this.transitionCheckState_()},t.prototype.transitionCheckState_=function(){if(this.adapter_.hasNativeControl()){var e=this.currentCheckState_,t=this.determineCheckState_();if(e!==t){this.updateAriaChecked_();var i=m.SELECTED;t===p.TRANSITION_STATE_UNCHECKED?this.adapter_.removeClass(i):this.adapter_.addClass(i),this.currentAnimationClass_.length>0&&(clearTimeout(this.animEndLatchTimer_),this.adapter_.forceLayout(),this.adapter_.removeClass(this.currentAnimationClass_)),this.currentAnimationClass_=this.getTransitionAnimationClass_(e,t),this.currentCheckState_=t,this.adapter_.isAttachedToDOM()&&this.currentAnimationClass_.length>0&&(this.adapter_.addClass(this.currentAnimationClass_),this.enableAnimationEndHandler_=!0)}}},t.prototype.determineCheckState_=function(){var e=p.TRANSITION_STATE_INDETERMINATE,t=p.TRANSITION_STATE_CHECKED,i=p.TRANSITION_STATE_UNCHECKED;return this.adapter_.isIndeterminate()?e:this.adapter_.isChecked()?t:i},t.prototype.getTransitionAnimationClass_=function(e,i){var a=p.TRANSITION_STATE_INIT,n=p.TRANSITION_STATE_CHECKED,o=p.TRANSITION_STATE_UNCHECKED,s=t.cssClasses,r=s.ANIM_UNCHECKED_CHECKED,c=s.ANIM_UNCHECKED_INDETERMINATE,d=s.ANIM_CHECKED_UNCHECKED,l=s.ANIM_CHECKED_INDETERMINATE,h=s.ANIM_INDETERMINATE_CHECKED,_=s.ANIM_INDETERMINATE_UNCHECKED;switch(e){case a:return i===o?"":i===n?h:_;case o:return i===n?r:c;case n:return i===o?d:l;default:return i===n?h:_}},t.prototype.updateAriaChecked_=function(){this.adapter_.isIndeterminate()?this.adapter_.setNativeControlAttr(p.ARIA_CHECKED_ATTR,p.ARIA_CHECKED_INDETERMINATE_VALUE):this.adapter_.removeNativeControlAttr(p.ARIA_CHECKED_ATTR)},t}(u.a),b=["checked","indeterminate"],g=function(e){function t(){var t=null!==e&&e.apply(this,arguments)||this;return t.ripple_=t.createRipple_(),t}return n.b(t,e),t.attachTo=function(e){return new t(e)},Object.defineProperty(t.prototype,"ripple",{get:function(){return this.ripple_},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"checked",{get:function(){return this.nativeControl_.checked},set:function(e){this.nativeControl_.checked=e},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"indeterminate",{get:function(){return this.nativeControl_.indeterminate},set:function(e){this.nativeControl_.indeterminate=e},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"disabled",{get:function(){return this.nativeControl_.disabled},set:function(e){this.foundation_.setDisabled(e)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"value",{get:function(){return this.nativeControl_.value},set:function(e){this.nativeControl_.value=e},enumerable:!0,configurable:!0}),t.prototype.initialSyncWithDOM=function(){var e=this;this.handleChange_=function(){return e.foundation_.handleChange()},this.handleAnimationEnd_=function(){return e.foundation_.handleAnimationEnd()},this.nativeControl_.addEventListener("change",this.handleChange_),this.listen(r(window,"animationend"),this.handleAnimationEnd_),this.installPropertyChangeHooks_()},t.prototype.destroy=function(){this.ripple_.destroy(),this.nativeControl_.removeEventListener("change",this.handleChange_),this.unlisten(r(window,"animationend"),this.handleAnimationEnd_),this.uninstallPropertyChangeHooks_(),e.prototype.destroy.call(this)},t.prototype.getDefaultFoundation=function(){var e=this;return new v({addClass:function(t){return e.root_.classList.add(t)},forceLayout:function(){return e.root_.offsetWidth},hasNativeControl:function(){return!!e.nativeControl_},isAttachedToDOM:function(){return Boolean(e.root_.parentNode)},isChecked:function(){return e.checked},isIndeterminate:function(){return e.indeterminate},removeClass:function(t){return e.root_.classList.remove(t)},removeNativeControlAttr:function(t){return e.nativeControl_.removeAttribute(t)},setNativeControlAttr:function(t,i){return e.nativeControl_.setAttribute(t,i)},setNativeControlDisabled:function(t){return e.nativeControl_.disabled=t}})},t.prototype.createRipple_=function(){var e=this,t=n.a({},h.a.createAdapter(this),{deregisterInteractionHandler:function(t,i){return e.nativeControl_.removeEventListener(t,i,Object(d.a)())},isSurfaceActive:function(){return Object(l.b)(e.nativeControl_,":active")},isUnbounded:function(){return!0},registerInteractionHandler:function(t,i){return e.nativeControl_.addEventListener(t,i,Object(d.a)())}});return new h.a(this.root_,new _.a(t))},t.prototype.installPropertyChangeHooks_=function(){var e=this,t=this.nativeControl_,i=Object.getPrototypeOf(t);b.forEach((function(a){var n=Object.getOwnPropertyDescriptor(i,a);if(E(n)){var o=n.get,s={configurable:n.configurable,enumerable:n.enumerable,get:o,set:function(i){n.set.call(t,i),e.foundation_.handleChange()}};Object.defineProperty(t,a,s)}}))},t.prototype.uninstallPropertyChangeHooks_=function(){var e=this.nativeControl_,t=Object.getPrototypeOf(e);b.forEach((function(i){var a=Object.getOwnPropertyDescriptor(t,i);E(a)&&Object.defineProperty(e,i,a)}))},Object.defineProperty(t.prototype,"nativeControl_",{get:function(){var e=v.strings.NATIVE_CONTROL_SELECTOR,t=this.root_.querySelector(e);if(!t)throw new Error("Checkbox component requires a "+e+" element");return t},enumerable:!0,configurable:!0}),t}(c.a);function E(e){return!!e&&"function"==typeof e.set}var C=i(1),T=i(3),A=i(8),k=i(5),I=i(11),N=i(4);i(23);function y(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}const D=new class{constructor(){y(this,"sharedSteps",{media:30,docs:15,links:15,audio:15}),y(this,"close",()=>{this._open&&(this._open=!1,this.container.hidden=!0,N.a.onRightSidebarClose(),this.peerId=null,document.removeEventListener("keyup",this.onKeyUp))}),y(this,"onKeyUp",e=>{window.MediaViewController&&MediaViewController.isOpen()||27===e.keyCode&&this.close()}),y(this,"onScroll",()=>{if(this.isOpen()&&!this.sharedLoading.loading[this.sharedSection]&&!this.sharedLoading.noMore[this.sharedSection]){const e=this.scrollContainer;e.scrollTop+e.offsetHeight>e.scrollHeight-500&&this.loadMoreShared()}}),y(this,"onSharedTabClick",e=>{const t=e.currentTarget.dataset.jsLabel.replace(/^nav_/,"");this.setSharedSection(t)})}show(e){if(this.container=Object(a.a)(".right_sidebar"),this.container.hidden=!1,this._open=!0,N.a.onRightSidebarOpen(),e===this.peerId)return;this.peerId=e,this.sharedSection=null,this.sharedLoading={loading:{media:!0,docs:!1,links:!1,audio:!1},noMore:{media:!1,docs:!1,links:!1,audio:!1},offsetMsgId:{media:0,docs:0,links:0,audio:0}};const t=C.a.getPeerById(e),i=C.a.getPeerName(t),n=C.a.getPeerData(t);let o="";"user"===n._&&(o=k.a.getUserStatusText(n)),this.container.innerHTML=a.e.html`
      <div class="sidebar_header">
        <button class="mdc-icon-button sidebar_close_button"></button>
        <div class="sidebar_header_title">Info</div>
        <button type="button" class="sidebar_extra_menu_button mdc-icon-button"></button>
      </div>
      <div class="chat_info_scroll_wrap">
        <div class="sidebar_user_info">
          <div class="sidebar_user_photo"></div>
          <div class="sidebar_user_name">${i}</div>
          <div class="sidebar_user_desc">${o}</div>
        </div>
        <div class="chat_info_desc"></div>
        <div class="chat_info_shared_media_container">
          <div class="nav_tabs_container chat_info_shared_media_nav">
            <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_media">
              <div class="nav_tabs_item_label">Media</div>
            </div>
            <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_docs">
              <div class="nav_tabs_item_label">Docs</div>
            </div>
            <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_links">
              <div class="nav_tabs_item_label">Links</div>
            </div>
            <div class="nav_tabs_item chat_info_shared_media_nav_item" data-js-label="nav_audio">
              <div class="nav_tabs_item_label">Audio</div>
            </div>
          </div>
          <div class="chat_info_shared_wrap">
            <div class="chat_info_shared chat_info_shared_media"></div>
            <div class="chat_info_shared chat_info_shared_docs" hidden></div>
            <div class="chat_info_shared chat_info_shared_links" hidden></div>
            <div class="chat_info_shared chat_info_shared_audio" hidden></div>
          </div>
        </div>
      </div>
    `,this.scrollContainer=Object(a.a)(".chat_info_scroll_wrap",this.container),Object(a.H)(this.scrollContainer),this.renderPeerPhoto(t),this.bindListeners(),this.loadPeerFullInfo(t).then(e=>{this.renderDesc(n,e)})}bindListeners(){document.addEventListener("keyup",this.onKeyUp);const e=Object(a.a)(".sidebar_close_button",this.container);e.addEventListener("click",this.close),Object(a.g)(e);const t=Object(a.a)(".sidebar_extra_menu_button",this.container);Object(a.g)(t),this.scrollContainer.addEventListener("scroll",this.onScroll),this.sharedTabsDom=Object(a.B)(this.container);for(const e of Object.values(this.sharedTabsDom))e.addEventListener("click",this.onSharedTabClick);this.setSharedSection("media")}getNotificationsCheckboxHtml(){return a.e.html`
      <div class="mdc-form-field">
        <div class="mdc-checkbox">
          <input type="checkbox" class="mdc-checkbox__native-control" id="checkbox-notifications"/>
          <div class="mdc-checkbox__background">
            <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
            </svg>
            <div class="mdc-checkbox__mixedmark"></div>
          </div>
          <div class="mdc-checkbox__ripple"></div>
        </div>
      </div>
    `}renderDesc(e,t){const i=!t.notify_settings.mute_until,n={bio:t.about,username:e.username,phone:e.phone?"+"+e.phone:""},o=a.e.html``;for(const e in n){const t=n[e];t&&o.appendHtml`
        <div class="chat_info_desc_row">
          <div class="chat_info_desc_icon chat_info_desc_icon-${e}"></div>
          <div class="chat_info_desc_row_block">
            <div class="chat_info_desc_row_text">${t}</div>
            <div class="chat_info_desc_row_subtitle">${e}</div>
          </div>
        </div>
      `}o.appendHtml`
      <div class="chat_info_desc_row">
        <div class="chat_info_desc_checkbox">${this.getNotificationsCheckboxHtml()}</div>
        <label for="checkbox-notifications" class="chat_info_desc_row_block">
          <div class="chat_info_desc_row_text">Notifications</div>
          <div class="chat_info_desc_row_subtitle">${i?"Enabled":"Disabled"}</div>
        </label>
      </div>
    `,Object(a.a)(".chat_info_desc").innerHTML=o;new g(document.querySelector(".mdc-checkbox")).checked=i}renderPeerPhoto(e){const t=Object(a.a)(".sidebar_user_photo",this.container);I.a.loadPeerPhoto(t,e,!0)}async loadPeerFullInfo(e){return"peerUser"===e._?await C.a.loadUserFull(e):await C.a.loadChatFull(e)}async loadMoreShared(){const e=this.sharedSection;let t;try{this.sharedLoading.loading[e]=!0,t=await T.a.callMethod("messages.search",{peer:C.a.getInputPeerById(this.peerId),filter:C.a.getInputMessagesFilter(e),limit:this.sharedSteps[e],offset_id:this.sharedLoading.offsetMsgId[e]})}finally{this.sharedLoading.loading[e]=!1}if((t.count<this.sharedSteps[e]||t.messages.length<this.sharedSteps[e])&&(this.sharedLoading.noMore[e]=!0,!t.messages.length)){if(!this.sharedLoading.offsetMsgId[e]){const t=Object(a.a)(".chat_info_shared_"+e);t.classList.add("chat_info_shared-empty"),t.innerHTML=a.e.html`<div class="chat_info_shared_empty">No messages with ${e} yet</div>`}return}C.a.updateUsers(t.users),C.a.updateUsers(t.chats);const i=t.messages;switch(this.sharedLoading.offsetMsgId[e]=i[i.length-1].id,C.a.updateMessages(i),e){case"media":return this.renderSharedMedia(i);case"docs":return this.renderSharedDocs(i);case"links":return this.renderSharedLinks(i);case"audio":return this.renderSharedAudio(i)}}renderSharedMedia(e){const t=document.createDocumentFragment();for(const i of e){const e=a.e.html`
        <div class="chat_info_shared_media_item" data-message-id="${i.id}"></div>
      `.buildElement();if(i.media.document){const t=A.a.getDocumentAttributes(i.media.document);isFinite(t.duration)&&(e.innerHTML=a.e.html`<div class="chat_info_shared_media_item_duration">${Object(a.v)(t.duration)}</div>`)}e.addEventListener("click",k.a.onThumbClick),t.append(e),this.loadMediaThumb(i,e)}Object(a.a)(".chat_info_shared_media").append(t)}renderSharedDocs(e){const t=document.createDocumentFragment();for(const i of e){const e=i.media.document,n=A.a.getDocumentAttributes(e),o=n.file_name||"File",s=this.getFileExtension(e.mime_type),r=this.getFileIconClass(s),c=Object(a.w)(e.size),d=k.a.formatMessageDateTime(i.date),l=a.e.html`
        <div class="chat_info_shared_docs_item">
          <div class="chat_info_shared_docs_item_icon${r}" data-message-id="${i.id}">${s}</div>
          <div class="chat_info_shared_docs_item_info">
            <div class="chat_info_shared_docs_item_name">${o}</div>
            <div class="chat_info_shared_docs_item_desc">${c} &middot; ${d}</div>
          </div>
        </div>
      `.buildElement();Object(a.a)(".chat_info_shared_docs_item_icon",l).addEventListener("click",this.onFileClick),t.append(l),"image"===n.type&&this.loadDocThumb(i.media.document,Object(a.a)(".chat_info_shared_docs_item_icon",l))}Object(a.a)(".chat_info_shared_docs").append(t)}renderSharedLinks(e){const t=document.createDocumentFragment();for(const i of e){const e=k.a.getMessageMediaThumb(i),n=i.media;let o="",s="",r="";if(n&&n.webpage&&"webPageEmpty"!==n.webpage._&&(o=n.webpage.title||n.webpage.site_name||"",s=n.webpage.description||"",r=n.webpage.url),!r&&(r=this.getUrlFromText(i),!r))continue;const c=a.e.html`
        <a class="chat_info_shared_link_item" data-message-id="${i.id}" target="_blank" href="${r}">
          <div class="chat_info_shared_link_item_image"></div>
          <div class="chat_info_shared_link_item_info">
            <div class="chat_info_shared_link_item_title">${o}</div>
            <div class="chat_info_shared_link_item_desc">${s}</div>
            <div class="chat_info_shared_link_item_url">${r}</div>
          </div>
        </a>
      `.buildElement();t.append(c),e&&this.loadLinkThumb(e,Object(a.a)(".chat_info_shared_link_item_image",c))}Object(a.a)(".chat_info_shared_links").append(t)}renderSharedAudio(e){const t=document.createDocumentFragment();for(const i of e){const e=i.media.document,n=A.a.getDocumentAttributes(e),o=a.e.html`
        <div class="chat_info_shared_audio_item">${k.a.formatAudio(e,n,i.id)}</div>
      `.buildElement(),s=Object(a.a)(".document_icon",o);s.addEventListener("click",k.a.onFileClick),k.a.audioPlayer&&k.a.audioPlayer.doc.id===e.id&&k.a.audioPlayer.initMessageAudioPlayer(s),t.appendChild(o)}Object(a.a)(".chat_info_shared_audio").append(t)}async loadMediaThumb(e,t){const i=k.a.getMessageMediaThumb(e);let a="";if("photo"===i.type){const e=A.a.choosePhotoSize(i.sizes,"x","m");a=await FileApiManager.loadPhoto(i.object,e.type)}else if("video"===i.type){const e=A.a.choosePhotoSize(i.sizes,"x","m");a=await FileApiManager.loadDocumentThumb(i.object,e.type)}a&&(t.style.backgroundImage=`url(${a})`)}async loadDocThumb(e,t){const i=A.a.choosePhotoSize(e.thumbs,"x","m"),a=await FileApiManager.loadDocumentThumb(e,i.type);t.classList.add("chat_info_shared_docs_item_icon-thumb"),t.style.backgroundImage=`url(${a})`}async loadLinkThumb(e,t){const i=A.a.choosePhotoSize(e.sizes,"x","m"),a=await FileApiManager.loadPhoto(e.object,i.type);t.style.backgroundImage=`url(${a})`}setSharedSection(e){const t=this.sharedSection;if(t===e)return;t&&this.sharedTabsDom["nav_"+t].classList.remove("nav_tabs_item-active");const i=Object(a.a)(".chat_info_shared_media_container",this.container);this.scrollContainer.scrollTop>i.offsetTop-47&&i.scrollIntoView({block:"start"}),t&&(Object(a.a)(".chat_info_shared_"+t).hidden=!0,Object(a.a)(".chat_info_shared_"+e).hidden=!1),this.sharedSection=e,this.sharedTabsDom["nav_"+e].classList.add("nav_tabs_item-active"),this.loadMoreShared()}isOpen(){return Boolean(this._open)}getFileIconClass(e){const t=" chat_info_shared_docs_item_icon-";switch(e){case"pdf":return t+"pdf";case"doc":case"docx":case"xls":case"xlsx":case"ppt":case"pptx":case"odp":case"ods":case"odt":case"rtf":case"txt":case"epub":return t+"doc";case"zip":case"7z":case"tar.gz":return t+"zip"}return""}getFileExtension(e){switch(e){case"image/jpeg":case"image/jpg":case"image/png":case"image/gif":case"image/webp":case"video/mp4":case"video/webm":case"video/mov":case"video/avi":case"video/mkv":case"application/pdf":case"application/json":case"application/zip":case"text/csv":case"text/html":case"multipart/x-zip":return e.split(/[.\-\/]/).pop();case"image/vnd.microsoft.icon":return"ico";case"image/svg+xml":return"svg";case"image/tiff":return"tiff";case"audio/ogg":return"ogg";case"audio/wav":return"wav";case"video/x-ms-wmv":return"wmv";case"video/quicktime":return"mov";case"application/doc":case"application/ms-doc":case"application/msword":return"doc";case"application/vnd.openxmlformats-officedocument.wordprocessingml.document":return"docx";case"application/excel":case"application/vnd.ms-excel":case"application/x-excel":case"application/x-msexcel":return"xls";case"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":return"xlsx";case"application/mspowerpoint":case"application/powerpoint":case"application/vnd.ms-powerpoint":case"application/x-mspowerpoint":return"ppt";case"application/vnd.openxmlformats-officedocument.presentationml.presentation":return"pptx";case"application/vnd.oasis.opendocument.presentation":return"odp";case"application/vnd.oasis.opendocument.spreadsheet":return"ods";case"application/vnd.oasis.opendocument.text":return"odt";case"text/rtf":case"application/wps-office.doc":return"rtf";case"text/plain":return"txt";case"application/epub+zip":return"epub";case"application/x-compressed-tar":return"tar.gz";case"application/x-7z-compressed":return"7z"}return""}getUrlFromText(e){for(const t of e.entities)if("messageEntityUrl"===t._)return e.message.substring(t.offset,t.offset+t.length);return""}onFileClick(e){const t=e.currentTarget;if(t.dataset.loading)return;t.dataset.loading=1;const i=+t.dataset.messageId,n=C.a.messages.get(i);if(!n)return;const o=n.media.document,s=new AbortController,r=()=>{s.abort(),c()},c=()=>{delete t.dataset.loading,t.removeEventListener("click",r),t.classList.remove("chat_info_shared_docs_item_icon-loading"),d.remove()};t.addEventListener("click",r),t.classList.add("chat_info_shared_docs_item_icon-loading");const d=a.e.html`
      <svg class="document_icon_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <path class="document_icon_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
      </svg>
    `.buildElement(),l=d.firstElementChild;t.appendChild(d),FileApiManager.loadDocument(o,{onProgress:e=>{l&&l.style.setProperty("--progress-value",e/o.size)},signal:s.signal}).then(e=>{const t=A.a.getDocumentAttributes(o);Object(a.p)(e,t.file_name)}).catch(e=>{"AbortError"!==e.name&&console.log(e)}).finally(c)}};window.ChatInfoController=D}}]);