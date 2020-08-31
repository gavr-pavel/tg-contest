(window.webpackJsonp=window.webpackJsonp||[]).push([[7],{41:function(e,t,s){},46:function(e,t,s){"use strict";s.r(t),s.d(t,"FoldersSettingsController",(function(){return _}));s(41);var i=s(0),d=s(36),n=s(11),a=s(1),r=s(4);function l(e,t,s){return t in e?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s,e}class o{constructor(){l(this,"onBack",()=>{this.hide()}),l(this,"onScroll",()=>{const e=this.scrollContainer;(this.loading||!this.noMore&&e.scrollTop+e.offsetHeight>e.scrollHeight-300)&&this.loadMorePeers()}),l(this,"onChatTypeClick",e=>{const t=e.currentTarget,s=t.dataset.type,i=t.classList.toggle("folders_settings_chat-selected");this.diffTypes.has(s)?this.diffTypes.delete(s):this.diffTypes.set(s,i),this.checkDiff()}),l(this,"onPeerClick",e=>{const t=e.currentTarget,s=+t.dataset.peerId,i=t.classList.toggle("folders_settings_chat-selected");i?this.selectedPeers.set(s,a.a.getPeerById(s)):this.selectedPeers.delete(s),this.diffPeers.has(s)?this.diffPeers.delete(s):this.diffPeers.set(s,i),this.checkDiff()})}show(e,t,s,d){this.container=i.e.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">${s}</div>
          <button class="mdc-icon-button folders_settings_header_save_button" hidden></button>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_chats_list folders_settings_chats_list-types">
            <div class="folders_settings_chats_list_title">Chat types</div>
          </div>
          <div class="folders_settings_chats_list folders_settings_chats_list-peers">
            <div class="folders_settings_chats_list_title">Chats</div>
          </div>
        </div>
      </div>
    `.buildElement(),Object(i.a)(".left_sidebar").appendChild(this.container);const n=Object(i.a)(".folders_settings",this.container);n.addEventListener("scroll",this.onScroll),Object(i.H)(n),this.scrollContainer=n;const r=Object(i.a)(".folders_settings_header_save_button",this.container);r.addEventListener("click",()=>{this.hide();const e=Array.from(this.selectedPeers.values());d(this.diffTypes,e)}),this.saveButton=r;const l=Object(i.a)(".sidebar_back_button",this.container);l.addEventListener("click",this.onBack),Object(i.g)(l),requestAnimationFrame(()=>this.container.hidden=!1),this.diffTypes=new Map,this.diffPeers=new Map,this.selectedPeers=new Map(t.map(e=>[a.a.getPeerId(e),e])),this.renderChatTypes(e),this.peersOffset={id:0,peer:0,date:0},this.noMore=!1,this.loadMorePeers()}hide(){this.container.hidden=!0,setTimeout(()=>this.container.remove(),1e3)}renderChatTypes(e){const t=document.createDocumentFragment();for(const[s,d,n]of e){const e=i.e.html`
        <div class="folders_settings_chat folders_settings_chat-option ${s?"folders_settings_chat-selected":""}" data-type="${n}">
          <div class="folders_settings_chat_icon folders_settings_chat_icon-${n}"></div>
          <div class="folders_settings_chat_name _cut_text">${d}</div>
        </div>
      `.buildElement();e.addEventListener("click",this.onChatTypeClick),t.appendChild(e)}Object(i.a)(".folders_settings_chats_list-types",this.container).appendChild(t)}async loadMorePeers(){if(this.noMore||this.loading)return;let e=[];const t=this.peersOffset.peer?a.a.getPeerId(this.peersOffset.peer):0,s=a.a.dialogs.findIndex(e=>{const s=a.a.messages.get(e.top_message);return s&&s.date<t});if(s>-1&&(e=a.a.dialogs.slice(s,s+20)),!e.length){this.loading=!0;try{e=await a.a.loadDialogs(this.peersOffset)}catch(e){console.log(error);const t="An error occurred"+(error.error_message?": "+error.error_message:"");return void r.a.alert(t)}finally{this.loading=!1}if(!e.length)return void(this.noMore=!0);const t=e[e.length-1],s=a.a.messages.get(t.top_message);s&&(this.peersOffset={id:t.top_message,peer:t.peer,date:s.date})}const i=e.map(e=>e.peer);this.renderPeers(i)}renderPeers(e){const t=document.createDocumentFragment();for(const s of e){if(a.a.getPeerData(s).deleted)continue;const e=a.a.getPeerId(s),d=a.a.getPeerName(s),r=this.selectedPeers.has(e),l=i.e.html`
      <div class="folders_settings_chat folders_settings_chat-option ${r?"folders_settings_chat-selected":""}" data-peer-id="${e}">
        <div class="folders_settings_chat_photo"></div>
        <div class="folders_settings_chat_name _cut_text">${d}</div>
      </div>
    `.buildElement(),o=Object(i.a)(".folders_settings_chat_photo",l);n.a.loadPeerPhoto(o,s),l.addEventListener("click",this.onPeerClick),t.appendChild(l)}Object(i.a)(".folders_settings_chats_list-peers",this.container).appendChild(t)}checkDiff(){this.saveButton.hidden=!this.diffTypes.size&&!this.diffPeers.size}}function c(e,t,s){return t in e?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s,e}class h{constructor(){c(this,"onBack",()=>{this.hide()}),c(this,"onAddChatsClick",e=>{const t="included"===e.currentTarget.dataset.type,s=this.filter,i=t?"Included Chats":"Excluded Chats",d=t?this.getIncludedChatTypes(s):this.getExcludedChatTypes(s),n=(t?s.include_peers:s.exclude_peers).map(e=>a.a.getPeerByInputPeer(e));(new o).show(d,n,i,(e,s)=>{const i=this.filter;for(const[t,s]of e.entries())s?i[t]=!0:delete i[t];t?(i.include_peers=s.map(e=>a.a.getInputPeer(e)),this.renderIncludedChats(i,s)):(i.exclude_peers=s.map(e=>a.a.getInputPeer(e)),this.renderExcludedChats(i,s)),this.chatsChanged=!0,this.checkDiff()})})}show(e,t=!1,s){this.filter=e,this.container=i.e.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">${t?"New Folder":"Edit Folder"}</div>
          <button class="mdc-icon-button folders_settings_header_save_button ${t?"folders_settings_header_create_button":"folders_settings_header_edit_button"}" hidden></button>
          <button class="mdc-icon-button sidebar_extra_menu_button" hidden></button>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_intro">
            <tgs-player src="tgs/Folders_2.tgs" autoplay class="folders_settings_intro_image"></tgs-player>
            <div class="folders_settings_intro_text" ${t?"":"hidden"}>Choose chats and type of chats that will<br>appear and never appear in this folder.</div>
            <div class="mdc-text-field mdc-text-field--outlined folders_settings_title_text_field">
              <input class="mdc-text-field__input" value="${e.title}">
              <div class="mdc-notched-outline">
                <div class="mdc-notched-outline__leading"></div>
                <div class="mdc-notched-outline__notch">
                  <label class="mdc-floating-label">Folder Name</label>
                </div>
                <div class="mdc-notched-outline__trailing"></div>
              </div>
            </div>
          </div>
          <div class="folders_settings_chats_list">
            <div class="folders_settings_chats_list_title">Included chats</div>
            <button class="folders_settings_chats_list_add_button" data-type="included">Add Chats</button>
            <div class="folders_settings_chats_list_content folders_settings_chats_list_content-included"></div>
          </div>
          <div class="folders_settings_chats_list">
            <div class="folders_settings_chats_list_title">Excluded chats</div>
            <button class="folders_settings_chats_list_add_button" data-type="excluded">Add Chats</button>
            <div class="folders_settings_chats_list_content folders_settings_chats_list_content-excluded"></div>
          </div>
        </div>
      </div>
    `.buildElement(),Object(i.a)(".left_sidebar").appendChild(this.container),Object(i.H)(Object(i.a)(".folders_settings",this.container));const n=Object(i.a)(".folders_settings_header_save_button",this.container);n.addEventListener("click",()=>{this.hide(),s(this.filter)}),this.saveButton=n;Object(i.a)(".sidebar_extra_menu_button",this.container).addEventListener("click",()=>{});const a=new d.a(Object(i.a)(".folders_settings_title_text_field",this.container));a.input_.addEventListener("input",()=>{e.title=a.value.trim(),this.titleChanged=!0,this.checkDiff()});for(const e of Object(i.b)(".folders_settings_chats_list_add_button",this.container))e.addEventListener("click",this.onAddChatsClick);const r=Object(i.a)(".sidebar_back_button",this.container);r.addEventListener("click",this.onBack),Object(i.g)(r),requestAnimationFrame(()=>this.container.hidden=!1),t||Promise.all([this.loadPeers(e.include_peers),this.loadPeers(e.exclude_peers)]).then(([t,s])=>{this.renderIncludedChats(e,t),this.renderExcludedChats(e,s)})}hide(){this.container.hidden=!0,setTimeout(()=>this.container.remove(),1e3)}async loadPeers(e){return await a.a.loadPeers(e),e.map(e=>a.a.getPeerByInputPeer(e))}getIncludedChatTypes(e){return[[e.contacts,"Contacts","contacts"],[e.non_contacts,"Non-Contacts","non_contacts"],[e.groups,"Groups","groups"],[e.broadcasts,"Channels","broadcasts"],[e.bots,"Bots","bots"]]}getExcludedChatTypes(e){return[[e.exclude_muted,"Muted","exclude_muted"],[e.exclude_read,"Read","exclude_read"],[e.exclude_archived,"Archived","exclude_archived"]]}renderIncludedChats(e,t){const s=this.getIncludedChatTypes(e),d=Object(i.a)(".folders_settings_chats_list_content-included",this.container);this.renderChatsList(s,t,d)}renderExcludedChats(e,t){const s=this.getExcludedChatTypes(e),d=Object(i.a)(".folders_settings_chats_list_content-excluded",this.container);this.renderChatsList(s,t,d)}renderChatsList(e,t,s){s.innerHTML="";const i=document.createDocumentFragment();for(const[t,s,d]of e)if(t){const e=this.buildChatElement(s,d);i.appendChild(e)}for(const e of t){const t=a.a.getPeerName(e),s=this.buildChatElement(t,null,e);i.appendChild(s)}i.childElementCount&&(s.appendChild(i),s.hidden=!1)}buildChatElement(e,t,s=null){const d=i.e.html`
      <div class="folders_settings_chat">
        ${s?i.e.html`<div class="folders_settings_chat_photo"></div>`:i.e.html`<div class="folders_settings_chat_icon folders_settings_chat_icon-${t}"></div>`}
        <div class="folders_settings_chat_name _cut_text">${e}</div>
      </div>
    `.buildElement();if(s){const e=Object(i.a)(".folders_settings_chat_photo",d);n.a.loadPeerPhoto(e,s)}return d}checkDiff(){const e=this.filter,t=this.getIncludedChatTypes(e).some(([e])=>e)||!!e.include_peers.length;this.saveButton.hidden=!e.title||!t||!this.titleChanged&&!this.chatsChanged}}class _{constructor(){var e,t,s;s=()=>{this.hide()},(t="onBack")in(e=this)?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s}show(){this.container=i.e.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">Chat Folders</div>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_intro">
            <tgs-player src="tgs/Folders_1.tgs" autoplay class="folders_settings_intro_image"></tgs-player>
            <div class="folders_settings_intro_text">Create folders for different groups of chats<br>and quickly switch between them.</div>
            <button class="folders_settings_intro_create_button">Create Folder</button>
          </div>
          <div class="folders_settings_filters_list folders_settings_filters_list-my" hidden>
            <div class="folders_settings_filters_list_title">Folders</div>
          </div>
          <div class="folders_settings_filters_list folders_settings_filters_list-recommended" hidden>
            <div class="folders_settings_filters_list_title">Recommended folders</div>
          </div>
        </div>
      </div>
    `.buildElement(),Object(i.a)(".left_sidebar").appendChild(this.container),Object(i.H)(Object(i.a)(".folders_settings",this.container));const e=Object(i.a)(".sidebar_back_button",this.container);e.addEventListener("click",this.onBack),Object(i.g)(e);Object(i.a)(".folders_settings_intro_create_button",this.container).addEventListener("click",()=>{const e={_:"dialogFilter",id:this.getNewFolderId(),title:"",pinned_peers:[],include_peers:[],exclude_peers:[]};(new h).show(e,!0,e=>{this.createFilter(e)})}),requestAnimationFrame(()=>this.container.hidden=!1),this.loadFolders()}hide(){this.container.hidden=!0,setTimeout(()=>this.container.remove(),1e3)}async loadFolders(){const[e,t]=await Promise.all([ApiClient.callMethod("messages.getDialogFilters"),ApiClient.callMethod("messages.getSuggestedDialogFilters")]);this.filters=e,this.suggestedFilters=t,e.length&&this.renderFiltersList("my",e),t.length&&this.renderFiltersList("recommended",t)}renderFiltersList(e,t){const s=Object(i.a)(".folders_settings_filters_list-"+e,this.container),d=document.createDocumentFragment();for(const e of t){const t="dialogFilterSuggested"===e._,s=t?e.filter:e,i=t?e.description:this.getFilterDescription(s),n=this.buildFilterEl(s,i,t);d.appendChild(n)}s.appendChild(d),s.hidden=!1}buildFilterEl(e,t,s=!1){const d=i.e.html`
      <div class="folders_settings_filter">
        <div class="folders_settings_filter_info">
          <div class="folders_settings_filter_title">${e.title}</div>
          <div class="folders_settings_filter_description">${t}</div>
        </div>
        ${s?i.e.html`<button class="folders_settings_filter_add_button">Add</button>`:""}
      </div>
    `.buildElement();if(s){Object(i.a)(".folders_settings_filter_add_button",d).addEventListener("click",()=>this.addSuggestedFilter(d,e))}else d.addEventListener("click",()=>this.editFilter(d,e));return d}addSuggestedFilter(e,t){t.id=this.getNewFolderId(),this.createFilter(t),e.remove();const s=Object(i.a)(".folders_settings_filters_list-recommended",this.container);Object(i.a)(".folders_settings_filter",s)||(s.hidden=!0)}createFilter(e){DialogsApiManager.updateDialogFilter(e);const t=this.buildFilterEl(e,this.getFilterDescription(e));Object(i.a)(".folders_settings_filters_list-my",this.container).appendChild(t)}editFilter(e,t){(new h).show(t,!1,()=>{DialogsApiManager.updateDialogFilter(t),t?e.replaceWith(this.buildFilterEl(t,this.getFilterDescription(t))):e.remove()})}getFilterDescription(e){let t="";const s=e.exclude_peers.length;if(e.contacts&&e.non_contacts&&e.groups&&e.broadcasts&&e.bots){t=`All ${[e.exclude_muted&&"unmuted",e.exclude_read&&"unread",e.exclude_archived&&"unarchived"].filter(e=>e).join(", ")} `,t+=s?` except ${s} ${s>1?"chats":"chat"}`:" chats"}else t=[e.contacts&&"Contacts",e.non_contacts&&"Non-Contacts",e.groups&&"Groups",e.broadcasts&&"Channels",e.bots&&"Bots"].filter(e=>e).join(", "),e.include_peers.length&&(t+=" and "+e.include_peers.length,s||(t+=" chats")),s&&(t+=` except ${s} ${s>1?"chats":"chat"}`);return t}getNewFolderId(){for(;;){const e=Math.round(255*Math.random());if(!this.filters.some(t=>t.id===e))return e}}}}}]);