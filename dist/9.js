(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{51:function(e,t,i){"use strict";i.r(t),i.d(t,"ArchivedChatsController",(function(){return r}));var n=i(0),a=i(1);function s(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}const r=new class{constructor(){s(this,"onBack",()=>{this.container.hidden=!0}),s(this,"onDialogOrderUpdate",e=>{const{dialog:t,index:i,folderId:n}=e.detail;if(1!==n)return;const s=a.a.getPeerId(t.peer);let r=ChatsController.chatElements.get(s);r?(r.remove(),ChatsController.renderChatPreviewContent(r,t)):r=ChatsController.buildChatPreviewElement(t);const o=this.scrollContainer,c=o.children[i];c?c.before(r):o.appendChild(r)})}show(){this.container=Object(n.a)(".archived_chats_sidebar"),this.container.hidden=!1,this.container.innerHTML='\n      <div class="sidebar_header">\n        <button class="mdc-icon-button sidebar_back_button"></button>\n        <div class="sidebar_header_title">Archived chats</div>\n      </div>\n      <div class="archived_chats_list"></div>\n    ',this.scrollContainer=Object(n.a)(".archived_chats_list",this.container),this.loader=Object(n.i)(this.scrollContainer),Object(n.H)(Object(n.a)(".archived_chats_list",this.container));if(Object(n.a)(".sidebar_back_button",this.container).addEventListener("click",this.onBack),a.a.emitter.on("dialogOrderUpdate",this.onDialogOrderUpdate),a.a.archivedDialogs.length){this.renderChats(a.a.archivedDialogs);const e=a.a.archivedDialogs.slice(-1)[0];e.pinned||this.saveOffset(e)}this.loadMore()}loadMore(){this.loading=!0,a.a.loadArchivedDialogs(this.offset).then(e=>{e.length?(this.renderChats(e),this.saveOffset(e.slice(-1)[0])):this.noMore=!0}).finally(()=>{this.loading=!1})}saveOffset(e){const t=a.a.messages.get(e.top_message);this.offset={id:e.top_message,peer:e.peer,date:t.date}}renderChats(e){this.loader.remove();const t=document.createDocumentFragment();for(const i of e){const e=a.a.getPeerId(i.peer),n=ChatsController.chatElements.get(e)||ChatsController.buildChatPreviewElement(i);t.append(n)}this.scrollContainer.append(t)}};window.ArchivedChatsController=r}}]);