import {BigInteger} from './ext/jsbn_combined.js';
import * as Leemon from './ext/bigint.js';
import {Long} from './ext/long.js';
import {chunkArray} from './utils.js';

function storeByte(value) {
  return new Uint8Array([value]).buffer;
}

function storeInt(value) {
  return new Uint32Array([value]).buffer;
}

function storeInt64(...ints) { // 2 * int
  return new Uint32Array(ints).buffer;
}

function storeInt128(...ints) { // 4 * int
  return new Uint32Array(ints).buffer;
}

function storeInt256(...ints) { // 8 * int
  return new Uint32Array(ints).buffer;
}

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

function addPadding(bytes, blockSize = 16, zeroes = false) {
  if (!bytes.buffer) {
    bytes = new Uint8Array(bytes);
  }
  const len = bytes.byteLength;
  const needPadding = blockSize - (len % blockSize);
  if (needPadding > 0 && needPadding < blockSize) {
    const padding = new Uint8Array(needPadding);
    if (!zeroes) {
      crypto.getRandomValues(padding);
    }
    bytes = new Uint8Array(bufferConcat(bytes, padding));
  }

  return bytes;
}

function debugLogBuffer(buffer, msg = '') {
  const hexStr = chunkArray(Array.from(new Uint8Array(buffer)), 16)
      .map(chunk => {
        return chunk.map(n => {
          return n.toString(16).toUpperCase().padStart(2, '0');
        }).join(' ');
      }).join('\n');

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

function pqPrimeFactorization (pqBytes) {
  var what = new BigInteger(pqBytes)
  var result = false

  try {
    console.time('PQ leemon');
    result = pqPrimeLeemon(Leemon.str2bigInt(what.toString(16), 16, Math.ceil(64 / Leemon.bpe) + 1))
    console.timeEnd('PQ leemon');
  } catch (e) {
    console.error('Pq leemon Exception', e)
  }

  if (result === false && what.bitLength() <= 64) {
    console.time('PQ long')
    try {
      result = pqPrimeLong(Long.fromString(what.toString(16), 16))
    } catch (e) {
      console.error('Pq long Exception', e)
    }
    console.timeEnd('PQ long')
  }

  if (result === false) {
    console.time('pq BigInt')
    result = pqPrimeBigInteger(what)
    console.timeEnd('pq BigInt')
  }

  return result
}

function pqPrimeBigInteger (what) {
  var it = 0,
      g
  for (var i = 0; i < 3; i++) {
    var q = (nextRandomInt(128) & 15) + 17
    var x = bigint(nextRandomInt(1000000000) + 1)
    var y = x.clone()
    var lim = 1 << (i + 18)

    for (var j = 1; j < lim; j++) {
      ++it
      var a = x.clone()
      var b = x.clone()
      var c = bigint(q)

      while (!b.equals(BigInteger.ZERO)) {
        if (!b.and(BigInteger.ONE).equals(BigInteger.ZERO)) {
          c = c.add(a)
          if (c.compareTo(what) > 0) {
            c = c.subtract(what)
          }
        }
        a = a.add(a)
        if (a.compareTo(what) > 0) {
          a = a.subtract(what)
        }
        b = b.shiftRight(1)
      }

      x = c.clone()
      var z = x.compareTo(y) < 0 ? y.subtract(x) : x.subtract(y)
      g = z.gcd(what)
      if (!g.equals(BigInteger.ONE)) {
        break
      }
      if ((j & (j - 1)) == 0) {
        y = x.clone()
      }
    }
    if (g.compareTo(BigInteger.ONE) > 0) {
      break
    }
  }

  var f = what.divide(g), P, Q

  if (g.compareTo(f) > 0) {
    P = f
    Q = g
  } else {
    P = g
    Q = f
  }

  return [bytesFromBigInt(P), bytesFromBigInt(Q), it]
}

function gcdLong (a, b) {
  while (a.notEquals(Long.ZERO) && b.notEquals(Long.ZERO)) {
    while (b.and(Long.ONE).equals(Long.ZERO)) {
      b = b.shiftRight(1)
    }
    while (a.and(Long.ONE).equals(Long.ZERO)) {
      a = a.shiftRight(1)
    }
    if (a.compare(b) > 0) {
      a = a.subtract(b)
    } else {
      b = b.subtract(a)
    }
  }
  return b.equals(Long.ZERO) ? a : b
}

function pqPrimeLong (what) {
  var it = 0,
      g
  for (var i = 0; i < 3; i++) {
    var q = Long.fromInt((nextRandomInt(128) & 15) + 17)
    var x = Long.fromInt(nextRandomInt(1000000000) + 1)
    var y = x
    var lim = 1 << (i + 18)

    for (var j = 1; j < lim; j++) {
      ++it
      var a = x
      var b = x
      var c = q

      while (b.notEquals(Long.ZERO)) {
        if (b.and(Long.ONE).notEquals(Long.ZERO)) {
          c = c.add(a)
          if (c.compare(what) > 0) {
            c = c.subtract(what)
          }
        }
        a = a.add(a)
        if (a.compare(what) > 0) {
          a = a.subtract(what)
        }
        b = b.shiftRight(1)
      }

      x = c
      var z = x.compare(y) < 0 ? y.subtract(x) : x.subtract(y)
      g = gcdLong(z, what)
      if (g.notEquals(Long.ONE)) {
        break
      }
      if ((j & (j - 1)) == 0) {
        y = x
      }
    }
    if (g.compare(Long.ONE) > 0) {
      break
    }
  }

  var f = what.div(g), P, Q

  if (g.compare(f) > 0) {
    P = f
    Q = g
  } else {
    P = g
    Q = f
  }

  return [bytesFromHex(P.toString(16)), bytesFromHex(Q.toString(16)), it]
}

function pqPrimeLeemon (what) {
  var minBits = 64
  var minLen = Math.ceil(minBits / Leemon.bpe) + 1
  var it = 0
  var i, q
  var j, lim
  var g, P
  var Q
  var a = new Array(minLen)
  var b = new Array(minLen)
  var c = new Array(minLen)
  var g = new Array(minLen)
  var z = new Array(minLen)
  var x = new Array(minLen)
  var y = new Array(minLen)

  for (i = 0; i < 3; i++) {
    q = (nextRandomInt(128) & 15) + 17
    Leemon.copyInt_(x, nextRandomInt(1000000000) + 1)
    Leemon.copy_(y, x)
    lim = 1 << (i + 18)

    for (j = 1; j < lim; j++) {
      ++it
      Leemon.copy_(a, x)
      Leemon.copy_(b, x)
      Leemon.copyInt_(c, q)

      while (!Leemon.isZero(b)) {
        if (b[0] & 1) {
          Leemon.add_(c, a)
          if (Leemon.greater(c, what)) {
            Leemon.sub_(c, what)
          }
        }
        Leemon.add_(a, a)
        if (Leemon.greater(a, what)) {
          Leemon.sub_(a, what)
        }
        Leemon.rightShift_(b, 1)
      }

      Leemon.copy_(x, c)
      if (Leemon.greater(x, y)) {
        Leemon.copy_(z, x)
        Leemon.sub_(z, y)
      } else {
        Leemon.copy_(z, y)
        Leemon.sub_(z, x)
      }
      Leemon.eGCD_(z, what, g, a, b)
      if (!Leemon.equalsInt(g, 1)) {
        break
      }
      if ((j & (j - 1)) == 0) {
        Leemon.copy_(y, x)
      }
    }
    if (Leemon.greater(g, Leemon.one)) {
      break
    }
  }

  Leemon.divide_(what, g, x, y)

  if (Leemon.greater(g, x)) {
    P = x
    Q = g
  } else {
    P = g
    Q = x
  }

  // console.log(dT(), 'done', bigInt2str(what, 10), bigInt2str(P, 10), bigInt2str(Q, 10))

  return [bytesFromLeemonBigInt(P), bytesFromLeemonBigInt(Q), it]
}

function bytesModPow (x, y, m) {
  try {
    var xBigInt = Leemon.str2bigInt(bytesToHex(x), 16)
    var yBigInt = Leemon.str2bigInt(bytesToHex(y), 16)
    var mBigInt = Leemon.str2bigInt(bytesToHex(m), 16)
    var resBigInt = Leemon.powMod(xBigInt, yBigInt, mBigInt)

    return bytesFromHex(Leemon.bigInt2str(resBigInt, 16))
  } catch (e) {
    console.error('mod pow error', e)
  }

  return bytesFromBigInt(new BigInteger(x).modPow(new BigInteger(y), new BigInteger(m)), 256)
}

function bytesXor (bytes1, bytes2) {
  bytes1 = new Uint8Array(bytes1);
  bytes2 = new Uint8Array(bytes2);
  const len = bytes1.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; ++i) {
    bytes[i] = bytes1[i] ^ bytes2[i]
  }
  return bytes;
}

function nextRandomInt (maxValue) {
  return Math.floor(Math.random() * maxValue)
}

function bytesFromBigInt (bigInt, len) {
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

function bytesFromLeemonBigInt (bigInt, len) {
  var str = Leemon.bigInt2str(bigInt, 16)
  return bytesFromHex(str)
}

function gzipUncompress(bytes) {
  const label =  'Gzip uncompress ' + bytes.length + ' bytes';
  console.time(label);
  const result = (new Zlib.Gunzip(bytes)).decompress();
  console.timeEnd(label);
  return result;
}

window.bytesToHex = bytesToHex;
window.bytesFromHex = bytesFromHex;
window.debugLogBuffer = debugLogBuffer;

export {
  storeByte,
  storeInt,
  intToUint,
  uintToInt,
  bytesToHex,
  bytesFromHex,
  bytesToArrayBuffer,
  bytesCmp,
  bytesModPow,
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
  addPadding,
  debugLogBuffer,
  gzipUncompress
};
