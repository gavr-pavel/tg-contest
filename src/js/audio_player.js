import {loadScript} from './utils';

class AudioPlayer {
  listeners = [];

  constructor(doc, src) {
    this.doc = doc;

    const audio = document.createElement('audio');
    if (doc.mime_type !== 'audio/ogg' || audio.canPlayType('audio/ogg')) {
      this.audio = audio;
      audio.src = src;
    } else {
      this.audioPromise = this.initOGVPlayer(doc, src);
    }
  }

  async initOGVPlayer(doc, src, onStateChange) {
    if (!window.OGVPlayer) {
      await loadScript('./vendor/ogvjs/ogv.js');
    }
    const {OGVPlayer, OGVLoader} = window;
    OGVLoader.base = 'vendor/ogvjs';
    const player = new OGVPlayer();
    player.type = doc.mime_type;
    player.src = src;
    console.log('playing audio with ogv.js', player, doc);
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

// (function () {
//   let isWebAudioUnlocked = false;
//   let isHTMLAudioUnlocked = false;
//
//   if (navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i)) {
//     window.addEventListener('mousedown', unlock);
//   }
//
//   function unlock() {
//     if (isWebAudioUnlocked && isHTMLAudioUnlocked) return;
//
//     // Unlock WebAudio - create short silent buffer and play it
//     // This will allow us to play web audio at any time in the app
//     const myContext = new (window.AudioContext || window.webkitAudioContext)();
//     const buffer = myContext.createBuffer(1, 1, 22050); // 1/10th of a second of silence
//     const source = myContext.createBufferSource();
//     source.buffer = buffer;
//     source.connect(myContext.destination);
//     source.onended = () => {
//       console.log('WebAudio unlocked!');
//       isWebAudioUnlocked = true;
//       if (isWebAudioUnlocked && isHTMLAudioUnlocked) {
//         console.log('WebAudio unlocked and playable w/ mute toggled on!');
//         window.removeEventListener('mousedown', unlock);
//       }
//     };
//     source.start();
//
//     // Unlock HTML5 Audio - load a data url of short silence and play it
//     // This will allow us to play web audio when the mute toggle is on
//     const tag = document.createElement('audio');
//     tag.controls = false;
//     tag.preload = 'auto';
//     tag.loop = false;
//     tag.src = 'data:audio/mp3;base64,//MkxAAHiAICWABElBeKPL/RANb2w+yiT1g/gTok//lP/W/l3h8QO/OCdCqCW2Cw//MkxAQHkAIWUAhEmAQXWUOFW2dxPu//9mr60ElY5sseQ+xxesmHKtZr7bsqqX2L//MkxAgFwAYiQAhEAC2hq22d3///9FTV6tA36JdgBJoOGgc+7qvqej5Zu7/7uI9l//MkxBQHAAYi8AhEAO193vt9KGOq+6qcT7hhfN5FTInmwk8RkqKImTM55pRQHQSq//MkxBsGkgoIAABHhTACIJLf99nVI///yuW1uBqWfEu7CgNPWGpUadBmZ////4sL//MkxCMHMAH9iABEmAsKioqKigsLCwtVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVV//MkxCkECAUYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
//     tag.onended = () => {
//       console.log('HTMLAudio unlocked!');
//       isHTMLAudioUnlocked = true;
//       if (isWebAudioUnlocked && isHTMLAudioUnlocked) {
//         console.log('WebAudio unlocked and playable w/ mute toggled on!');
//         window.removeEventListener('mousedown', unlock);
//       }
//     };
//     const p = tag.play();
//     if (p) {
//       p.then(() => console.log('play success'), (reason) => console.log('play failed', reason));
//     }
//   }
// })();

export {AudioPlayer};