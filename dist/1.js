(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{23:function(t,e,s){"use strict";s.r(e),s.d(e,"MediaViewController",(function(){return d}));var i=s(20),o=s(0),a=s(9);s(36);function n(t,e,s){return e in t?Object.defineProperty(t,e,{value:s,enumerable:!0,configurable:!0,writable:!0}):t[e]=s,t}const d=new class{constructor(){n(this,"preload",new Map),n(this,"close",()=>{this.state&&this.destroyContent(),this.playlist=null,this.container.hidden=!0,document.removeEventListener("keyup",this.onKeyUp)}),n(this,"onKeyUp",t=>{switch(t.keyCode){case 39:this.onNav(1);break;case 37:this.onNav(-1);break;case 27:this.close()}}),n(this,"download",()=>{this.state.url&&Object(o.o)(this.state.url,this.getDownloadFilename(this.state.object))}),n(this,"onContentClick",t=>{t.target===t.currentTarget&&this.close()}),n(this,"onContentTouchStart",t=>{t.preventDefault();let{pageY:e}=Object(o.y)(t),s=1,i=0,a=1;const n=t=>{const{pageY:n}=Object(o.y)(t);i=n-e,s=1-Math.min(1,Math.pow(Math.abs(i),2)/1e4),a=1-(.3-.3*s),this.dom.content.style.transform=`translateY(${i}px) scale(${a})`,this.container.style.backgroundColor=`rgba(0, 0, 0, ${s})`,this.dom.header.style.opacity=.5*s,this.dom.caption.style.opacity=.5*s,this.dom.nav_left.style.opacity=.5*s,this.dom.nav_right.style.opacity=.5*s},d=()=>{if(1===s){const e=t.target;"VIDEO"===e.tagName&&(e.paused?e.play():e.pause()),r()}else 0===s?(this.dom.content.style.transition="",this.dom.content.style.transform=`translateY(${5*i}px) scale(${a})`,setTimeout(()=>{r(),this.close()},200)):r();this.dom.content.removeEventListener("touchmove",n),this.dom.content.removeEventListener("touchend",d)},r=()=>{this.dom.content.style.transition="",this.dom.content.style.transform="",this.container.style.backgroundColor="",this.dom.header.style.opacity="",this.dom.caption.style.opacity="",this.dom.nav_left.style.opacity="",this.dom.nav_right.style.opacity=""};this.dom.content.addEventListener("touchmove",n),this.dom.content.addEventListener("touchend",d),this.dom.content.style.transition="none"}),n(this,"onNavClick",t=>{const e=t.target===this.dom.nav_left?-1:1;this.onNav(e)}),n(this,"onMoreClick",()=>{const t=this.dom.button_more;if(this.moreMenu&&this.moreMenu.open)return void(this.moreMenu=null);const e=Object(o.j)([["forward","Forward"],["download","Download"],["delete","Delete"]],{container:t.parentNode,menuClass:"media_view_actions_menu",itemClass:"media_view_actions_menu_item",itemCallback:t=>{switch(t){case"download":this.download()}}});e.setAnchorElement(t),e.setAnchorMargin({top:40,right:5}),e.open=!0,this.moreMenu=e}),this.container=o.e.html`
      <div class="media_view" hidden>
        <div class="media_view_header" data-js-label="header">
          <button class="mdc-icon-button media_view_mobile_close_button"  data-js-label="button_close_mobile"></button>
          <div class="media_view_author" data-js-label="header_author"></div>
          <div class="media_view_actions"  data-js-label="header_actions">
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-delete" data-js-label="button_delete"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-forward" data-js-label="button_forward"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-download" data-js-label="button_download"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-close" data-js-label="button_close"></button>
            <button class="mdc-icon-button media_view_actions_item media_view_actions_item-more" data-js-label="button_more"></button>
          </div>
        </div>
        <div class="media_view_content" data-js-label="content"></div>
        <div class="media_view_nav_left" hidden data-js-label="nav_left"></div>
        <div class="media_view_nav_right" hidden data-js-label="nav_right"></div>
        <div class="media_view_caption" data-js-label="caption"></div>
      </div>
    `.buildElement(),this.dom=Object(o.z)(this.container),this.dom.button_download.addEventListener("click",this.download),this.dom.button_close.addEventListener("click",this.close),this.dom.button_close_mobile.addEventListener("click",this.close),this.dom.button_more.addEventListener("click",this.onMoreClick),this.dom.content.addEventListener("click",this.onContentClick),this.dom.content.addEventListener("touchstart",this.onContentTouchStart),this.dom.nav_left.addEventListener("click",this.onNavClick),this.dom.nav_right.addEventListener("click",this.onNavClick),document.body.appendChild(this.container)}showPhoto(t,e,s){const o=["x"];window.innerWidth>=800&&o.unshift("y"),window.innerWidth>=812800&&o.unshift("w");const n=a.a.choosePhotoSize(t.sizes,...o)||t.sizes.splice(-1)[0],d=this.initLoading(t,e,s,n.size),r=this.state.abortController,l=this.state.onProgress;i.a.loadPhoto(t,n.type,{onProgress:l,signal:r.signal}).then(t=>{const e=`<img class="media_view_content_image" src="${t}">`;this.onLoaded(t,e,d)}).catch(t=>{"AbortError"!==t.name&&console.log(t)}),this.initMediaPlaylist(s)}showGif(t,e,s){const o=this.initLoading(t,e,s,t.size),a=this.state.abortController,n=this.state.onProgress;i.a.loadDocument(t,{onProgress:n,signal:a.signal}).then(t=>{const e=`<video class="media_view_content_gif" src="${t}" playsinline autoplay loop></video>`;this.onLoaded(t,e,o)}).catch(t=>{"AbortError"!==t.name&&console.log(t)}),this.initGifPlaylist(s)}showVideo(t,e,o){const n=this.initLoading(t,e,o,t.size),d=this.state.abortController,r=this.state.onProgress,l=a.a.getDocumentAttributes(t),c=l.duration<30;l.supports_streaming&&window.MediaSource&&t.size>1048576?s.e(11).then(s.bind(null,39)).then(({VideoStreamingProcess:e})=>{const s=new e(t,r);return this.state.streamingProcess=s,s.load()}).then(t=>{n===this.state&&(t.classList.add("media_view_content_video"),t.playsinline=!0,t.autoplay=!0,t.controls=!0,t.loop=c,t.play(),this.onLoaded(t.src,t,n))}):i.a.loadDocument(t,{onProgress:r,signal:d.signal}).then(t=>{const e=`<video class="media_view_content_video" src="${t}" playsinline autoplay controls ${c?"loop":""}></video>`;this.onLoaded(t,e,n)}).catch(t=>{"AbortError"!==t.name&&console.log(t)}),this.initMediaPlaylist(o)}initLoading(t,e,s,i){this.abort();const a={object:t,message:s,abortController:new AbortController};if(e){const t=o.e.html`
      <div class="message_media_progress">
        <svg class="message_media_progress_svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path class="message_media_progress_path" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        </svg>
      </div>
    `.buildElement(),s=Object(o.a)(".message_media_progress_path",t);t.addEventListener("click",t=>{t.stopPropagation(),a.aborted=!0,a.abortController.abort()}),e.appendChild(t),e.classList.add("message_media_thumb-loading"),a.onDone=()=>{t.remove(),e.classList.remove("message_media_thumb-loading"),a.aborted&&(this.state=null)},a.onProgress=t=>{const e=Math.max(0,Math.min(1,t/i));1===e?a.onDone():s.style.setProperty("--progress-value",e)},a.abortController.signal.addEventListener("abort",a.onDone)}return Object(o.i)(this.dom.content,"white"),this.dom.caption.innerHTML=a.message.message?o.e.html`<div class="media_view_caption_text">${a.message.message}</div>`:"",this.renderAuthor(a),this.state=a,a}onLoaded(t,e,s){s===this.state&&("string"==typeof e?this.dom.content.innerHTML=e:(this.dom.content.innerHTML="",this.dom.content.appendChild(e)),this.state.url=t,this.state.onDone&&this.state.onDone(),this.container.hidden=!1,document.addEventListener("keyup",this.onKeyUp))}async initMediaPlaylist(t){this.loadPlaylist(t,{_:"inputMessagesFilterPhotoVideo"})}async initGifPlaylist(t){this.loadPlaylist(t,{_:"inputMessagesFilterGif"})}async loadPlaylist(t,e){const s=this.state,i=MessagesApiManager.getMessageDialogPeer(t),{messages:o,users:a,chats:n}=await ApiClient.callMethod("messages.search",{peer:MessagesApiManager.getInputPeer(i),offset_id:t.id,add_offset:-20,limit:40,filter:e});if(s!==this.state)return;MessagesApiManager.updateUsers(a),MessagesApiManager.updateChats(n),s.playlist=o;const d=o.findIndex(e=>t.id===e.id);return this.dom.nav_left.hidden=d<=0,this.dom.nav_right.hidden=d>=o.length-1,o}onNav(t){const e=this.state.playlist;if(!e)return;const s=this.state.message;let i,o,a;for(let n=e.findIndex(t=>t.id===s.id)+t;n>=0&&n<e.length;n+=t)if(o=MessagesController.getMessageMediaThumb(e[n])){a=n,i=e[n];break}this.dom.nav_left.hidden=a<=0,this.dom.nav_right.hidden=a>=e.length-1,o&&(this.destroyContent(),"photo"===o.type?d.showPhoto(o.object,null,i):"video"===o.type?d.showVideo(o.object,null,i):"gif"===o.type&&d.showGif(o.object,null,i))}renderAuthor(t){const e=t.message;let s,i;if(e.fwd_from){const t=e.fwd_from;s=MessagesApiManager.getPeerById(t.from_id||t.channel_id),i=t.date}else s=MessagesApiManager.getMessageAuthorPeer(e),i=e.date;const a=MessagesApiManager.getPeerId(s);if(+this.dom.header_author.dataset.peerId===a)Object(o.a)(".media_view_author_description",this.dom.header_author).innerHTML=o.e.html`
        <div class="media_view_author_name">${MessagesApiManager.getPeerName(s)}</div>
        <div class="media_view_author_date">${MessagesController.formatMessageDateTime(i)}</div>
      `;else{this.dom.header_author.dataset.peerId=a,this.dom.header_author.innerHTML=o.e.html`
      <div class="media_view_author_photo"></div>
      <div class="media_view_author_description">
        <div class="media_view_author_name">${MessagesApiManager.getPeerName(s)}</div>
        <div class="media_view_author_date">${MessagesController.formatMessageDateTime(i)}</div>
      </div>
    `;const t=Object(o.a)(".media_view_author_photo",this.dom.header_author);ChatsController.loadPeerPhoto(t,s)}this.dom.header_author.onclick=()=>{let t;this.close(),t=e.fwd_from?e.fwd_from.channel_post||0:e.id,MessagesController.setChatByPeerId(a,t)}}abort(){this.state&&(this.state.streamingProcess&&this.state.streamingProcess.stop(),this.state.abortController&&this.state.abortController.abort()),this.state=null}isOpen(){return!this.container.hidden}destroyContent(){this.abort();const t=Object(o.a)("video",this.dom.content);t&&t.pause(),this.dom.content.innerHTML=""}getDownloadFilename(t){if("document"===t._){const e=a.a.getDocumentAttributes(t);if(e.file_name)return e.file_name}return t._+t.id}};window.MediaViewController=d},36:function(t,e,s){}}]);