import {loadScript} from './utils';
import {AudioStreamingProcess} from './audio_streaming_process';

class AudioPlayer {
  listeners = [];

  constructor(doc) {
    this.doc = doc;
  }

  initStreaming() {
    const process = new AudioStreamingProcess(this.doc);
    this.audio = process.audio;
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
    const audio = await this.getAudio();
    audio.addEventListener(eventType, listener);
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

  async togglePlay() {
    const audio = await this.getAudio();
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  async destroy() {
    const audio = await this.getAudio();
    audio.pause();
    for (const {eventType, listener} of this.listeners) {
      audio.removeEventListener(eventType, listener);
    }
    this.audio = null;
    this.listeners = [];
  }
}

export {AudioPlayer};