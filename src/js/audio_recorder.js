import {getDeferred} from './utils';

class AudioRecorder {
  mimeType = 'audio/webm;codecs=opus';

  isSupported() {
    return window.MediaRecorder && MediaRecorder.isTypeSupported(this.mimeType);
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    this.mediaRecorder = new MediaRecorder(stream, {mimeType: this.mimeType});

    this.deferred = getDeferred();

    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      this.deferred.resolve(event.data);
    }, {once: true});

    this.mediaRecorder.start();
  }

  stop() {
    this.mediaRecorder.stop();
    return this.deferred.promise;
  }
}

window.AudioRecorder = AudioRecorder;

export {AudioRecorder};
