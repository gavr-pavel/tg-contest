const MediaApiManager = new class {
  choosePhotoSize(sizes, type = 'm') {
    const size = sizes.find(item => item.type === type);
    if (size) {
      return size;
    }
    if (type !== 'i') {
      return sizes.find(item => item.type !== 'i');
    }
  }

  getPhotoStrippedSize(sizes) {
    const size = this.choosePhotoSize(sizes, 'i');
    if (size && size.bytes[0] === 0x01) {
      const header = this.jpegHeader;
      const footer = this.jpegFooter;

      // const bytes = new Uint8Array(header.byteLength + footer.byteLength + size.bytes.byteLength);
      // bytes.set(header.subarray(0, 164), 0);
      // bytes.set(size.bytes.subarray(1, 2), 164);

      const bytes = bufferConcat(header.subarray(0, 164), size.bytes.subarray(1, 2), header.subarray(165, 166), size.bytes.subarray(2, 3), header.subarray(167), size.bytes.subarray(3), footer);

      return 'data:image/jpeg;base64,' + base64Encode(bytes);
    }
  }

  jpegHeader = base64Decode(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDACgcHiMeGSgjISMtKygwPGRBPDc3PHtYXUlkkYCZlo+AjIqgtObDoKrarYqMyP/L2u71////' +
      'm8H///' +
      '/6/+b9//j/2wBDASstLTw1PHZBQXb4pYyl+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj/' +
      'wAARCAAAAAADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/' +
      '8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0R' +
      'FRkd' +
      'ISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2' +
      'uHi4' +
      '+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/' +
      '8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkN' +
      'ERUZ' +
      'HSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2' +
      'Nna4' +
      'uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA='
  );

  jpegFooter = base64Decode('/9k=');
};

window.MediaApiManager = MediaApiManager;

export {MediaApiManager};


function base64Encode(bytes) {
  if (bytes instanceof  ArrayBuffer) {
    bytes = new Uint8Array(bytes);
  }
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

function base64Decode(string) {
  const binaryString = atob(string);
  const binaryView = new Uint8Array(binaryString.length);
  for (let i = 0; i < string.length; i++) {
    binaryView[i] = binaryString.charCodeAt(i);
  }
  return binaryView;
}

function bufferConcat(...buffers) {
  let len = 0;
  for (const buf of buffers) {
    len += buf.byteLength || buf.length || 0;
  }
  const tmp = new Int8Array(len);
  let offset = 0;
  for (const buf of buffers) {
    tmp.set(buf instanceof ArrayBuffer ? new Int8Array(buf) : buf, offset);
    offset += buf.byteLength || buf.length;
  }
  return tmp.buffer;
}