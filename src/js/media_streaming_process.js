import {FileApiManager} from './api/file_api_manager';
import {MP4Box} from './vendor/mp4box';

const PART_SIZE = 256 * 1024;

class MediaStreamingProcess {
  constructor(doc, onProgress) {
    this.doc = doc;
    this.onProgress = onProgress;
    this.mediaSource = new MediaSource();
    this.video = document.createElement('video');
    this.video.src = URL.createObjectURL(this.mediaSource);
  }

  load() {
    this.mp4box = new MP4Box(false);
    this.mp4box.onReady = (info) => {
      console.log('Received File Information', info);
      if (info.isFragmented) {
        this.mediaSource.duration = info.fragment_duration / info.timescale;
      } else {
        this.mediaSource.duration = info.duration / info.timescale;
      }
      this.mp4box.onSegment = (id, user, buffer) => {
        this.appendSegmentBuffer(user, buffer);
      };
      this.addSourceBuffers(info);
      this.mp4box.start();
    };
    this.mp4box.onError = (e) => {
      console.log('Received Error Message', e);
    };

    window.mp4box = this.mp4box;

    this.loadPart(0);

    return new Promise((resolve, reject) => {
      this.video.addEventListener('loadeddata', (event) => {
        this.loadeddata = true;
        resolve(event.target);
      });
      this.video.addEventListener('error', (event) => {
        reject(event.target.error);
      });
    });
  }

  async loadPart(offset) {
    // console.log('loadPart', offset);
    const bytes = await FileApiManager.loadDocumentBytes(this.doc, offset, PART_SIZE);
    // console.log('loaded bytes:', bytes.byteLength);
    const buf = bytes.buffer;
    buf.fileStart = offset;
    const nextStart = this.mp4box.appendBuffer(buf);
    // console.log('nextStart', nextStart);
    if (nextStart) {
      // if (nextStart > offset + buf.byteLength) {
      //   this.gapStart = [offset + buf.byteLength, nextStart];
      //   console.log('gap', this.gap);
      // }
      this.loadPart(nextStart);
    } else if (this.gapStart) {
      const start = this.gapStart;
      this.gapStart = null;
      this.loadPart(start);
    } else {
      this.mp4box.flush();
      this.mediaSource.endOfStream();
    }
    if (!this.loadeddata) {
      this.loadedBytes = (this.loadedBytes || 0) + buf.byteLength;
      this.onProgress(this.loadedBytes);
    }
  }

  addSourceBuffers(info) {
    for (const track of info.tracks) {
      const codec = track.codec;
      const mime = `video/mp4; codecs="${codec}"`;
      const sourceBuffer = this.mediaSource.addSourceBuffer(mime);
      sourceBuffer.pendingSegments = [];
      sourceBuffer.addEventListener('updateend', this.onSourceBufferUpdateEnd);
      this.mp4box.setSegmentOptions(track.id, sourceBuffer, {nbSamples: 200});
    }

    for (const {user, buffer} of  this.mp4box.initializeSegmentation()) {
      this.appendSegmentBuffer(user, buffer);
    }
  }

  appendSegmentBuffer(sourceBuffer, buffer) {
    // console.log('appendSegmentBuffer', sourceBuffer, sourceBuffer.updating);
    if (sourceBuffer.updating) {
      sourceBuffer.pendingSegments.push(buffer);
    } else {
      sourceBuffer.appendBuffer(buffer);
    }
  }

  onSourceBufferUpdateEnd = (event) => {
    const sourceBuffer = event.target;
    const buffer = sourceBuffer.pendingSegments.shift();
    if (buffer) {
      this.appendSegmentBuffer(sourceBuffer, buffer);
    }
  };

  stop() {
    try {
      this.mp4box.stop();
    } catch (e) {
      console.error(e);
    }

  }

}

export {MediaStreamingProcess};
