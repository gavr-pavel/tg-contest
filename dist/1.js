(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{24:function(e,t,i){"use strict";i.r(t),i.d(t,"EmojiDropdown",(function(){return r}));var s=i(0),o=i(15),n=i(3),d=i(16),a=(i(42),i(39));function c(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}const r=new class{constructor(){c(this,"stickerSets",new Map),c(this,"favedStickers",null),c(this,"recentStickers",null),c(this,"gifs",new Map),c(this,"onStickerNavClick",e=>{const t=e.target.dataset.setId;Object(s.a)(`.emoji_dropdown_list[data-set-id="${t}"]`,this.dom.section_stickers).scrollIntoView()}),c(this,"onStickersNavScroll",e=>{e.preventDefault();const t=e.currentTarget,i=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;t.scrollLeft+=i}),c(this,"onStickerSetAdd",e=>{const t=e.currentTarget,i=t.dataset.setId,s=this.stickerSets.get(i);t.classList.toggle("emoji_dropdown_search_sticker_set_add_button-added")?(this.installStickerSet(s),t.innerText="Added"):(this.uninstallStickerSet(s),t.innerText="Add")}),c(this,"onBottomNavClick",e=>{const t=e.target;if(t.classList.contains("emoji_dropdown_bottom_nav_item")){const e=t.dataset.jsLabel.replace(/^nav_/,"");"search"===e?this.initSearch(this.section):"delete"===e?(this.input.focus(),document.execCommand("delete",!1),Object(s.J)()&&this.input.blur()):this.setSection(e)}}),c(this,"onEmojiClick",e=>{const t=e.target;e.target.classList.contains("emoji_dropdown_list_item")&&(this.input.focus(),document.execCommand("insertText",!1,t.innerText),Object(s.J)()&&this.input.blur())}),c(this,"onEmojiNavClick",e=>{const t=e.target.dataset.category,i=Object(s.a)(".emoji_dropdown_list-"+t,this.dom.section_emoji),o=Object(s.a)(".emoji_dropdown_section_content",this.dom.section_emoji);o.style.overflow="hidden",i.scrollIntoView(),o.style.overflow=""}),c(this,"onEmojiScroll",e=>{const t=e.currentTarget,i=t.offsetHeight,o=t.scrollTop;let n;for(const e of t.children){if(e.offsetTop>o+i/2)break;n=e}if(!n)return;const d=n.dataset.category,a=Object(s.a)(".emoji_dropdown_top_nav_item-active",this.dom.section_emoji);a&&a.classList.remove("emoji_dropdown_top_nav_item-active");Object(s.a)(".emoji_dropdown_top_nav_item-"+d,this.dom.section_emoji).classList.add("emoji_dropdown_top_nav_item-active")}),c(this,"onStickersScroll",e=>{const t=e.currentTarget,i=t.offsetHeight,s=t.scrollTop,o=[];for(const e of t.children)if(!(e.offsetTop+e.offsetHeight<s-50)){if(e.offsetTop>s+i+50)break;o.push(e)}for(const e of o)if(isFinite(e.dataset.setId)){const t=this.stickerSets.get(e.dataset.setId);t&&this.loadStickersList(e,t.documents)}}),c(this,"onStickerClick",e=>{const t=e.target;if(!t.classList.contains("emoji_dropdown_list_item"))return;const i=t.parentNode.dataset.setId,s=t.dataset.stickerIndex,o=this.getSetSticker(i,s);d.a.onStickerSend(o)}),c(this,"onStickerOver",e=>{const t=e.target;if(!t.classList.contains("emoji_dropdown_list_item"))return;const i=t.firstElementChild;if(i){const e=t.parentNode.dataset.setId,s=t.dataset.stickerIndex,o=this.getSetSticker(e,s);this.isAnimatedSticker(o)&&this.playAnimatedSticker(t,i,o)}}),c(this,"onStickerTouchStart",e=>{const t=e.target;if(!t.classList.contains("emoji_dropdown_list_item"))return;this.onStickerOver(e);const i=()=>{clearTimeout(o),document.removeEventListener("touchmove",i),document.removeEventListener("touchend",i)};let o=setTimeout(()=>{const e=s.e.html`<div class="emoji_dropdown_list_item"></div>`.buildElement();t.replaceWith(e),t.classList.add("emoji_dropdown_list_item-preview"),(e.closest(".stickers_popup_content")||this.container).appendChild(t),Object(s.k)(),document.body.classList.add("no_select"),document.addEventListener("touchend",()=>{t.classList.remove("emoji_dropdown_list_item-preview"),e.replaceWith(t),document.body.classList.remove("no_select")},{once:!0})},300);document.addEventListener("touchmove",i),document.addEventListener("touchend",i)}),c(this,"onGifClick",e=>{const t=e.target;if(!t.classList.contains("emoji_dropdown_list_item"))return;const i=this.gifs.get(t.dataset.id);d.a.onStickerSend(i)}),c(this,"onGifOver",e=>{const t=e.target;if(!t.classList.contains("emoji_dropdown_list_item"))return;const i=this.gifs.get(t.dataset.id);this.playGif(t,i)}),c(this,"onButtonClick",()=>{this.isShown()||this.show()}),c(this,"onMouseEnter",()=>{clearTimeout(this.hideTimeout),this.isShown()||this.show()}),c(this,"onMouseLeave",()=>{this.hideTimeout=setTimeout(()=>{this.isShown()&&this.hide(),this.hideTimeout=null},500)}),c(this,"onGlobalClick",e=>{this.container.contains(e.target)||e.target===this.button?this.dom.search_container.contains(e.target)||e.preventDefault():this.hide()})}init(){this.container=s.e.html`
      <div class="emoji_dropdown" hidden>
        <div class="emoji_dropdown_sections_wrap" data-js-label="sections_wrap">
          <section class="emoji_dropdown_section emoji_dropdown_section-emoji" data-js-label="section_emoji">
            <div class="emoji_dropdown_top_nav"></div>
            <div class="emoji_dropdown_section_content"></div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-stickers" data-js-label="section_stickers">
            <div class="emoji_dropdown_top_nav"></div>
            <div class="emoji_dropdown_section_content"></div>
          </section>
          <section class="emoji_dropdown_section emoji_dropdown_section-gifs" data-js-label="section_gifs"> 
            <div class="emoji_dropdown_section_content"></div>
          </section>        
        </div>
        <div class="emoji_dropdown_bottom_nav" data-js-label="bottom_nav">
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-search" data-js-label="nav_search"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-emoji" data-js-label="nav_emoji"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-stickers" data-js-label="nav_stickers"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-gifs" data-js-label="nav_gifs"></div>
          <div class="emoji_dropdown_bottom_nav_item emoji_dropdown_bottom_nav_item-delete" data-js-label="nav_delete"></div>
        </div>
        <div class="emoji_dropdown_search_container" data-js-label="search_container" hidden>
          <div class="emoji_dropdown_search_header">
            <button class="emoji_dropdown_search_back_button mdc-icon-button"></button>
            <input class="emoji_dropdown_search_input">
          </div>
          <div class="emoji_dropdown_search_results" data-js-label="search_results"></div>
          <div class="emoji_dropdown_search_trending" data-js-label="search_trending"></div>
        </div>
      </div>
    `.buildElement(),this.dom=Object(s.B)(this.container),this.dom.bottom_nav.addEventListener("click",this.onBottomNavClick),Object(s.H)(this.dom.search_container),this.initEmojiSection(),this.initStickersSection(),this.initGifsSection(),this.setSection("emoji")}initEmojiSection(){let e="",t="";for(const i in o.a){let s="";for(const e of o.a[i])s+=`<div class="emoji_dropdown_list_item">${e}</div>`;e+=`<div class="emoji_dropdown_list emoji_dropdown_list-${i}" data-category="${i}">${s}</div>`,t+=`<div class="emoji_dropdown_top_nav_item emoji_dropdown_top_nav_item-${i}" data-category="${i}"></div>`}const i=Object(s.a)(".emoji_dropdown_section_content",this.dom.section_emoji);i.innerHTML=e,i.addEventListener("click",this.onEmojiClick),i.addEventListener("scroll",this.onEmojiScroll);const n=Object(s.a)(".emoji_dropdown_top_nav",this.dom.section_emoji);n.innerHTML=t,n.addEventListener("click",this.onEmojiNavClick)}async loadStickers(){let e,t,i=s.d.get("user_stickers");const[o,d,a]=await Promise.all([n.a.callMethod("messages.getAllStickers",{hash:i?i.hash:0}),n.a.callMethod("messages.getFavedStickers",{hash:e?e.hash:0}),n.a.callMethod("messages.getRecentStickers",{hash:t?t.hash:0})]);return"messages.allStickersNotModified"!==o._&&(i=o,s.d.set("user_stickers",i)),"messages.favedStickersNotModified"!==d._&&(e=d,s.d.set("faved_stickers",e)),"messages.recentStickersNotModified"!==a._&&(t=a,s.d.set("recent_stickers",t)),this.favedStickers=e,this.recentStickers=t,[i,e,t]}async initStickersSection(){const[e,t,i]=await this.loadStickers(),o=document.createDocumentFragment(),n=document.createDocumentFragment();if(i.stickers.length){const e="recent",t=s.e.html`<div class="emoji_dropdown_list" data-set-id="${e}"></div>`.buildElement(),d=s.e.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${e}"></div>`.buildElement();this.renderStickersList(t,"Recently used",i.stickers,!0),o.appendChild(t),n.append(d)}if(t.stickers.length){const e="faved",i=s.e.html`<div class="emoji_dropdown_list" data-set-id="${e}"></div>`.buildElement(),d=s.e.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${e}"></div>`.buildElement();this.renderStickersList(i,"Favorite",t.stickers,!0),o.appendChild(i),n.append(d)}for(let t=0;t<e.sets.length;t++){const i=e.sets[t],d=s.e.html`<div class="emoji_dropdown_list" data-set-id="${i.id}"></div>`.buildElement(),a=s.e.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${i.id}"></div>`.buildElement();this.initStickerSet(i,d,a,t<3),o.appendChild(d),n.append(a)}const d=Object(s.a)(".emoji_dropdown_section_content",this.dom.section_stickers);d.appendChild(o),d.addEventListener("scroll",this.onStickersScroll),d.addEventListener("click",this.onStickerClick),d.addEventListener("mouseover",this.onStickerOver),d.addEventListener("touchstart",this.onStickerTouchStart);const a=Object(s.a)(".emoji_dropdown_top_nav",this.dom.section_stickers);a.append(n),a.addEventListener("click",this.onStickerNavClick),Object(s.F)(a)}async loadStickerSet(e){if(this.stickerSets.has(e.id))return this.stickerSets.get(e.id);const t=await n.a.callMethod("messages.getStickerSet",{stickerset:{_:"inputStickerSetID",id:e.id,access_hash:e.access_hash}});return this.stickerSets.set(e.id,t),t}async initStickerSet(e,t,i,s=!1){const o=await this.loadStickerSet(e);this.renderStickersList(t,e.title,o.documents,s),this.loadStickerSetThumb(i,o)}renderStickersList(e,t,i,o=!1){const n=s.e.html`<div class="emoji_dropdown_list_title">${t}</div>`.buildElement();e.appendChild(n);for(let t=0;t<i.length;t++){const i=s.e.html`<div class="emoji_dropdown_list_item" data-sticker-index="${t}"></div>`.buildElement();e.appendChild(i)}o&&this.loadStickersList(e,i,!0)}loadStickersList(e,t,i=!1){if(!e.dataset.loaded){e.dataset.loaded=1;for(const s of e.children){if(s.classList.contains("emoji_dropdown_list_title"))continue;const e=t[s.dataset.stickerIndex];this.loadStickerThumb(s,e,i)}}}async loadStickerThumb(e,t,i){const o=i?0:1;{const i=await FileApiManager.loadDocumentThumb(t,"m",{cache:!0,priority:o,mimeType:"image/webp"});e.innerHTML=s.e.html`<img class="emoji_dropdown_sticker_img" src="${i}">`}}async loadStickerSetThumb(e,t){if(t.set.thumb){const i=t.set.animated,s=i?"application/x-tgsticker":"image/webp",o=await FileApiManager.loadStickerSetThumb(t.set,{cache:!0,mimeType:s});e.innerHTML=i?`<tgs-player class="emoji_dropdown_sticker_img" src="${o}"></tgs-player>`:`<img class="emoji_dropdown_sticker_img" src="${o}">`}else if(t.documents[0])return this.loadStickerThumb(e,t.documents[0])}isAnimatedSticker(e){return"application/x-tgsticker"===e.mime_type}async initGifsSection(){const{gifs:e}=await n.a.callMethod("messages.getSavedGifs",{hash:0}),t=Object(s.a)(".emoji_dropdown_section_content",this.dom.section_gifs);this.renderGifsList(e,t),this.preloadGifsList(e)}renderGifsList(e,t){const i=document.createDocumentFragment();for(const t of e){this.gifs.set(t.id,t);const e=MediaApiManager.getDocumentAttributes(t),o=Math.min(150,e.w*(100/e.h)),n=s.e.html`<div class="emoji_dropdown_list_item" data-id="${t.id}" style="width: ${o}px;"></div>`.buildElement(),d=MediaApiManager.getStrippedPhoto(t.thumbs);let a;d&&(n.innerHTML=s.e.html`<div class="emoji_dropdown_gif_inline_preview" style="background-image: url('${d}')"></div>`,a=n.firstElementChild);MediaApiManager.choosePhotoSize(t.thumbs,"s")?FileApiManager.loadDocumentThumb(t,"s",{cache:1}).then(e=>{n.style.backgroundImage=`url('${e}')`,a&&a.remove()}):FileApiManager.loadDocument(t,{cache:1}).then(e=>{n.innerHTML=s.e.html`<video class="emoji_dropdown_gif_video" src="${e}" muted loop playsinline></video>`,Object(s.J)()&&window.document.addEventListener("touchstart",n.firstElementChild.load(),{once:!0})}),n.addEventListener(Object(s.J)()?"touchstart":"mouseover",this.onGifOver),n.addEventListener("click",this.onGifClick),i.appendChild(n)}t.appendChild(i)}async preloadGifsList(e){for(const t of e)t.video_thumbs||await FileApiManager.loadDocument(t,{cache:1})}setSection(e){if(e===this.section)return;this.section&&this.dom["nav_"+this.section].classList.remove("emoji_dropdown_bottom_nav_item-active"),this.section=e,this.dom["nav_"+this.section].classList.add("emoji_dropdown_bottom_nav_item-active"),this.dom.nav_search.hidden=!("stickers"===e||"gifs"===e),this.dom.nav_delete.hidden="emoji"!==e||!(this.input&&this.input.value);const t=100/3*-["emoji","stickers","gifs"].indexOf(e);this.dom.sections_wrap.style.transform=`translateX(${t}%)`}initSearch(e){const t=this.dom.search_container;t.hidden=!1,this.container.classList.add("emoji_dropdown-search"),MessagesController.footer.classList.add("no_transition"),MessagesController.footer.classList.remove("messages_footer_emoji-shown");const i=Object(s.a)(".emoji_dropdown_search_results",t),o=Object(s.a)(".emoji_dropdown_search_trending",t),n=Object(s.a)(".emoji_dropdown_search_input",t),d=Object(s.a)(".emoji_dropdown_search_back_button",t);let a,c;"stickers"===e?(t.classList.add("emoji_dropdown_search-stickers"),n.placeholder="Search Stickers",this.loadTrendingStickers(o)):"gifs"===e&&(t.classList.add("emoji_dropdown_search-gifs"),n.placeholder="Search GIFs",n.oninput=()=>this.searchGifs(n.value,i),this.searchGifs("",o).then(e=>a=e)),n.focus();let r,l,_=!1;const h=Object(s.o)(()=>{const e=n.value.trim();e&&e!==c&&(r&&r.abort(),c=e,l=null,i.innerHTML="",r=new AbortController,m(e,r.signal)),i.hidden=!e,o.hidden=!!e},300),m=async(t,s,n,d)=>{_=!0;try{const t=d?o:i;let r;"stickers"===e?r=await this.searchStickers(c,t,s,n):"gifs"===e&&(r=await this.searchGifs(c,t,s,n)),s.aborted||(d?a=r:l=r)}catch(e){console.error(e)}finally{_=!1}};n.oninput=h,h(),t.onscroll=()=>{const i=t;if(!_&&i.scrollTop+i.offsetHeight>i.scrollHeight-300){const t=!c&&"gifs"===e,i=t?a:l;i&&(r=new AbortController,m(c,r.signal,i,t))}},d.onclick=()=>{t.hidden=!0,this.container.classList.remove("emoji_dropdown-search"),MessagesController.footer.classList.add("messages_footer_emoji-shown"),requestAnimationFrame(()=>MessagesController.footer.classList.remove("no_transition")),t.classList.remove("emoji_dropdown_search-stickers","emoji_dropdown_search-gifs"),i.innerHTML="",o.innerHTML="",n.oninput=null,n.value="",d.onclick=null}}async loadTrendingStickers(e){const t=Object(s.i)(e),{sets:i}=await n.a.callMethod("messages.getFeaturedStickers");t.remove(),this.renderFoundStickers(i,e)}async searchStickers(e,t,i,o){const d=o?null:Object(s.i)(t),{sets:a,hash:c}=await n.a.callMethod("messages.searchStickerSets",{q:e,hash:o});if(!(!a||i&&i.aborted))return d&&d.remove(),this.renderFoundStickers(a,t,i),a.length&&c?c:void 0}renderFoundStickers(e,t,i){const o=document.createDocumentFragment();for(const t of e){const e=t.set,n=!!e.installed_date,d=s.e.html`
        <div class="emoji_dropdown_search_sticker_set">
          <div class="emoji_dropdown_search_sticker_set_header">
            <div class="emoji_dropdown_search_sticker_set_description">
              <div class="emoji_dropdown_search_sticker_set_title">${e.title}</div>
              <div class="emoji_dropdown_search_sticker_set_count">${e.count} stickers</div>
            </div>
            <button class="emoji_dropdown_search_sticker_set_add_button ${n?"emoji_dropdown_search_sticker_set_add_button-added":""}" data-set-id="${e.id}">${n?"Added":"Add"}</button>
          </div>
          <div class="emoji_dropdown_search_sticker_set_preview" data-set-id="${e.id}"></div>
        </div>
      `.buildElement();o.appendChild(d);const a=Object(s.a)(".emoji_dropdown_search_sticker_set_preview",d);Object(s.a)(".emoji_dropdown_search_sticker_set_add_button",d).addEventListener("click",this.onStickerSetAdd),this.loadFoundStickersPreview(e,a,i)}t.appendChild(o)}installStickerSet(e){const t=e.set,i={_:"inputStickerSetID",id:t.id,access_hash:t.access_hash};n.a.callMethod("messages.installStickerSet",{stickerset:i}),e.set.installed_date=n.a.getServerTimeNow();const o=s.e.html`<div class="emoji_dropdown_list" data-set-id="${t.id}"></div>`.buildElement(),d=s.e.html`<div class="emoji_dropdown_top_nav_item" data-set-id="${t.id}"></div>`.buildElement();this.initStickerSet(t,o,d);const a=Object(s.a)(".emoji_dropdown_top_nav",this.dom.section_stickers),c=Object(s.a)(".emoji_dropdown_section_content",this.dom.section_stickers);if(a.children.length){const e=a.children;let t=0;for(;t+1<e.length&&isNaN(e[t+1].dataset.setId);)t++;a.children[t].after(d),c.children[t].after(o)}else a.append(d),c.append(o)}uninstallStickerSet(e){const t=e.set,i={_:"inputStickerSetID",id:t.id,access_hash:t.access_hash};n.a.callMethod("messages.uninstallStickerSet",{stickerset:i}),delete e.set.installed_date,Object(s.a)(`.emoji_dropdown_list[data-set-id="${t.id}"]`,this.dom.section_stickers).remove(),Object(s.a)(`.emoji_dropdown_top_nav_item[data-set-id="${t.id}"]`,this.dom.section_stickers).remove()}async loadFoundStickersPreview(e,t,i){const o=await this.loadStickerSet(e),n=Math.min(e.count,8);for(let e=0;e<n;e++){const i=s.e.html`<div class="emoji_dropdown_list_item" data-sticker-index="${e}"></div>`.buildElement();t.appendChild(i)}t.addEventListener("mouseover",this.onStickerOver);const d=o.documents.slice(0,n);this.loadStickersList(t,d,i)}async searchGifs(e,t,i,o){const d=o?null:Object(s.i)(t),a=await this.getGifSearchBotUser(),{results:c,next_offset:r}=await n.a.callMethod("messages.getInlineBotResults",{bot:MessagesApiManager.getInputUser(a),peer:{_:"inputPeerSelf"},query:e,offset:o});if(i&&i.aborted)return;d&&d.remove();const l=c.map(e=>e.document);return this.renderGifsList(l,t),l.length&&r?r:void 0}async getGifSearchBotUser(){if(!this.gifBotUser){const{users:[e]}=await n.a.callMethod("contacts.resolveUsername",{username:"gif"});this.gifBotUser=e}return this.gifBotUser}async playAnimatedSticker(e,t,i){let o,n=!1;const d=()=>{n=!0,c()};Object(s.J)()?e.addEventListener("touchend",d,{once:!0}):e.addEventListener("mouseout",d,{once:!0});const a=await FileApiManager.loadDocument(i,{cache:1,priority:10});function c(){o&&(o.stop(),o.remove()),t.hidden=!1}n||(o=s.e.html`<tgs-player class="emoji_dropdown_sticker_img" hidden src="${a}" loop></tgs-player>`.buildElement(),e.appendChild(o),o.addEventListener("ready",()=>n?c():(t.hidden=!0,o.hidden=!1,void o.play()),{once:!0}))}getSetSticker(e,t){if("recent"===e)return this.recentStickers.stickers[t];if("faved"===e)return this.favedStickers.stickers[t];return this.stickerSets.get(e).documents[t]}async playGif(e,t){let i=!1,o=null,n=!1;e.firstElementChild&&"VIDEO"===e.firstElementChild.tagName&&(o=e.firstElementChild,n=!0);const d=()=>{i=!0,o&&(o.pause(),n?o.currentTime=0:o.remove())};if(Object(s.J)()?window.document.addEventListener("touchend",d,{once:!0}):e.addEventListener("mouseout",d,{once:!0}),o)o.play();else{const n=await FileApiManager.loadDocument(t,{cache:1,priority:10});i||(o=s.e.html`<video class="emoji_dropdown_gif_video" src="${n}" muted autoplay loop playsinline></video>`.buildElement(),e.appendChild(o))}}isShown(){return!this.container.hidden}show(){this.container.hidden=!1,this.button.classList.add("messages_form_emoji_button-active"),document.addEventListener("mousedown",this.onGlobalClick),Object(s.J)()||this.input.focus(),requestAnimationFrame(()=>{MessagesController.footer.classList.add("messages_footer_emoji-shown")}),Object(s.J)();const e=Object(s.b)(".emoji_dropdown_section_content",this.container);for(const t of e)t.dispatchEvent(new Event("scroll"))}hide(e=!1){this.container.hidden=!0,e&&MessagesController.footer.classList.add("no_transition"),MessagesController.footer.classList.remove("messages_footer_emoji-shown"),e&&requestAnimationFrame(()=>{MessagesController.footer.classList.remove("no_transition")}),this.button.classList.remove("messages_form_emoji_button-active"),document.removeEventListener("mousedown",this.onGlobalClick)}bind(e,t){this.button=e,this.input=t,Object(s.J)()?e.addEventListener("click",()=>{this.isShown()?(this.hide(!0),t.focus()):this.show()}):(e.addEventListener("mousedown",this.onButtonClick),e.addEventListener("mouseenter",this.onMouseEnter),e.addEventListener("mouseleave",this.onMouseLeave),this.container.addEventListener("mouseenter",this.onMouseEnter),this.container.addEventListener("mouseleave",this.onMouseLeave)),t.addEventListener("input",()=>{this.dom.nav_delete.hidden=!t.value||"emoji"!==this.section})}async showStickerSetPopup(e){const t=await this.loadStickerSet(e),i=t.set;let o=!!i.installed_date;const n=new a.a({title:i.title,content:s.e.html`
        <div class="stickers_popup_content">
          <div class="stickers_popup_list"></div>
        </div>
        <div class="stickers_popup_footer">
          <button class="mdc-button stickers_popup_button"></button>
        </div>
      `}),d=Object(s.a)(".stickers_popup_list",n.el),c=Object(s.a)(".stickers_popup_button",n.el),r=e=>{c.classList.toggle("mdc-button--unelevated",!e),c.innerText=e?"Remove stickers":`Add ${t.documents.length} stickers`};r(o);const l=t.documents;for(let e=0;e<l.length;e++){const t=s.e.html`<div class="emoji_dropdown_list_item" data-sticker-index="${e}"></div>`.buildElement();d.appendChild(t)}d.dataset.setId=i.id,d.addEventListener("click",this.onStickerClick),d.addEventListener("mouseover",this.onStickerOver),d.addEventListener("touchstart",this.onStickerTouchStart),this.loadStickersList(d,l),c.addEventListener("click",()=>{o?this.uninstallStickerSet(t):this.installStickerSet(t),o=!o,r(o)}),d.addEventListener("click",e=>{e.target.classList.contains("emoji_dropdown_list_item")&&n.hide()}),n.show(),Object(s.H)(d)}};window.EmojiDropdown=r},39:function(e,t,i){"use strict";i.d(t,"a",(function(){return n}));var s=i(0);i(40);function o(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class n{constructor({title:e,content:t,buttonText:i=null,onButtonClick:n=null}){o(this,"onLayerClick",e=>{e.target===e.currentTarget&&this.hide()}),o(this,"show",()=>{Object(s.a)(".main_container").appendChild(this.el),requestAnimationFrame(()=>{this.el.hidden=!1})}),o(this,"hide",()=>{this.el.hidden=!0,setTimeout(()=>{this.el.remove(),this.el=null},400)});let d="";i&&(d=s.e.html`
        <button class="mdc-button mdc-button--unelevated popup_header_button">${i}</button>
      `),this.el=s.e.html`
      <div class="popup_layer" hidden>
        <div class="popup">
          <div class="popup_header">
            <button class="mdc-icon-button popup_close_button"></button>
            <div class="popup_title">${e}</div>
            ${d}        
          </div>
          <div class="popup_content">${t}</div>
        </div>
      </div>
    `.buildElement(),this.el.addEventListener("click",this.onLayerClick),Object(s.a)(".popup_close_button",this.el).addEventListener("click",this.hide),d&&n&&Object(s.a)(".popup_header_button",this.el).addEventListener("click",n)}}},40:function(e,t,i){},42:function(e,t,i){}}]);