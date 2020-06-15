import {FileApiManager} from './api/file_api_manager';

const START_PART_SIZE = 256 * 1024;
const LARGE_PART_SIZE = 1024 * 1024;

class AudioStreamingProcess {
  bufferQueue = [];
  ended = false;

  constructor(doc) {
    this.doc = doc;
    const ms = new MediaSource();
    ms.addEventListener('sourceopen', () => {
      this.sourceBuffer = ms.addSourceBuffer('audio/mpeg');
      this.sourceBuffer.addEventListener('updateend', this.onUpdateEnd);
    });
    this.ms = ms;

    const audio = document.createElement('audio');
    audio.addEventListener('timeupdate', this.onTimeUpdate);
    audio.src = URL.createObjectURL(this.ms);
    this.audio = audio;

    this.load();
  }

  load() {
    const reader = new Mp3Reader({
      onSegmentReady: (bytes) => {
        // console.log('appending bytes', bytes);
        this.appendBuffer(bytes);
      },
      onDurationChange: (duration) => {
        this.ms.duration = duration;
      },
    });

    const loadPart = async (offset, index) => {
      if (offset >= this.doc.size) {
        // console.log(`endStream`);
        this.endStream();
        return;
      }
      const limit = index < 5 ? START_PART_SIZE : LARGE_PART_SIZE;
      const bytes = await FileApiManager.loadDocumentBytes(this.doc, offset, limit);
      reader.append(bytes);
      const nextOffset = offset + bytes.length;
      if (this.checkLowBuffer()) {
        loadPart(nextOffset, index + 1);
      } else {
        this.resumeLoader = () => {
          loadPart(nextOffset, index + 1);
          this.resumeLoader = null;
        };
      }
    };
    loadPart(0, 0);
  }

  checkLowBuffer() {
    const audio = this.audio;
    const buffered = audio.buffered;
    return !buffered.length || buffered.end(0) < audio.currentTime + 3 * 60;
  }

  appendBuffer(buffer) {
    if (this.sourceBuffer.updating) {
      this.bufferQueue.push(buffer);
      return;
    }
    try {
      this.sourceBuffer.appendBuffer(buffer);
    } catch (e) {
      if (e.name !== 'QuotaExceededError') { // https://developers.google.com/web/updates/2017/10/quotaexceedederror
        throw e;
      }
      this.bufferQueue.unshift(buffer);
      const buffered = this.audio.buffered;
      const bufferedStart = buffered.start(0);
      this.sourceBuffer.remove(bufferedStart, bufferedStart + 30);
    }
  }

  onUpdateEnd = () => {
    const buffer = this.bufferQueue.shift();
    if (buffer) {
      this.appendBuffer(buffer);
    } else if (this.ended) {
      this.ms.endOfStream();
    }
  };

  endStream() {
    this.ended = true;
    if (!this.sourceBuffer.updating && !this.bufferQueue.length) {
      this.ms.endOfStream();
    }
  }

  onTimeUpdate = () => {
    if (this.resumeLoader && this.checkLowBuffer()) {
      this.resumeLoader();
    }
  };
}

class Mp3Reader {
  ID3_HEADER_SIZE = 10;
  FRAME_HEADER_SIZE = 4;
  XING_HEADER_OFFSET = 32;

  haveMeta = false;

  constructor({onSegmentReady, onDurationChange}) {
    this.onSegmentReady = onSegmentReady;
    this.onDurationChange = onDurationChange;
  }

  append(bytes) {
    if (this.prevBytes) {
      const prevBytes = this.prevBytes;
      const newBytes = bytes;
      bytes = new Uint8Array(prevBytes.length + newBytes.length);
      bytes.set(prevBytes);
      bytes.set(newBytes, prevBytes.length);
      this.prevBytes = null;
    }

    let offset = 0;
    while (offset < bytes.length) {
      const nextOffset = this.parseFrame(bytes, offset);
      if (!nextOffset) {
        break;
      }
      offset = nextOffset;
    }
    this.prevBytes = bytes.slice(offset);
    if (offset) {
      const seg = bytes.slice(0, offset);
      this.onSegmentReady(seg);
    }
  }

  parseFrame(bytes, frameOffset) {
    let offset = frameOffset;

    const isFirstFrame = !this.haveMeta;
    if (isFirstFrame) {
      offset = this.ID3_HEADER_SIZE + this.getID3Size(bytes.subarray(6, 10));
      if (bytes.length < offset) {
        return 0;
      }
      this.haveMeta = true;
    }

    if (bytes.length - offset < 4) {
      return 0;
    }

    const header = bytes.subarray(offset, offset + this.FRAME_HEADER_SIZE);

    if ((header[0] & 0xff) !== 0xff && (header[1] & 0xf0 >>> 4) !== 0xf) {
      console.log('end of mp3');
      return 0; /* End of mp3 */
    }

    const verIdx        = (header[1] & 0x18) >>> 3;
    const layerIdx      = (header[1] & 0x6)  >>> 1;
    const bitrateIdx    = (header[2] & 0xF0) >>> 4;
    const samplerateIdx = (header[2] & 0xC)  >>> 2;
    const paddingIdx    = (header[2] & 0x2)  >>> 1;

    const bitrate = MP3Config.bitrate[verIdx][layerIdx][bitrateIdx];
    const samplerate = MP3Config.samplerate[verIdx][samplerateIdx];

    const frameSize = Math.floor(144 * (bitrate * 1000 / samplerate)) + (paddingIdx ? MP3Config.slot[layerIdx]: 0);

    // console.log('frame', {header, frameSize});

    if (isFirstFrame) {
      const xingOffset = offset + this.FRAME_HEADER_SIZE + this.XING_HEADER_OFFSET;
      const xingHeader = bytes.slice(xingOffset, xingOffset + 16);
      const mode = new TextDecoder().decode(xingHeader.slice(0, 4));
      // console.log('mode', mode);
      if (mode === 'Info' || mode === 'Xing') {
        const dw = new DataView(xingHeader.buffer);
        const flags = dw.getInt32(4);
        if (flags & 0x1) {
          const framesCount = dw.getInt32(8);
          const samplePerFrame =  MP3Config.samplePerFrame[verIdx][layerIdx];
          const duration = framesCount * samplePerFrame / samplerate;
          this.onDurationChange && this.onDurationChange(duration);
        }
      }
    }

    if (bytes.length - offset < frameSize) {
      return 0;
    }

    return offset + frameSize;
  }

  getID3Size(bytes) {
    return ((bytes[0] & 0x7F) << 21) | ((bytes[1] & 0x7F) << 14) | ((bytes[2] & 0x7F) << 7) | (bytes[3] & 0x7F);
  }

}

const MP3Config = {
  frame: {
    0: 'MPEG 2.5',
    1: 'Reserved',
    2: 'MPEG 2',
    3: 'MPEG 1'
  },
  layer: {
    0: 'reserved',
    1: 'Layer III',
    2: 'Layer II',
    3: 'Layer I'
  },
  bitrate: {
    /* Defines in Mpeg version  */
    /* Mpeg 1 */
    3: {
      /* defines the mpeg layer in the version */
      /* Layer 3 */
      1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1],
      /* Layer 2 */
      2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, -1],
      /* Layer 1 */
      3: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 488, -1]
    },
    /* Mpeg version 2 */
    2: {
      /* Layer 1 */
      3: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, -1],
      /* Layer 2 */
      2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
      /* Layer 3 */
      1: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1]
    },
    /* Mpeg version 2.5 */
    0: {
      /* Layer 1 */
      3: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, -1],
      /* Layer 2 */
      2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
      /* Layer 3 */
      1: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1]
    }
  },
  samplerate: {
    3: [44100, 48000, 32000, -1], /* Mpeg 1 */
    2: [22050, 24000, 16000, -1], /* Mpeg 2 */
    0: [11025, 12000, 8000] /* Mpeg 2.5 */
  },
  channel: [
    'Stereo',
    'Joint Stereo',
    'Dual Channel',
    'Single Channel'
  ],
  slot: {3:4, 2:1, 1:1},
  samplePerFrame: {
    3: {3:384, 2:1152, 1:1152},
    2: {3:384, 2:1152, 1:576},
    0: {3:384, 2:1152, 1:576}
  }
};

export {AudioStreamingProcess}