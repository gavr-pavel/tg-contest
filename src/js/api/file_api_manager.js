import {blobToBuffer, checkWebPSupport, convertWebP, getDeferred, randomLong} from '../utils';
import {ApiConnection} from '../mtproto/api_connection';
import {MessagesApiManager} from './messages_api_manager';

const PART_SIZE = 512 * 1024;
const MAX_CONNECTIONS = 2;

const DEBUG = 0;

const FileApiManager = new class {
  blobUrls = new Map();

  requests = new Map();

  queue = [];

  inProgress = 0;

  connections = new Map();

  getBlobUrl(blob) {
    return URL.createObjectURL(blob);
  }

  queueWait(priority) {
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

  loadFile(location, dcId, options) {
    const dbFileName = this.getDbFileName(location);
    if (this.requests.has(dbFileName)) {
      return this.requests.get(dbFileName);
    }

    const request = this.loadFileRequest(location, dcId, options);
    this.requests.set(dbFileName, request);

    return request.finally(() => {
      this.requests.delete(dbFileName);
    });
  }

  async loadFileRequest(location, dcId, {priority = 1, cache = false, mimeType = '', size = 0, onProgress, signal} = {}) {
    const dbFileName = this.getDbFileName(location);

    if (this.blobUrls.has(dbFileName)) {
      return this.blobUrls.get(dbFileName);
    }

    let blob;

    if (cache) {
      try {
        const start = Date.now();
        blob = await this.getFromCache(dbFileName);
        DEBUG && console.log('[File download]', location, `got cache result in ${(Date.now() - start)} ms`);
      } catch (e) {
        console.warn(e);
      }
    }

    if (!blob) {
      const parts = [];
      const apiConnection = this.getConnection(dcId);
      let aborted = false;
      if (signal) {
        signal.addEventListener('abort', () => aborted = true);
      }
      try {
        const queueStart = Date.now();
        await this.queueWait(priority);
        DEBUG && console.log('[File download]', location, `waited queue for ${(Date.now() - queueStart)}ms`);
        const loadStart = Date.now();
        for (let offset = 0, loaded = 0; ; offset += PART_SIZE) {
          if (aborted) {
            throw new Error('File download aborted');
          }
          const res = await apiConnection.callMethod('upload.getFile', {
            location,
            offset,
            limit: PART_SIZE
          });
          parts.push(new Blob([res.bytes]));
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
        DEBUG && console.log('[File download]', location, `loaded for ${(Date.now() - loadStart)}ms`);
      } finally {
        this.queueDone();
        this.connectionDone(apiConnection);
      }
      blob = new Blob(parts, {type: mimeType});
      if (mimeType === 'image/webp') {
        const isWebPSupported = await checkWebPSupport();
        if (!isWebPSupported) {
          blob = await convertWebP(await blobToBuffer(blob));
        }
      }
      if (cache) {
        try {
          this.saveToCache(dbFileName, blob);
        } catch (e) {
          console.warn(e);
        }
      }
    }

    const url = FileApiManager.getBlobUrl(blob);

    this.blobUrls.set(dbFileName, url);

    return url;
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

  async getFromCache(dbFileName) {
    const db = await this.openDb();
    const request = db.transaction(['files'], 'readonly')
        .objectStore('files')
        .get(dbFileName);

    return this.getDbRequestPromise(request);
  }

  async saveToCache(dbFileName, blob) {
    const db = await this.openDb();
    const request = db.transaction(['files'], 'readwrite')
        .objectStore('files')
        .put(blob, dbFileName);

    return this.getDbRequestPromise(request);
  }

  async openDb() {
    if (this.db) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('telegram_cache', 1);
      request.onerror = (event) => {
        reject(event.target.error);
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('files');
        event.target.transaction.oncomplete = () => {
          this.db = db;
          resolve(this.db);
        };
      };
    });
  }

  getDbFileName(location) {
    return location._ + (location.id || location.volume_id + location.local_id) + (location.thumb_size  || '');
  }

  getDbRequestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onerror = (event) => {
        reject(event.target.error);
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      }
    });
  }

  loadPeerPhoto(peer, photo, big, dcId, options) {
    const photoSize = big ? photo.photo_big : photo.photo_small;
    const location = {
      _: 'inputPeerPhotoFileLocation',
      peer: MessagesApiManager.getInputPeer(peer),
      volume_id: photoSize.volume_id,
      local_id: photoSize.local_id,
    };
    if (big) {
      location.big = true;
    }
    return this.loadFile(location, dcId, options);
  }

  loadPhoto(photo, sizeType, options = {}) {
    const location = {
      _: 'inputPhotoFileLocation',
      id: photo.id,
      access_hash: photo.access_hash,
      file_reference: photo.file_reference,
      thumb_size: sizeType
    };
    return this.loadFile(location, photo.dc_id, options);
  }

  loadDocumentThumb(document, size, options = {}) {
    const location = {
      _: 'inputDocumentFileLocation',
      id: document.id,
      access_hash: document.access_hash,
      file_reference: document.file_reference,
      thumb_size: size
    };
    return this.loadFile(location, document.dc_id, options);
  }

  loadDocument(document, options = {}) {
    const location = {
      _: 'inputDocumentFileLocation',
      id: document.id,
      access_hash: document.access_hash,
      file_reference: document.file_reference
    };
    Object.assign(options, {mimeType: document.mime_type, size: document.size});
    return this.loadFile(location, document.dc_id, options);
  }

  loadStickerSetThumb(set, options = {}) {
    const location = {
      _: 'inputStickerSetThumb',
      stickerset: {_: 'inputStickerSetID', id: set.id, access_hash: set.access_hash},
      volume_id: set.thumb.location.volume_id,
      local_id: set.thumb.location.local_id,
    };
    return this.loadFile(location, set.thumb_dc_id, options);
  }

  async uploadFile(blob, name = '', {onProgress, signal} = {}) {
    const randomId = randomLong();

    const isBigFile = blob.size > 10 * 1024 * 1024;
    const partSize = 256 * 1024;
    const totalParts = Math.ceil(blob.size / partSize);

    const apiConnection = this.getConnection(ApiClient.getDcId());

    let aborted = false;
    if (signal) {
      signal.addEventListener('abort', () => aborted = true);
    }

    try {
      await this.queueWait(100);
      for (let partIndex = 0, offset = 0; offset < blob.size; partIndex++, offset += partSize) {
        if (aborted) {
          throw new Error('File upload aborted');
        }
        await apiConnection.callMethod(isBigFile ? 'upload.saveBigFilePart' : 'upload.saveFilePart', {
          file_id: randomId,
          file_part: partIndex,
          file_total_parts: totalParts,
          bytes: await blobToBuffer(blob.slice(offset, offset + partSize))
        });
        if (onProgress) {
          onProgress(Math.min(blob.size, offset + partSize));
        }
      }
    } finally {
      this.queueDone();
      this.connectionDone(apiConnection);
    }

    return {
      _: isBigFile ? 'inputFileBig' : 'inputFile',
      id: randomId,
      parts: totalParts,
      name,
      md5_checksum: ''
    };
  }
};

window.FileApiManager = FileApiManager;

export {FileApiManager};
