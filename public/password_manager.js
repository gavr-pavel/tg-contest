import {bufferConcat, bigBytesInt, bigint, bufferRandom, bytesPowMod, bytesMulMod, bytesXor} from './mtproto/bin.js';
import {sha256Hash} from './mtproto/crypto.js';

async function SH(data, salt) {
  return await sha256Hash(bufferConcat(salt, data, salt));
}

async function PH1(password, salt1, salt2) {
  const buf = SH(password, salt1);
  return SH(buf, salt2);
}

async function PH2(password, salt1, salt2) {
  const buf = await PH1(password, salt1, salt2);
  const key = await crypto.subtle.importKey('raw', buf, 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-512', salt: salt1, iterations: 100000}, key, 512);
  return await SH(hash, salt2);
}

async function calcInputPassword(password, srpParams) {
  const {srp_B: B, srp_id} = srpParams;
  const {g, p, salt1, salt2} = srpParams.current_algo;

  const p_bn = bigBytesInt(p);
  const B_bn = bigBytesInt(B);
  const zero = bigint(0);

  const gBytes = new Uint8Array([g]);
  const g_bn = bigint(g);
  const g_padded = new Uint8Array(256);
  g_padded.set(g_bn.toByteArray());

  const a = bufferRandom(256);
  const a_bn = bigBytesInt(a);

  const A = await bytesPowMod(gBytes, a, p);

  const [x, u, k] = await Promise.all([
    PH2(password, salt1, salt2),
    sha256Hash(bufferConcat(A, B)),
    sha256Hash(bufferConcat(p, g_padded)),
  ]);

  const v = await bytesPowMod(gBytes, x, p);

  const kv = await bytesMulMod(k, v, p);

  let t_bn = B_bn.subtract(bigBytesInt(kv));
  if (t_bn.compareTo(zero) < 0) {
    t_bn = t_bn.add(p_bn);
  }

  const exp_bn = a_bn.add(bigBytesInt(u).multiply(bigBytesInt(x)));

  const S = await bytesPowMod(t_bn.toByteArray(), exp_bn.toByteArray(), p);
  const S_padded = new Uint8Array(256);
  S_padded.set(S);


  const [K, h1, h2, hs1, hs2] = Promise.all([
    sha256Hash(S_padded),
    sha256Hash(p),
    sha256Hash(g_padded),
    sha256Hash(salt1),
    sha256Hash(salt2),
  ]);

  const M1 = await sha256Hash(bufferConcat(bytesXor(h1, h2), hs1, hs2, A, B, K));
  return {srp_id, A, M1};
}

export {calcInputPassword};
