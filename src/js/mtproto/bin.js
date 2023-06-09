import {BigInteger} from './jsbn_combined.js';
import {workerTask} from './crypto';

function intToUint(val) {
  val = parseInt(val);
  if (val < 0) {
    val = val + 0x100000000;
  }
  return val;
}

function uintToInt(val) {
  if (val > 0x7fffffff) {
    val = val - 0x100000000;
  }
  return val;
}

function bufferRandom(byteLength) {
  return crypto.getRandomValues(new Uint8Array(byteLength)).buffer;
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

function logBytesHex(buffer, msg = '') {
  let hexStr = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hexStr += (bytes[i] < 16 ? '0' :  '') + bytes[i].toString(16);
    hexStr += i && !((i + 1) % 16) ? '\n' : ' ';
  }
  hexStr = hexStr.toUpperCase();
  console.log('%s\n%s', msg, hexStr);
}

function bytesToHex(bytes) {
  bytes = new Uint8Array(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] < 16 ? '0' : '') + (bytes[i] || 0).toString(16);
  }
  return hex;
}

function bytesFromHex(hexString) {
  const len = hexString.length;
  let start = 0;
  const bytes = new Uint8Array(Math.ceil(len  / 2));

  if (len % 2) {
    bytes[0] = parseInt(hexString.charAt(0), 16);
    start++;
  }

  for (let i = start, offset = start; i < len; i += 2, offset++) {
    bytes[offset] = parseInt(hexString.substr(i, 2), 16);
  }

  return bytes;
}

function bytesToArrayBuffer (b) {
  return (new Uint8Array(b)).buffer
}

function bytesCmp(bytes1, bytes2) {
  if (bytes1 instanceof ArrayBuffer) {
    bytes1 = new Uint8Array(bytes1);
  }
  if (bytes2 instanceof ArrayBuffer) {
    bytes2 = new Uint8Array(bytes2);
  }
  var len = bytes1.length
  if (len !== bytes2.length) {
    return false
  }

  for (var i = 0; i < len; i++) {
    if (bytes1[i] !== bytes2[i]) {
      return false
    }
  }
  return true
}

function bigint(num) {
  return new BigInteger(num.toString(16), 16)
}

function bigStringInt(strNum, base = 10) {
  return new BigInteger(strNum, base)
}

function bigBytesInt(bytes) {
  if (bytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(bytes);
  }
  return new BigInteger(bytes);
}

function longFromInts(high, low) {
  return bigint(high).shiftLeft(32).add(bigint(low)).toString(10);
}

function longToBytes(sLong, base = 10) {
  const [high, low] = bigStringInt(sLong, base).divideAndRemainder(bigint(0x100000000));
  const buffer = new Uint32Array([low.intValue(), high.intValue()]).buffer;
  return new Uint8Array(buffer);
}

async function pqPrimeFactorization(pqBytes) {
  return workerTask('factorize', {pqBytes});
}

async function bytesPowMod(x, y, m) {
  return workerTask('pow_mod', [x, y, m]);
}

function bytesXor(bytes1, bytes2) {
  bytes1 = new Uint8Array(bytes1);
  bytes2 = new Uint8Array(bytes2);
  const len = bytes1.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; ++i) {
    bytes[i] = bytes1[i] ^ bytes2[i]
  }
  return bytes;
}

function bytesFromBigInt(bigInt, len) {
  var bytes = bigInt.toByteArray()

  if (len && bytes.length < len) {
    var padding = []
    for (var i = 0, needPadding = len - bytes.length; i < needPadding; i++) {
      padding[i] = 0
    }
    if (bytes instanceof ArrayBuffer) {
      bytes = bufferConcat(padding, bytes)
    } else {
      bytes = padding.concat(bytes)
    }
  }else {
    while (!bytes[0] && (!len || bytes.length > len)) {
      bytes = bytes.slice(1)
    }
  }

  return bytes
}

function gzipUncompress(bytes) {
  // const label =  'Gzip uncompress ' + bytes.length + ' bytes';
  // console.time(label);
  const result = (new Zlib.Gunzip(bytes)).decompress();
  // console.timeEnd(label);
  return result;
}

function intRand(min, max) {
  return min + Math.round(Math.random() * (max - min));
}

function base64Bytes(bytes) {
  if (bytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(bytes);
  }

  let base64    = '';
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  const byteLength    = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength    = byteLength - byteRemainder;

  let a, b, c, d;
  let chunk;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }

  return base64;
}

window.bytesToHex = bytesToHex;
window.bytesFromHex = bytesFromHex;
window.logBytesHex = logBytesHex;

export {
  intRand,
  intToUint,
  uintToInt,
  bytesToHex,
  bytesFromHex,
  bytesToArrayBuffer,
  bytesCmp,
  bytesPowMod,
  bytesXor,
  bigint,
  bigStringInt,
  bigBytesInt,
  bytesFromBigInt,
  longFromInts,
  longToBytes,
  pqPrimeFactorization,
  bufferConcat,
  bufferRandom,
  logBytesHex,
  gzipUncompress,
  base64Bytes
};
