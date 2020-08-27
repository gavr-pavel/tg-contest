import {$, attachRipple, formatDuration, getEventPageXY, initAnimation, loadScript, Tpl} from './utils';
import {AudioStreamingProcess} from './audio_streaming_process';
import {MessagesApiManager} from './api/messages_api_manager';

class AudioPlayer {
  listeners = [];

  constructor(doc, attributes) {
    this.doc = doc;
    this.attributes = attributes;
  }

  initStreaming() {
    this.streamingProcess = new AudioStreamingProcess(this.doc);
    this.audio = this.streamingProcess.audio;
  }

  initSrc(src) {
    const audio = document.createElement('audio');
    if (this.doc.mime_type !== 'audio/ogg' || audio.canPlayType('audio/ogg')) {
      this.audio = audio;
      audio.src = src;
    } else {
      this.audioPromise = this.initOGVPlayer(this.doc, src);
    }
  }

  async initOGVPlayer(doc, src) {
    if (!window.OGVPlayer) {
      await loadScript('./vendor/ogvjs/ogv.js');
    }
    const {OGVPlayer, OGVLoader} = window;
    OGVLoader.base = 'vendor/ogvjs';
    const player = new OGVPlayer();
    player.type = this.doc.mime_type;
    player.src = src;
    console.log('playing audio with ogv.js', player, this.doc);
    this.audio = player;
    return player;
  }

  async listen(eventType, listener) {
    if (eventType !== 'stop') {
      const audio = await this.getAudio();
      audio.addEventListener(eventType, listener);
    }
    this.listeners.push([eventType, listener]);
  }

  getAudio() {
    return this.audio ? Promise.resolve(this.audio) : this.audioPromise;
  }

  async play() {
    const audio = await this.getAudio();
    audio.play();
  }

  async pause() {
    const audio = await this.getAudio();
    audio.pause();
  }

  isPaused() {
    return !!this.audio && this.audio.paused;
  }

  async togglePlay() {
    const audio = await this.getAudio();
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  getDuration() {
    const audio = this.audio;
    return audio && isFinite(audio.duration) ? audio.duration : this.attributes.duration;
  }

  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  async seek(time) {
    const audio = await this.getAudio();
    audio.currentTime = time;
  }

  async destroy() {
    const audio = await this.getAudio();
    audio.pause();
    for (const [eventType, listener] of this.listeners) {
      if (eventType === 'stop') {
        try {
          listener();
        } catch (e) {
          console.error(e);
        }
      } else {
        audio.removeEventListener(eventType, listener);
      }
    }
    this.audio = null;
    if (this.streamingProcess) {
      this.streamingProcess.stop();
      this.streamingProcess = null;
    }
    this.listeners = [];
  }

  initMessageAudioPlayer(btn) {
    this.listen('play', (event) => {
      btn.classList.add('document_icon-playing');
      startProgressAnimation(event.target);
    });
    this.listen('pause', () => {
      btn.classList.remove('document_icon-playing');
      stopProgressAnimation();
    });
    this.listen('timeupdate', (event) => {
      const audio = event.target;
      updateCurrentTime(audio.currentTime, this.getDuration());
    });
    this.listen('ended', () => {
      updateProgress(0);
      updateCurrentTime(0, this.getDuration());
    });
    this.listen('stop', () => {
      durationEl.innerText = formatDuration(this.getDuration());
      btn.classList.remove('document_icon-playing');
      stopProgressAnimation();
      updateProgress(0);
    });

    const documentWrapEl = btn.closest('.document');
    const durationEl = $('.document_duration', documentWrapEl);

    let updateProgress;
    let updateCurrentTime;
    if (this.attributes.type === 'voice') {
      const filledWaveEl = $('.document_voice_wave-filled', documentWrapEl);
      updateProgress = (progress) => {
        if (filledWaveEl) {
          filledWaveEl.style.width = (progress * 100) + '%';
        }
      };
      updateCurrentTime = (currentTime, duration) => {
        durationEl.innerText = formatDuration(duration - currentTime);
      };
    } else {
      this.initAudioProgressBar(documentWrapEl);
      updateProgress = (progress) => {
        // todo
      };
      updateCurrentTime = (currentTime, duration) => {
        durationEl.innerText = `${formatDuration(currentTime)} / ${formatDuration(duration)}`;
      };
    }

    const [startProgressAnimation, stopProgressAnimation] = initAnimation((audio) => {
      updateProgress(audio.currentTime / this.getDuration());
    });

    btn.classList.toggle('document_icon-playing', !this.isPaused());
    updateCurrentTime(this.getCurrentTime(), this.getDuration());
    updateProgress(this.getCurrentTime() / this.getDuration());
  }

  initAudioProgressBar(documentWrapEl) {
    const progressBarEl = Tpl.html`
      <div class="document_progressbar">
        <div class="document_progressbar_loaded"></div>
        <div class="document_progressbar_played"></div>
      </div>
    `.buildElement();
    $('.document_filename', documentWrapEl).after(progressBarEl);

    const loadedEl = progressBarEl.firstElementChild;
    const playedEl = progressBarEl.lastElementChild;
    let dragging = false;

    progressBarEl.addEventListener('mousedown', (event) => {
      event.preventDefault();
      dragging = true;
      progressBarEl.classList.add('document_progressbar-dragging');
      let value;
      const move = (event) => {
        const {pageX} = getEventPageXY(event);
        const rect = progressBarEl.getBoundingClientRect();
        value = Math.max(0, Math.min(1, (pageX - rect.x) / rect.width));
        playedEl.style.setProperty('--progress-value', value);
      };
      const end = (event) => {
        window.document.removeEventListener('mousemove', move);
        window.document.removeEventListener('mouseup', end);
        this.seek(value * this.getDuration());
        dragging = false;
        progressBarEl.classList.remove('document_progressbar-dragging');
      };
      window.document.addEventListener('mousemove', move);
      window.document.addEventListener('mouseup', end);
      move(event);
    });

    const updateLoaded = (audio) => {
      const duration = this.getDuration();
      const buffered = audio.buffered;
      if (buffered.length) {
        const value = Math.max(0, Math.min(1, buffered.end(buffered.length - 1) / duration));
        loadedEl.style.setProperty('--progress-value', value);
      }
    };

    const updatePlayed = () => {
      if (!dragging) {
        const value = Math.max(0, Math.min(1, this.getCurrentTime() / this.getDuration()));
        playedEl.style.setProperty('--progress-value', value);
      }
    };

    this.listen('progress', (event) => updateLoaded(event.target));
    this.listen('timeupdate', () => updatePlayed());
    this.listen('stop', () => {
      progressBarEl.remove();
    });

    if (this.audio) {
      updateLoaded(this.audio);
      updatePlayed();
    }
  }

  initHeaderAudioPlayer(message) {
    const container = $('.messages_header_audio_wrap', this.header);
    container.innerHTML = '';

    let el;
    let titleEl;
    if (this.attributes.type === 'voice') {
      const author = MessagesApiManager.getPeerName(MessagesApiManager.getMessageAuthorPeer(message), false);
      el = Tpl.html`
        <div class="messages_header_audio mdc-ripple-surface">
          <div class="messages_header_audio_voice_author">${author}</div>
          <div class="messages_header_audio_voice_type">Voice Message</div>
          <div class="mdc-icon-button messages_header_audio_close_button"></div>
        </div>
      `.buildElement();
      titleEl = $('.messages_header_audio_voice_author', el);
    } else {
      const attributes = this.attributes;
      const title = attributes.audio_title || attributes.file_name || 'Unknown Track';
      const performer = attributes.audio_performer;
      el = Tpl.html`
        <div class="messages_header_audio mdc-ripple-surface">
          <div class="messages_header_audio_title">${title}</div>
          <div class="messages_header_audio_performer">${performer}</div>
          <div class="mdc-icon-button messages_header_audio_close_button"></div>
        </div>
      `.buildElement();
      titleEl = $('.messages_header_audio_title', el);
    }
    const closeButton = $('.messages_header_audio_close_button', el);

    attachRipple(el);
    container.appendChild(el);

    this.listen('play', () => {
      el.classList.add('messages_header_audio-playing');
    });
    this.listen('pause', () => {
      el.classList.remove('messages_header_audio-playing');
    });
    this.listen('stop', () => {
      el.remove();
    });
    el.addEventListener('click', () => {
      this.togglePlay();
    });
    titleEl.addEventListener('click', (event) => {
      event.stopPropagation();
      const peerId = MessagesApiManager.getMessageDialogPeerId(message);
      MessagesController.setChatByPeerId(peerId, message.id);
    });
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.destroy();
    });

    return el;
  }
}

export {AudioPlayer};