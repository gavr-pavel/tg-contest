import {bufferConcat, bigBytesInt, bigint, bufferRandom, bytesPowMod, bytesXor} from '../mtproto/bin.js';
import {sha256Hash} from '../mtproto/crypto.js';

async function getInputPasswordSRP(password, accountPassword) {
  return await calcInputPassword(password, accountPassword);

  async function SH(data, salt) {
    return await sha256Hash(bufferConcat(salt, data, salt));
  }

  async function calcPasswordHash(password, salt1, salt2) {
    const buf = await SH(await SH(password, salt1), salt2);
    const key = await crypto.subtle.importKey('raw', buf, 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-512', salt: salt1, iterations: 100000}, key, 512);
    return SH(hash, salt2);
  }

  async function calcInputPassword(password, srpParams) {
    const {srp_B: B, srp_id} = srpParams;
    const {p, salt1, salt2} = srpParams.current_algo;
    const g = new Uint8Array([srpParams.current_algo.g]);

    const p_bn = bigBytesInt(p);
    const B_bn = bigBytesInt(B);
    const zero_bn = bigint(0);

    const g_padded = new Uint8Array(256);
    g_padded.set(g);
    g_padded.reverse();

    const a = new Uint8Array(bufferRandom(256));
    const a_bn = bigBytesInt(a);

    const A = await bytesPowMod(g, a, p);

    const [x, u, k] = await Promise.all([
      calcPasswordHash(new TextEncoder().encode(password), salt1, salt2),
      sha256Hash(bufferConcat(A, B)),
      sha256Hash(bufferConcat(p, g_padded)),
    ]);

    const v = await bytesPowMod(g, x, p);

    const kv_bn = bigBytesInt(k).multiply(bigBytesInt(v)).mod(p_bn);

    let t_bn = B_bn.subtract(kv_bn).mod(p_bn);
    if (t_bn.compareTo(zero_bn) < 0) {
      t_bn = t_bn.add(p_bn);
    }

    const exp = a_bn.add(bigBytesInt(u).multiply(bigBytesInt(x))).toByteArray();
    const S = await bytesPowMod(t_bn.toByteArray(), exp, p);
    const S_padded = new Uint8Array(256);
    S_padded.set(S);

    const [K, h1, h2, hs1, hs2] = await Promise.all([
      sha256Hash(S_padded),
      sha256Hash(p),
      sha256Hash(g_padded),
      sha256Hash(salt1),
      sha256Hash(salt2),
    ]);

    const M1 = await sha256Hash(bufferConcat(bytesXor(h1, h2), hs1, hs2, A, B, K));
    return {srp_id, A, M1};
  }
}

export {getInputPasswordSRP};
