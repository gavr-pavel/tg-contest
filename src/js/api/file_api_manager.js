import {getDeferred} from '../utils';
import {ApiConnection} from '../mtproto/api_connection';
import {MessagesApiManager} from './messages_api_manager';

const PART_SIZE = 512 * 1024;
const MAX_CONNECTIONS = 2;

const FileApiManager = new class {
  files = new Map();

  queue = [];

  inProgress = 0;

  connections = new Map();

  getBlobUrl(blob) {
    return URL.createObjectURL(blob);
  }

  checkQueue(priority) {
    if (this.inProgress++ < MAX_CONNECTIONS) {
      return Promise.resolve();
    }
    const index = this.queue.findIndex((item) => item.priority < priority);
    const deferred = getDeferred();
    this.queue.splice(index, 0, {priority, deferred});
    return deferred.promise;
  }

  queueDone() {
    this.inProgress--;
    const next = this.queue.shift();
    if (next) {
      next.deferred.resolve();
    }
  }

  getConnection(dcId) {
    let connection;
    if (this.connections.has(dcId)) {
      const obj = this.connections.get(dcId);
      connection = obj.connection;
      obj.processCount++;
    } else {
      connection = new ApiConnection({dcId, upload: true});
      this.connections.set(dcId, {connection, processCount: 1});
    }
    return connection;
  }

  connectionDone(connection) {
    const dcId = connection.getDcId();
    const obj = this.connections.get(dcId);
    if (!obj || !--obj.processCount) {
      this.connections.delete(dcId);
      connection.destroy();
    }
  }

  async loadFile(location, dcId, {priority = 1, cache = false, mimeType = '', size = 0, onProgress, signal} = {}) {
    if (cache) {
      try {
        const blob = await this.getFromCache(location);
        if (blob) {
          return FileApiManager.getBlobUrl(blob);
        }
      } catch (e) {
        console.warn(e);
      }
    }

    const parts = [];

    const apiConnection = this.getConnection(dcId);

    let aborted = false;
    if (signal) {
      signal.addEventListener('abort', () => aborted = true);
    }

    try {
      await this.checkQueue(priority);
      for (let offset = 0, loaded = 0; ; offset += PART_SIZE) {
        const res = await apiConnection.callMethod('upload.getFile', {
          location,
          offset,
          limit: PART_SIZE
        });
        if (aborted) {
          throw new Error('File download aborted');
        }
        parts.push(res.bytes);
        loaded += res.bytes.byteLength;
        if (onProgress) {
          onProgress(loaded);
        }
        if (!mimeType) {
          mimeType = this.getMimeType(res.type);
        }
        if (size && loaded >= size || !size && res.bytes.byteLength < PART_SIZE) {
          break;
        }
      }
    } finally {
      this.queueDone();
      this.connectionDone(apiConnection);
    }

    const blob = new Blob(parts, {type: mimeType});

    if (cache) {
      try {
        this.saveToCache(location, blob);
      } catch (e) {
        console.warn(e);
      }
    }

    return FileApiManager.getBlobUrl(blob);
  }

  getMimeType(storageFileType) {
    switch (storageFileType._) {
      case 'storage.fileJpeg':
        return 'image/jpeg';
      case 'storage.fileGif':
        return 'image/gif';
      case 'storage.filePng':
        return 'image/png';
      case 'storage.filePdf':
        return 'application/pdf';
      case 'storage.fileMp3':
        return 'audio/mpeg';
      case 'storage.fileMov':
        return 'video/quicktime';
      case 'storage.fileMp4':
        return 'video/mp4';
      case 'storage.fileWebp':
        return 'image/webp';
      default:
        return '';
    }
  }

  async getFromCache(location) {
    const db = await this.openDb();
    const request = db.transaction(['files'], 'readonly')
        .objectStore('files')
        .get(this.getDbFileName(location));

    return this.getDbRequestPromise(request);
  }

  async saveToCache(location, blob) {
    const db = await this.openDb();
    const request = db.transaction(['files'], 'readwrite')
        .objectStore('files')
        .put(blob, this.getDbFileName(location));
    return this.getDbRequestPromise(request);
  }

  openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('telegram_cache', 1);
      request.onerror = (event) => {
        reject();
      };
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('files');
        resolve(this.openDb());
      };
    });
  }

  getDbFileName(location) {
    return location._ + (location.id || location.volume_id + location.local_id);
  }

  getDbRequestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onerror = reject;
      request.onsuccess = (event) => {
        resolve(event.target.result);
      }
    });
  }

  loadPeerPhoto(peer, photo, big, dcId, options) {
    const location = {
      _: 'inputPeerPhotoFileLocation',
      peer: MessagesApiManager.getInputPeer(peer),
      volume_id: photo.volume_id,
      local_id: photo.local_id,
    };

    if (big) {
      location.big = true;
      location.flags = 1;
    }

    return this.loadFile(location, dcId, options);
  }

  loadMessagePhoto(photo, sizeType, options = {}) {
    const location = {
      _: 'inputPhotoFileLocation',
      id: photo.id,
      access_hash: photo.access_hash,
      file_reference: photo.file_reference,
      thumb_size: sizeType
    };
    return this.loadFile(location, photo.dc_id, options);
  }

  loadMessageDocumentThumb(document, size, options = {}) {
    const location = {
      _: 'inputDocumentFileLocation',
      id: document.id,
      access_hash: document.access_hash,
      file_reference: document.file_reference,
      thumb_size: size
    };
    return this.loadFile(location, document.dc_id, options);
  }

  loadMessageDocument(document, options = {}) {
    const location = {
      _: 'inputDocumentFileLocation',
      id: document.id,
      access_hash: document.access_hash,
      file_reference: document.file_reference
    };
    Object.assign(options, {mimeType: document.mime_type, size: document.size});
    return this.loadFile(location, document.dc_id, options);
  }
};

window.FileApiManager = FileApiManager;

export {FileApiManager};
