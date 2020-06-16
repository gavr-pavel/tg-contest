(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{38:function(e,t,s){"use strict";s.r(t);var i=s(0),a=s(16);function n(e,t,s){return t in e?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s,e}const r=262144,o=1048576;window.audioStreamingResources=new WeakSet;class d{constructor(e){n(this,"bufferQueue",[]),n(this,"ended",!1),n(this,"stopped",!1),n(this,"onUpdateEnd",()=>{const e=this.bufferQueue.shift();e?this.appendBuffer(e):this.ended&&this.mediaSource.endOfStream()}),n(this,"onTimeUpdate",()=>{this.resumeLoader&&this.checkLowBuffer()&&this.resumeLoader()}),this.doc=e;const t=new MediaSource;t.addEventListener("sourceopen",()=>{this.stopped||(this.sourceBuffer=t.addSourceBuffer("audio/mpeg"),this.sourceBuffer.addEventListener("updateend",this.onUpdateEnd))}),this.mediaSource=t;const s=document.createElement("audio");s.addEventListener("timeupdate",this.onTimeUpdate),s.src=URL.createObjectURL(this.mediaSource),this.audio=s,this.load()}load(){const e=new u({onSegmentReady:e=>{this.appendBuffer(e)},onDurationChange:e=>{this.mediaSource.duration=e}}),t=async(s,i)=>{if(this.stopped)return;if(s>=this.doc.size)return void this.endStream();const n=i<5?r:o,d=await a.a.loadDocumentBytes(this.doc,s,n);e.append(d);const u=s+d.length;this.checkLowBuffer()?t(u,i+1):this.resumeLoader=()=>{t(u,i+1),this.resumeLoader=null}};t(0,0)}checkLowBuffer(){const e=this.audio,t=e.buffered;return!t.length||t.end(0)<e.currentTime+180}appendBuffer(e){if(!this.stopped)if(this.sourceBuffer.updating)this.bufferQueue.push(e);else try{this.sourceBuffer.appendBuffer(e)}catch(t){if("QuotaExceededError"!==t.name)throw t;this.bufferQueue.unshift(e);const s=this.audio.buffered.start(0);this.sourceBuffer.remove(s,s+30)}}endStream(){this.ended=!0,this.sourceBuffer.updating||this.bufferQueue.length||this.mediaSource.endOfStream()}stop(){this.stopped=!0,this.audio.src="",this.audio.load()}}class u{constructor({onSegmentReady:e,onDurationChange:t}){n(this,"ID3_HEADER_SIZE",10),n(this,"FRAME_HEADER_SIZE",4),n(this,"XING_HEADER_OFFSET",32),n(this,"haveMeta",!1),this.onSegmentReady=e,this.onDurationChange=t}append(e){if(this.prevBytes){const t=this.prevBytes,s=e;(e=new Uint8Array(t.length+s.length)).set(t),e.set(s,t.length),this.prevBytes=null}let t=0;for(;t<e.length;){const s=this.parseFrame(e,t);if(!s)break;t=s}if(this.prevBytes=e.slice(t),t){const s=e.slice(0,t);this.onSegmentReady(s)}}parseFrame(e,t){let s=t;const i=!this.haveMeta;if(i){if(s=this.ID3_HEADER_SIZE+this.getID3Size(e.subarray(6,10)),e.length<s)return 0;this.haveMeta=!0}if(e.length-s<4)return 0;const a=e.subarray(s,s+this.FRAME_HEADER_SIZE);if(255!=(255&a[0])&&15!=(15&a[1]))return console.log("end of mp3"),0;const n=(24&a[1])>>>3,r=(6&a[1])>>>1,o=(240&a[2])>>>4,d=(12&a[2])>>>2,u=(2&a[2])>>>1,h=c.bitrate[n][r][o],l=c.samplerate[n][d],m=Math.floor(1e3*h/l*144)+(u?c.slot[r]:0);if(i){const t=s+this.FRAME_HEADER_SIZE+this.XING_HEADER_OFFSET,i=e.slice(t,t+16),a=(new TextDecoder).decode(i.slice(0,4));if("Info"===a||"Xing"===a){const e=new DataView(i.buffer);if(1&e.getInt32(4)){const t=e.getInt32(8)*c.samplePerFrame[n][r]/l;this.onDurationChange&&this.onDurationChange(t)}}}return e.length-s<m?0:s+m}getID3Size(e){return(127&e[0])<<21|(127&e[1])<<14|(127&e[2])<<7|127&e[3]}}const c={frame:{0:"MPEG 2.5",1:"Reserved",2:"MPEG 2",3:"MPEG 1"},layer:{0:"reserved",1:"Layer III",2:"Layer II",3:"Layer I"},bitrate:{3:{1:[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,-1],2:[0,32,48,56,64,80,96,112,128,160,192,224,256,320,384,-1],3:[0,32,64,96,128,160,192,224,256,288,320,352,384,416,488,-1]},2:{3:[0,32,48,56,64,80,96,112,128,144,160,176,192,224,256,-1],2:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,-1],1:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,-1]},0:{3:[0,32,48,56,64,80,96,112,128,144,160,176,192,224,256,-1],2:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,-1],1:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,-1]}},samplerate:{3:[44100,48e3,32e3,-1],2:[22050,24e3,16e3,-1],0:[11025,12e3,8e3]},channel:["Stereo","Joint Stereo","Dual Channel","Single Channel"],slot:{3:4,2:1,1:1},samplePerFrame:{3:{3:384,2:1152,1:1152},2:{3:384,2:1152,1:576},0:{3:384,2:1152,1:576}}};var h=s(1);s.d(t,"AudioPlayer",(function(){return l}));class l{constructor(e,t){var s,i,a;a=[],(i="listeners")in(s=this)?Object.defineProperty(s,i,{value:a,enumerable:!0,configurable:!0,writable:!0}):s[i]=a,this.doc=e,this.attributes=t}initStreaming(){this.streamingProcess=new d(this.doc),this.audio=this.streamingProcess.audio}initSrc(e){const t=document.createElement("audio");"audio/ogg"!==this.doc.mime_type||t.canPlayType("audio/ogg")?(this.audio=t,t.src=e):this.audioPromise=this.initOGVPlayer(this.doc,e)}async initOGVPlayer(e,t){window.OGVPlayer||await Object(i.D)("./vendor/ogvjs/ogv.js");const{OGVPlayer:s,OGVLoader:a}=window;a.base="vendor/ogvjs";const n=new s;return n.type=this.doc.mime_type,n.src=t,console.log("playing audio with ogv.js",n,this.doc),this.audio=n,n}async listen(e,t){if("stop"!==e){(await this.getAudio()).addEventListener(e,t)}this.listeners.push([e,t])}getAudio(){return this.audio?Promise.resolve(this.audio):this.audioPromise}async play(){(await this.getAudio()).play()}async pause(){(await this.getAudio()).pause()}isPaused(){return!!this.audio&&this.audio.paused}async togglePlay(){const e=await this.getAudio();e.paused?e.play():e.pause()}getDuration(){const e=this.audio;return e&&isFinite(e.duration)?e.duration:this.attributes.duration}getCurrentTime(){return this.audio?this.audio.currentTime:0}async seek(e){(await this.getAudio()).currentTime=e}async destroy(){const e=await this.getAudio();e.pause();for(const[t,s]of this.listeners)if("stop"===t)try{s()}catch(e){console.error(e)}else e.removeEventListener(t,s);this.audio=null,this.streamingProcess&&(this.streamingProcess.stop(),this.streamingProcess=null),this.listeners=[]}initMessageAudioPlayer(e){this.listen("play",t=>{e.classList.add("document_icon-playing"),r(t.target)}),this.listen("pause",()=>{e.classList.remove("document_icon-playing"),o()}),this.listen("timeupdate",e=>{const t=e.target;n(t.currentTime,this.getDuration())}),this.listen("ended",()=>{a(0),n(0,this.getDuration())}),this.listen("stop",()=>{s.innerText=Object(i.t)(this.getDuration()),e.classList.remove("document_icon-playing"),o(),a(0)});const t=e.closest(".document"),s=Object(i.a)(".document_duration",t);let a,n;if("voice"===this.attributes.type){const e=Object(i.a)(".document_voice_wave-filled",t);a=t=>{e.style.width=100*t+"%"},n=(e,t)=>{s.innerText=Object(i.t)(t-e)}}else this.initAudioProgressBar(t),a=e=>{},n=(e,t)=>{s.innerText=`${Object(i.t)(e)} / ${Object(i.t)(t)}`};const[r,o]=Object(i.A)(e=>{a(e.currentTime/this.getDuration())});e.classList.toggle("document_icon-playing",!this.isPaused()),n(this.getCurrentTime(),this.getDuration()),a(this.getCurrentTime()/this.getDuration())}initAudioProgressBar(e){const t=i.e.html`
      <div class="document_progressbar">
        <div class="document_progressbar_loaded"></div>
        <div class="document_progressbar_played"></div>
      </div>
    `.buildElement();Object(i.a)(".document_filename",e).after(t);const s=t.firstElementChild,a=t.lastElementChild;let n=!1;t.addEventListener("mousedown",e=>{let s;e.preventDefault(),n=!0,t.classList.add("document_progressbar-dragging");const r=e=>{const{pageX:n}=Object(i.x)(e),r=t.getBoundingClientRect();s=Math.max(0,Math.min(1,(n-r.x)/r.width)),a.style.setProperty("--progress-value",s)},o=e=>{window.document.removeEventListener("mousemove",r),window.document.removeEventListener("mouseup",o),this.seek(s*this.getDuration()),n=!1,t.classList.remove("document_progressbar-dragging")};window.document.addEventListener("mousemove",r),window.document.addEventListener("mouseup",o),r(e)});const r=e=>{const t=this.getDuration(),i=e.buffered;if(i.length){const e=Math.max(0,Math.min(1,i.end(i.length-1)/t));s.style.setProperty("--progress-value",e)}},o=()=>{if(!n){const e=Math.max(0,Math.min(1,this.getCurrentTime()/this.getDuration()));a.style.setProperty("--progress-value",e)}};this.listen("progress",e=>r(e.target)),this.listen("timeupdate",()=>o()),this.listen("stop",()=>{t.remove()}),this.audio&&(r(this.audio),o())}initHeaderAudioPlayer(e){const t=Object(i.a)(".messages_header_audio_wrap",this.header);let s;if(t.innerHTML="","voice"===this.attributes.type){const t=h.a.getPeerName(h.a.getMessageAuthorPeer(e),!1);s=i.e.html`
        <div class="messages_header_audio mdc-ripple-surface">
          <div class="messages_header_audio_voice_author">${t}</div>
          <div class="messages_header_audio_voice_type">Voice Message</div>
        </div>
      `.buildElement()}else{const e=this.attributes,t=e.audio_title||e.file_name||"Unknown Track",a=e.audio_performer;s=i.e.html`
        <div class="messages_header_audio mdc-ripple-surface">
          <div class="messages_header_audio_title">${t}</div>
          <div class="messages_header_audio_performer">${a}</div>
        </div>
      `.buildElement()}return Object(i.g)(s),t.appendChild(s),this.listen("play",()=>{s.classList.add("messages_header_audio-playing")}),this.listen("pause",()=>{s.classList.remove("messages_header_audio-playing")}),this.listen("stop",()=>{s.remove()}),s.addEventListener("click",()=>{this.togglePlay()}),s}}}}]);