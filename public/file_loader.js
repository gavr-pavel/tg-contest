import TdClient from './td_client.js';

export default new class FileLoader {
  files = new Map();

  downloads = new Map();

  urls = new Map();

  constructor() {
    TdClient.listen(this.onUpdate);
  }

  onUpdate = (update) => {
    switch (update['@type']) {
      case 'updateFile':
        this.files.set(update.file.id, update.file);
        break;
    }
  };

  download(fileId, priority = 1) {
    if (this.downloads.has(fileId)) {
      return this.downloads.get(fileId);
    }

    const file = this.files.get(fileId);
    if (file && file.local.is_downloading_completed) {
      return Promise.resolve(file);
    }

    const promise = TdClient.send({
      '@type': 'downloadFile',
      file_id: fileId,
      priority,
      synchronous: true,
    });

    promise.finally(() => {
      this.downloads.delete(fileId);
    });

    this.downloads.set(fileId, promise);

    return promise;
  }

  cancelDownload(file) {
    TdClient.send({
      '@type': 'cancelDownloadFile',
      file_id: file.id,
    });

    this.downloads.delete(file.id);
  }

  async getUrl(file) {
    if (this.urls.has(file.id)) {
      this.urls.get(file.id);
    }

    if (!file.local.is_downloading_completed) {
      throw new Error('File downloading is not completed');
    }

    const {data: blob} = await TdClient.send({
      '@type': 'readFilePart',
      file_id: file.id,
      offset: 0,
      count: 0,
    });

    const url = URL.createObjectURL(blob);

    this.urls.set(file.id, url);

    return url;
  }
}