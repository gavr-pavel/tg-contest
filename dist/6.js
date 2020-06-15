(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{33:function(t,e,n){"use strict";n.r(e),n.d(e,"ContactsController",(function(){return d}));var c=n(0),a=n(1),s=n(7),i=n(11);function o(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}const d=new class{constructor(){o(this,"onBack",()=>{this.container.hidden=!0,this.container.innerHTML="",i.a.container.hidden=!1;const t=Object(c.a)(".chats_header_back_button");t.hidden=!0,t.removeEventListener("click",this.onBack),Object(c.a)(".chats_header_menu_button").hidden=!1}),o(this,"onContactClick",t=>{const e=+t.currentTarget.dataset.userId;s.a.setChatByPeerId(e)})}show(){i.a.container.hidden=!0,this.container=Object(c.a)(".contacts_sidebar"),this.container.hidden=!1,this.loader=Object(c.i)(this.container);const t=Object(c.a)(".chats_header_back_button");t.addEventListener("click",this.onBack),t.hidden=!1,Object(c.a)(".chats_header_menu_button").hidden=!0,ApiClient.callMethod("contacts.getContacts").then(t=>{a.a.updateUsers(t.users),this.loader.remove(),this.render(t.contacts)})}render(t){const e=document.createDocumentFragment();for(const n of t){const t=a.a.users.get(n.user_id),c=this.buildItemElement(t);e.append(c)}this.container.append(e)}buildItemElement(t){const e=a.a.getUserName(t)||`+${t.phone}`,n=s.a.getUserStatusText(t),i=c.e.html`
      <div class="contacts_item" data-user-id="${t.id}">
        <div class="contacts_item_content mdc-ripple-surface">
          <div class="contacts_item_photo"></div>
          <div class="contacts_item_text">
            <div class="contacts_item_text_row">
              <div class="contacts_item_title">${e}</div>
            </div>
            <div class="contacts_item_text_row">
              <div class="contacts_item_status">${n}</div>
            </div>
          </div>
        </div>
      </div>
    `.buildElement();return this.loadContactPhoto(i,t),i.addEventListener("click",this.onContactClick),Object(c.g)(i.firstElementChild),i}loadContactPhoto(t,e){const n=Object(c.a)(".contacts_item_photo",t),s=a.a.getUserPeer(e);i.a.loadPeerPhoto(n,s)}};window.ContactsController=d}}]);