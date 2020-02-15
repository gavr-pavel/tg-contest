import {bufferRandom, bufferConcat, pqPrimeFactorization, intRand, intToUint, bigint, bigBytesInt, bigStringInt, longFromInts, longToBytes, bytesToArrayBuffer, bytesCmp, bytesToHex, bytesFromHex, bytesPowMod, bytesXor} from './bin.js';
import {TLSerialization, TLDeserialization, Schema} from './tl.js';
import {selectRsaPublicKey, rsaEncrypt, sha1Hash, sha256Hash, aesIgeDecrypt, aesIgeEncrypt} from './crypto.js';
import {aesjs} from '../vendor/aes.js';
import {WebSocketTransport} from './transport.js';

class MTProto {
  authKey = 0;
  authKeyId = 0;
  sessionId = 0;
  seqNo = 0;
  serverSalt = 0;

  timeOffset = 0;

  pendingMessages = [];

  sentMessages = new Map();

  pendingAcks = [];

  constructor(options) {
    this.options = options;

    this.dcId = options.dcId || this.chooseDC();

    this.transport = new WebSocketTransport({
      dcId: this.dcId,
      onMessage: (buffer) => this.transportReceive(buffer),
      onReconnect: () => {
        this.init();
      }
    });

    this.init();
  }

  async init() {
    if (this.isProtocolFramingEnabled()) {
      await this.initProtocol();
    }

    this.updateSessionId();

    const authData = Storage.get(this.getAuthStorageKey());
    if (authData) {
      this.authKey = bytesFromHex(authData.key);
      this.authKeyId = bytesFromHex(authData.id);
      this.serverSalt = bytesFromHex(authData.salt);
      this.timeOffset = authData.timeOffset;
      this.apiAuth = authData.apiAuth;
      this.onAuthReady();
    } else {
      this.initAuth();
    }
  }

  initAuth() {
    this.connectionDeferred = this.connectionDeferred || getDeferred();
    this.reqPq();
  }

  updateSessionId() {
    this.sessionId = new Uint8Array(bufferRandom(8));
  }

  isProtocolFramingEnabled() {
    return true;
  }

  async initProtocol() {
    const bytes = new Uint8Array(64);

    while (1) {
      const dataView = new DataView(bytes.buffer);
      crypto.getRandomValues(bytes);
      if (dataView.getUint8(0) === 0xef) {
        continue;
      }
      const int1 = dataView.getUint32(0);
      if (int1 === 0x44414548 || int1 === 0x54534f50 || int1 === 0x20544547 || int1 === 0x4954504f || int1 === 0xdddddddd || int1 === 0xeeeeeeee) {
        continue;
      }
      const int2 = dataView.getUint32(4);
      if (int2 === 0x00000000) {
        continue;
      }
      dataView.setUint32(56, 0xeeeeeeee);
      dataView.setUint16(60, 0);
      break;
    }

    const encryptKey = bytes.subarray(8, 40);
    const encryptIV = bytes.subarray(40, 56);
    this.protocolEncryptor = new aesjs.ModeOfOperation.ctr(encryptKey, new aesjs.Counter(encryptIV));

    const reversedBytes = new Uint8Array(bytes).reverse();
    const decryptKey = reversedBytes.subarray(8, 40);
    const decryptIV = reversedBytes.subarray(40, 56);
    this.protocolDecryptor = new aesjs.ModeOfOperation.ctr(decryptKey, new aesjs.Counter(decryptIV));

    const encryptedBytes = await this.transportObfuscationEncrypt(bytes);
    const finalBuffer = bufferConcat(bytes.subarray(0, 56), encryptedBytes.subarray(56));

    this.transport.send(finalBuffer);
  }

  transportObfuscationEncrypt(bytes) {
    bytes = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
    return this.protocolEncryptor.encrypt(bytes);
  }

  transportObfuscationDecrypt(bytes) {
    bytes = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
    return this.protocolDecryptor.decrypt(bytes);
  }

  async transportSend(buffer) {
    if (this.isProtocolFramingEnabled()) {
      const header = new Uint32Array([buffer.byteLength]).buffer;
      buffer = await this.transportObfuscationEncrypt(bufferConcat(header, buffer));
    }
    const response = await this.transport.send(buffer);
    if (response) {
      this.transportReceive(response);
    }
  }

  async transportReceive(buffer) {
    let response = buffer;

    if (this.isProtocolFramingEnabled()) {
      const decrypted = await this.transportObfuscationDecrypt(response);
      response = decrypted.buffer.slice(4);
      if (response.byteLength === 4) {
        const errorCode = new Int32Array(response)[0];
        console.warn('[MTProto] error ' + errorCode);
        this.resetAuthKey();
        this.initAuth();
        return;
      }
    }

    if (this.authKey) {
      const parsedResponse = await this.parseEncryptedResponse(response);
      this.handleResponseMessage(parsedResponse.message, parsedResponse.msgId);
    } else {
      this.handlePlainResponseMessage(response);
    }
  }

  async wrapEncryptedMessage(msgKey, encryptedData) {
    const s = new TLSerialization({startMaxLength: encryptedData.byteLength + 256});
    s.storeIntBytes(this.authKeyId, 64, 'auth_key_id');
    s.storeIntBytes(msgKey, 128, 'message_key');
    s.storeRawBytes(encryptedData, 'encrypted_data');
    return s.getBuffer();
  }

  wrapPlainMessage(messageBuffer) {
    const s = new TLSerialization({mtproto: true});
    s.storeLong(this.authKeyId, 'auth_key_id');
    s.storeLong(this.genMsgId(), 'message_id');
    s.storeInt(messageBuffer.byteLength, 'message_data_length');
    s.storeRawBytes(messageBuffer, 'message_data');
    return s.getBuffer();
  }

  wrapPlainMethodCall(method, params) {
    const s = new TLSerialization({mtproto: true});
    s.storeMethod(method, params);
    return s.getBuffer();
  }

  wrapMethodCallMessage(method, params = {}, options = {}) {
    console.log('[MTProto] call method', {method, params});
    const s = new TLSerialization({mtproto: !options.api});
    options.resultType = s.storeMethod(method, params);
    options.source = method;
    options.notContentRelated = !this.isContentRelatedConstructor(method);
    return this.prepareMessageFromBuffer(s.getBuffer(), options);
  }

  wrapObjectMessage(constructor, obj, options = {}) {
    obj = Object.assign({_: constructor}, obj);
    const s = new TLSerialization({mtproto: true});
    s.storeObject(obj, 'Object');
    options.source = constructor;
    options.notContentRelated = !this.isContentRelatedConstructor(constructor);
    return this.prepareMessageFromBuffer(s.getBuffer(), options);
  }

  prepareMessageFromBuffer(buffer, options) {
    return {
      seqNo: options.seqNo || this.genSeqNo(!options.notContentRelated),
      msgId: options.msgId || this.genMsgId(),
      bytes: buffer.byteLength,
      body: buffer,
      api: options.api || false,
      source: options.source,
      resultType: options.resultType,
    };
  }

  pushMessage(message) {
    message.deferred = getDeferred();
    this.pendingMessages.push(message);
    this.schedulePendingMessagesRequest();
    return message.deferred.promise;
  }

  getPendingMessages() {
    const pending = this.pendingMessages;
    this.pendingMessages = [];

    if (this.pendingAcks.length) {
      const msgIds = this.pendingAcks;
      this.pendingAcks = [];
      const message = this.wrapObjectMessage('msgs_ack', {
        msg_ids: msgIds
      });
      pending.push(message);
    }

    return pending;
  }

  async encryptMessages(messages) {
    let seqNo;
    let msgId;
    let buffer;

    messages = [].concat(messages).concat(this.getPendingMessages());

    for (const msg of messages) {
      if (msg.api || msg.needResult) {
        this.sentMessages.set(msg.msgId, msg);
      }
    }

    if (messages.length > 1) {
      const messagesByteLen = messages.reduce((accum, msg) => accum + msg.bytes, 0);

      const container = new TLSerialization({mtproto: true, startMaxLength: messagesByteLen + 1024});
      container.storeInt(0x73f1f8dc, 'CONTAINER[id]');
      container.storeInt(messages.length, 'CONTAINER[count]');
      for (let i = 0; i < messages.length; i++) {
        container.storeLong(messages[i].msgId, 'CONTAINER[' + i + '][msg_id]');
        container.storeInt(messages[i].seqNo, 'CONTAINER[' + i + '][seqno]');
        container.storeInt(messages[i].bytes, 'CONTAINER[' + i + '][bytes]');
        container.storeRawBytes(messages[i].body, 'CONTAINER[' + i + '][body]');
      }

      seqNo = this.genSeqNo(false);
      msgId = this.genMsgId();
      buffer = container.getBuffer();

      // console.log('[MTProto] encrypting container', {msgId, seqNo, messages});
    } else {
      const msg = messages[0];
      msgId = msg.msgId;
      seqNo = msg.seqNo;
      buffer = msg.body;
      // console.log('[MTProto] encrypting single message', {msgId, seqNo, msg});
    }

    const data = new TLSerialization({startMaxLength: buffer.byteLength + 64});
    data.storeIntBytes(this.serverSalt, 64, 'salt');
    data.storeIntBytes(this.sessionId, 64, 'session_id');
    data.storeLong(msgId, 'message_id');
    data.storeInt(seqNo, 'seq_no');
    data.storeInt(buffer.byteLength, 'message_data_length');
    data.storeRawBytes(buffer, 'message_data');

    const paddingLength = (16 - (data.offset % 16)) + 16 * (1 + intRand(0, 5));
    const padding = bufferRandom(paddingLength);
    const dataWithPadding = bufferConcat(data.getBuffer(), padding);

    const msgKey = await this.getMsgKey(dataWithPadding, true);
    const [aesKey, aesIv] = await this.getAesKeyIv(msgKey, true);
    const ecryptedData = await aesIgeEncrypt(dataWithPadding, aesKey, aesIv);

    return [msgKey, ecryptedData];
  }

  async decryptMessage(encryptedMessage, msgKey) {
    const [aesKey, aesIv] = await this.getAesKeyIv(msgKey, false);
    const dataWithPadding = bytesToArrayBuffer(await aesIgeDecrypt(encryptedMessage, aesKey, aesIv));
    const checkMsgKey = await this.getMsgKey(dataWithPadding, false);

    if (!bytesCmp(msgKey, checkMsgKey)) {
      throw new Error('[MTProto] server msgKey mismatch: ' + bytesToHex(msgKey) + ', ' + bytesToHex(checkMsgKey));
    }

    const data = new TLDeserialization(dataWithPadding, {mtproto: true});
    const salt = data.fetchIntBytes(64, true, 'salt');
    const sessionId = data.fetchIntBytes(64, true, 'session_id');

    if (!bytesCmp(sessionId, this.sessionId)) {
      throw new Error('[MTProto] Invalid server session_id: ' + bytesToHex(sessionId))
    }

    const msgId = data.fetchLong('message_id');
    const seqNo = data.fetchInt('seq_no');
    const msgLen = data.fetchInt('message_data_length');
    const messageData = data.fetchRawBytes(msgLen, true, 'message_data');

    return {msgId, msgLen, seqNo, messageData: messageData.buffer};
  }

  async getMsgKey(dataWithPadding, isOut) {
    const authKey = this.authKey;
    const x = isOut ? 0 : 8;
    const msgKeyLargePlain = bufferConcat(authKey.subarray(88 + x, 88 + x + 32), dataWithPadding);
    const msgKeyLarge = await sha256Hash(msgKeyLargePlain);
    return new Uint8Array(msgKeyLarge).subarray(8, 24);
  }

  async getAesKeyIv(msgKey, isOut) {
    const authKey = this.authKey;
    const x = isOut ? 0 : 8;

    const sha2aText = new Uint8Array(52);
    sha2aText.set(msgKey, 0);
    sha2aText.set(authKey.subarray(x, x + 36), 16);

    const sha2bText = new Uint8Array(52);
    sha2bText.set(authKey.subarray(40 + x, 40 + x + 36), 0);
    sha2bText.set(msgKey, 36);

    let [sha2a, sha2b] = await Promise.all([
      sha256Hash(sha2aText),
      sha256Hash(sha2bText)
    ]);
    sha2a = new Uint8Array(sha2a);
    sha2b = new Uint8Array(sha2b);

    const aesKey = new Uint8Array(32);
    aesKey.set(sha2a.subarray(0, 8))
    aesKey.set(sha2b.subarray(8, 24), 8)
    aesKey.set(sha2a.subarray(24, 32), 24)

    const aesIv = new Uint8Array(32);
    aesIv.set(sha2b.subarray(0, 8))
    aesIv.set(sha2a.subarray(8, 24), 8)
    aesIv.set(sha2b.subarray(24, 32), 24)

    return [aesKey, aesIv];
  }

  genMsgId() {
    const now = Date.now();
    const sec = Math.floor(now / 1000) + this.timeOffset;
    const ms = intToUint((now % 1000) << 23 | (intRand(0, 0xffff) << 3) | 4);

    const msgId = [sec, ms];

    if (this.lastMsgId) {
      const [lastSec, lastMs] = this.lastMsgId;
      if (lastSec > sec || lastSec === sec && lastMs >= ms) {
        msgId[0] = this.lastMsgId[0];
        msgId[1] = this.lastMsgId[1] + 4;
      }
    }
    this.lastMsgId = msgId;

    return longFromInts(...msgId);
  }

  genSeqNo(contentRelated = true) {
    const inc = contentRelated ? 1 : 0;
    const value = this.seqNo;
    this.seqNo += inc;
    return value * 2 + inc;

    let seqNo = this.seqNo * 2;
    if (contentRelated) {
      seqNo++;
      this.seqNo++;
    }
    return seqNo;
  }

  async parseEncryptedResponse(buffer) {
    const res = new TLDeserialization(buffer, {mtproto: true});
    const authKeyId = res.fetchIntBytes(64, false, 'auth_key_id');
    if (!bytesCmp(authKeyId, this.authKeyId)) {
      throw new Error('[MTProto] Invalid server auth_key_id: ' + bytesToHex(authKeyId));
    }

    const msgKey = res.fetchIntBytes(128, true, 'msg_key');
    const encryptedData = res.fetchRawBytes(buffer.byteLength - res.getOffset(), true, 'encrypted_data');

    const {msgId, msgLen, seqNo, messageData} = await this.decryptMessage(encryptedData, msgKey);

    const deserializer = new TLDeserialization(messageData, {
      mtproto: true,
      override: {
        mt_rpc_result: function(result, field) {
          result.req_msg_id = this.fetchLong(field + '[req_msg_id]');
          result.result = this.fetchObject('Object', field + '[result]');
        }
      }
    });
    const message = deserializer.fetchObject('Object');
    return {authKeyId, seqNo, msgId, msgLen, message};
  }

  unwrapPlainResponse(buffer, type) {
    const res = new TLDeserialization(buffer, {mtproto: true});
    const authKeyId = res.fetchLong();
    const msgId = res.fetchLong();
    const msgLen = res.fetchInt();
    const message = res.fetchObject(type);
    return {authKeyId, msgId, msgLen, message};
  }

  async sendRequest(messages) {
    if (this.connectionDeferred) {
      await this.connectionDeferred.promise;
    }

    const isSingleMessage = !Array.isArray(messages);
    if (isSingleMessage) {
      messages = [messages];
    }

    const [msgKey, encryptedData] = await this.encryptMessages(messages);
    const buffer = await this.wrapEncryptedMessage(msgKey, encryptedData);

    await this.transportSend(buffer);

    if (isSingleMessage) {
      const msg = messages[0];
      return msg.deferred && msg.deferred.promise;
    } else {
      return Promise.all(messages.map(msg => msg.deferred && msg.deferred.promise));
    }
  }

  async sendPlainRequest(buffer) {
    const reqBuffer = this.wrapPlainMessage(buffer);

    this.plainRequestDeferred = getDeferred();
    this.transportSend(reqBuffer);
    const response = await this.plainRequestDeferred.promise;
    delete this.plainRequestDeferred;

    return this.unwrapPlainResponse(response, 'Object');
  }

  handlePlainResponseMessage(buffer) {
    if (this.plainRequestDeferred) {
      this.plainRequestDeferred.resolve(buffer);
    }
  }

  handleResponseMessage(object, msgId) {
    switch (object._) {
      case 'msg_container':
        for (const msg of object.messages) {
          this.handleResponseMessage(msg.body, msg.msg_id);
        }
        break;
      case 'new_session_created':
        this.ackMessage(msgId);
        this.updateServerSalt(object.server_salt);
        break;
      case 'msgs_ack':
        // todo
        break;
      case 'bad_server_salt':
        console.warn('[MTProto] bad_server_salt', object);
        this.updateServerSalt(object.new_server_salt);
        const sentMessage = this.sentMessages.get(object.bad_msg_id);
        if (sentMessage) {
          console.warn('[MTProto] bad_server_salt. Have message to resend');
          this.sendRequest(sentMessage);
        } else {
          console.warn('[MTProto] bad_server_salt. No message to resend');
          const sentMessages = Array.from(this.sentMessages.values());
          if (sentMessages.length) {
            this.sendRequest(sentMessages);
          }
        }
        break;
      case 'ping':
        this.sendRequest(this.wrapObjectMessage('pong', {ping_id: object.ping_id}));
        break;
      case 'rpc_result':
        this.ackMessage(msgId);
        this.onRpcResult(object.req_msg_id, object.result);
        // console.log('[MTProto] got rpc_result', msgId, object.result);
        break;
      case 'updates':
      case 'updateShort':
      case 'updateShortMessage':
        this.ackMessage(msgId);
        this.options.onUpdates(object);
        break;
      default:
        this.ackMessage(msgId);
        // console.log('[MTProto] got response object', object);
    }
  }

  ackMessage(msgId) {
    this.pendingAcks.push(msgId);
    this.schedulePendingMessagesRequest();
  }

  schedulePendingMessagesRequest() {
    if (this.pendingMessages.length >= 10) {
      this.flushPendingMessages();
    } else if (!this.pendingMessagesRequestTimeout) {
      this.pendingMessagesRequestTimeout = setTimeout(() => {
        this.flushPendingMessages();
        this.pendingMessagesRequestTimeout = null;
      });
    }
  }

  flushPendingMessages() {
    const pendingMessages = this.getPendingMessages();
    if (pendingMessages.length) {
      this.sendRequest(pendingMessages);
    }
  }

  onRpcResult(reqMsgId, result) {
    const sentMessage = this.sentMessages.get(reqMsgId);
    if (sentMessage) {
      this.sentMessages.delete(reqMsgId);
      if (sentMessage.deferred) {
        sentMessage.deferred.resolve(result);
      }
    }
  }

  async reqPq() {
    const auth = {nonce: bufferRandom(16)};

    const req = this.wrapPlainMethodCall('req_pq_multi', {nonce: auth.nonce});
    const {message: resPQ} = await this.sendPlainRequest(req);

    if (resPQ._ !== 'resPQ') {
      throw new Error('[MTProto] resPQ response invalid: ' + resPQ._)
    }

    if (!bytesCmp(auth.nonce, resPQ.nonce)) {
      throw new Error('[MTProto] resPQ nonce mismatch');
    }

    auth.publicKey = selectRsaPublicKey(resPQ.server_public_key_fingerprints);

    if (!auth.publicKey) {
      throw new Error('[MTProto] No public key found');
    }

    auth.serverNonce = resPQ.server_nonce;
    auth.pq = resPQ.pq;

    // console.time('[MTProto] req_pq_factorize');
    [auth.p, auth.q] = await pqPrimeFactorization(resPQ.pq);
    // console.timeEnd('[MTProto] req_pq_factorize');

    this.reqDHParams(auth);
  }

  async reqDHParams(auth) {
    auth.newNonce = bufferRandom(32);

    const pqData = new TLSerialization({mtproto: true});
    pqData.storeObject({
      _: 'p_q_inner_data',
      pq: auth.pq,
      p: auth.p,
      q: auth.q,
      nonce: auth.nonce,
      server_nonce: auth.serverNonce,
      new_nonce: auth.newNonce
    }, 'P_Q_inner_data');

    const pqBuffer = pqData.getBuffer();
    const pqHash = await sha1Hash(pqBuffer);
    const dataWithHash = bufferConcat(pqHash, pqBuffer);
    // console.time('[MTProto] req_dh_params_rsa_encrypt');
    const encryptedData = rsaEncrypt(auth.publicKey, dataWithHash);
    // console.timeEnd('[MTProto] req_dh_params_rsa_encrypt');

    const req = this.wrapPlainMethodCall('req_DH_params', {
      nonce: auth.nonce,
      server_nonce: auth.serverNonce,
      p: auth.p,
      q: auth.q,
      public_key_fingerprint: auth.publicKey.fingerprint,
      encrypted_data: encryptedData
    });
    const {message: dhParams} = await this.sendPlainRequest(req);

    if (dhParams._ !== 'server_DH_params_ok') {
      throw new Error('[MTProto] Server_DH_Params response invalid: ' + dhParams._);
    }

    const [hash1, hash2, hash3] = await Promise.all([
      sha1Hash(bufferConcat(auth.newNonce, auth.serverNonce)),
      sha1Hash(bufferConcat(auth.serverNonce, auth.newNonce)),
      sha1Hash(bufferConcat(auth.newNonce, auth.newNonce)),
    ]);

    auth.tmpAesKey = bufferConcat(hash1, hash2.slice(0, 12));
    auth.tmpAesIv = bufferConcat(hash2.slice(12), hash3, auth.newNonce.slice(0, 4));

    // console.time('[MTProto] req_dh_params_aes_decrypt');
    const answerWithHash = bytesToArrayBuffer(await aesIgeDecrypt(dhParams.encrypted_answer, auth.tmpAesKey, auth.tmpAesIv));
    // console.timeEnd('[MTProto] req_dh_params_aes_decrypt');
    const hash = answerWithHash.slice(0, 20);
    const answerWithPadding = answerWithHash.slice(20);

    const response = new TLDeserialization(answerWithPadding, {mtproto: true});
    const serverDhData = response.fetchObject('Server_DH_inner_data');

    if (serverDhData._ !== 'server_DH_inner_data') {
      throw new Error('[MTProto] server_DH_inner_data response invalid: ' + serverDhData._);
    }

    const answerHashPromise = sha1Hash(answerWithPadding.slice(0, response.getOffset()));

    if (!bytesCmp(auth.nonce, serverDhData.nonce)) {
      throw new Error('[MTProto] server_DH_inner_data nonce mismatch')
    }

    if (!bytesCmp(auth.serverNonce, serverDhData.server_nonce)) {
      throw new Error('[MTProto] server_DH_inner_data serverNonce mismatch')
    }

    if (!bytesCmp(hash, await answerHashPromise)) {
      throw new Error('[MTProto] server_DH_inner_data SHA1-hash mismatch');
    }

    if (this.verifyServerDhParams(serverDhData)) {
      auth.g = serverDhData.g;
      auth.dhPrime = serverDhData.dh_prime;
      auth.gA = serverDhData.g_a;
      auth.serverTime = serverDhData.server_time;
      auth.retry = 0;
      this.setClientDhData(auth);
    }
  }

  verifyServerDhParams({g, dh_prime: dhPrime, g_a: gA}) {
    const dhPrimeHex = bytesToHex(dhPrime);
    if (g !== 3 || dhPrimeHex !== 'c71caeb9c6b1c9048e6c522f70f13f73980d40238e3e21c14934d037563d930f48198a0aa7c14058229493d22530f4dbfa336f6e0ac925139543aed44cce7c3720fd51f69458705ac68cd4fe6b6b13abdc9746512969328454f18faf8c595f642477fe96bb2a941d5bcd1d4ac8cc49880708fa9b378e3c4f3a9060bee67cf9a4a4a695811051907e162753b56b0f6b410dba74d8a84b2a14b3144e0ef1284754fd17ed950d5965b4b9dd46582db1178d169c6bc465b0d6ff9ca3928fef5b9ae4e418fc15e83ebea0f87fa9ff5eed70050ded2849f47bf959d956850ce929851f0d8115f635b105ee2e4e15d04b2454bf6f4fadf034b10403119cd8e3b92fcc5b') {
      // The verified value is from https://core.telegram.org/mtproto/security_guidelines
      throw new Error('[MTProto] DH params are not verified: unknown dhPrime');
    }

    const gABigInt = bigBytesInt(gA);
    const dhPrimeBigInt = bigStringInt(dhPrimeHex, 16);

    if (gABigInt.compareTo(bigint(1)) <= 0) {
      throw new Error('[MTProto] DH params are not verified: gA <= 1');
    }

    if (gABigInt.compareTo(dhPrimeBigInt.subtract(bigint(1))) >= 0) {
      throw new Error('[MTProto] DH params are not verified: gA >= dhPrime - 1');
    }

    const twoPow = bigint(1).shiftLeft(2048 - 64); // 2^{2048-64}

    if (gABigInt.compareTo(twoPow) < 0) {
      throw new Error('[MTProto] DH params are not verified: gA < 2^{2048-64}')
    }
    if (gABigInt.compareTo(dhPrimeBigInt.subtract(twoPow)) >= 0) {
      throw new Error('[MTProto] DH params are not verified: gA > dhPrime - 2^{2048-64}')
    }

    return true;
  }

  async setClientDhData(auth) {
    const gBytes = new Uint8Array([auth.g]);

    auth.b = bufferRandom(256);

    // console.time('[MTProto] dh_mod_pow');
    const gB = await bytesPowMod(gBytes, auth.b, auth.dhPrime);
    // console.timeEnd('[MTProto] dh_mod_pow');

    var data = new TLSerialization({mtproto: true});
    data.storeObject({
      _: 'client_DH_inner_data',
      nonce: auth.nonce,
      server_nonce: auth.serverNonce,
      retry_id: [0, auth.retry++],
      g_b: gB
    }, 'Client_DH_Inner_Data');

    const dataHash = await sha1Hash(data.getBuffer());
    const dataWithHash = bufferConcat(dataHash, data.getBuffer());

    // console.time('[MTProto] dh_aes_encrypt');
    const encryptedData = await aesIgeEncrypt(dataWithHash, auth.tmpAesKey, auth.tmpAesIv);
    // console.timeEnd('[MTProto] dh_aes_encrypt');

    const req = this.wrapPlainMethodCall('set_client_DH_params', {
      nonce: auth.nonce,
      server_nonce: auth.serverNonce,
      encrypted_data: encryptedData
    });
    const answerPromise = this.sendPlainRequest(req);

    // console.time('[MTProto] auth key modPow');
    const authKey = new Uint8Array(await bytesPowMod(auth.gA, auth.b, auth.dhPrime));
    // console.timeEnd('[MTProto] auth key modPow');
    const authKeyHash = await sha1Hash(authKey);
    const authKeyAuxHash = authKeyHash.slice(0, 8);
    const authKeyId = authKeyHash.slice(-8);

    const {message: answer} = await answerPromise;

    if (answer._ !== 'dh_gen_ok' && answer._ !== 'dh_gen_retry' && answer._ !== 'dh_gen_fail') {
      throw new Error('[MTProto] Set_client_DH_params_answer response invalid: ' + answer._);
    }

    if (!bytesCmp(auth.nonce, answer.nonce)) {
      throw new Error('[MTProto] Set_client_DH_params_answer nonce mismatch');
    }

    if (!bytesCmp(auth.serverNonce, answer.server_nonce)) {
      throw new Error('[MTProto] Set_client_DH_params_answer server_nonce mismatch');
    }

    switch (answer._) {
      case 'dh_gen_ok': {
        const newNonceHash1 = (await sha1Hash(bufferConcat(auth.newNonce, [1], authKeyAuxHash))).slice(-16);
        if (!bytesCmp(newNonceHash1, answer.new_nonce_hash1)) {
          throw new Error('[MTProto] Set_client_DH_params_answer new_nonce_hash1 mismatch');
        }
        const serverSalt = bytesXor(auth.newNonce.slice(0, 8), auth.serverNonce.slice(0, 8));
        auth.authKey = authKey;
        auth.authKeyId = authKeyId;
        auth.serverSalt = serverSalt;
        this.completeAuth(auth);
      } break;

      case 'dh_gen_retry': {
        console.log('[MTProto] dh_gen_retry');
        const newNonceHash2 = (await sha1Hash(bufferConcat(auth.newNonce, [2], authKeyAuxHash))).slice(-16);
        if (!bytesCmp(newNonceHash2, answer.new_nonce_hash2)) {
          throw new Error('[MTProto] Set_client_DH_params_answer new_nonce_hash2 mismatch');
        }
        this.setClientDhData(auth);
      } break;

      case 'dh_gen_fail': {
        var newNonceHash3 = (await sha1Hash(bufferConcat(auth.newNonce, [3], authKeyAuxHash))).slice(-16);
        if (!bytesCmp(newNonceHash3, answer.new_nonce_hash3)) {
          throw new Error('[MTProto] Set_client_DH_params_answer new_nonce_hash3 mismatch');
        }
        throw new Error('[MTProto] Set_client_DH_params_answer fail');
      }
    }
  }

  completeAuth(auth) {
    console.log('[MTProto] auth completed', auth);
    this.authKey = auth.authKey;
    this.authKeyId = auth.authKeyId;
    this.serverSalt = auth.serverSalt;
    this.timeOffset = auth.serverTime - Math.floor(Date.now() / 1000);
    Storage.set(this.getAuthStorageKey(), {
      id: bytesToHex(auth.authKeyId),
      key: bytesToHex(auth.authKey),
      salt: bytesToHex(auth.serverSalt),
      timeOffset: this.timeOffset,
    });
    this.onAuthReady();
  }

  onAuthReady() {
    this.initPingLoop();
    if (this.options.onConnectionReady) {
      this.options.onConnectionReady();
      delete this.options.onConnectionReady;
    }
    if (this.connectionDeferred) {
      this.connectionDeferred.resolve();
      delete this.connectionDeferred;
    }
  }

  resetAuthKey() {
    console.log('[MTProto] resetting auth');
    this.authKey = 0;
    this.authKeyId = 0;
    this.serverSalt = 0;
    this.timeOffset = 0;
    this.sessionId = 0;
    this.seqNo = 0;
    Storage.remove(this.getAuthStorageKey());
  }

  updateServerSalt(longSalt) {
    const salt = longToBytes(longSalt);
    this.serverSalt = salt;
    const authData = Storage.get(this.getAuthStorageKey());
    authData.salt = bytesToHex(salt);
    Storage.set(this.getAuthStorageKey(), authData);
  }

  saveApiAuth() {
    this.apiAuth = 1;
    const authData = Storage.get(this.getAuthStorageKey());
    authData.apiAuth = 1;
    Storage.set(this.getAuthStorageKey(), authData);
  }

  hasApiAuth() {
    return !!this.apiAuth;
  }

  getAuthStorageKey() {
    return 'mtproto_auth_dc' + this.dcId;
  }

  chooseDC() {
    let dcId = Storage.get('mtproto_pref_dc');
    if (!dcId) {
      dcId = intRand(1, 5);
      Storage.set('mtproto_pref_dc', dcId);
    }
    return dcId;
  }

  migrateDC(dcId) {
    this.resetAuthKey();
    this.dcId = dcId;
    Storage.set('mtproto_pref_dc', dcId);
    this.transport.migrateDC(dcId);
    this.connectionDeferred = getDeferred();
    return this.connectionDeferred.promise;
  }

  initPingLoop() {
    let pingId = 0;
    this.pingInterval = setInterval(() => {
      this.wrapMethodCallMessage('ping_delay_disconnect', {
        ping_id: ++pingId,
        disconnect_delay: 90
      });
    }, 60000);
  }

  ping() {
    const ping_id = longFromInts(...new Uint32Array(bufferRandom(8)));
    const msg = this.wrapMethodCallMessage('ping', {ping_id, });
    this.sendRequest(msg);
  }

  isContentRelatedConstructor(constructor) {
    const notRelated = [
      'rpc_drop_answer', 'rpc_answer_unknown', 'rpc_answer_dropped_running', 'rpc_answer_dropped',
      'get_future_salts', 'future_salt', 'future_salts', 'bad_server_salt',
      'ping', 'pong', 'ping_delay_disconnect', 'destroy_session', 'destroy_session_ok', 'destroy_session_none',
      'msg_container', 'msg_copy', 'gzip_packed', 'http_wait', 'msgs_ack', 'bad_msg_notification',
      'msgs_state_req', 'msgs_state_info', 'msgs_all_info',
      'msg_detailed_info', 'msg_new_detailed_info', 'msg_resend_req', 'msg_resend_ans_req'
    ];
    return !notRelated.includes(constructor);
  }

  getSerializer({api = true, upload = false}) {
    return new TLSerialization({
      mtproto: !api,
      startMaxLength: upload ? 512 * 1024 : void(0)
    });
  }

  getSchema() {
    return Schema;
  }

  destroy() {
    clearInterval(this.pingInterval);
    clearTimeout(this.pendingMessagesRequestTimeout);
    this.transport.destroy();
  }
}

class Storage {
  static get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  static set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
}

function getDeferred() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

export {
  MTProto,
  Storage,
  getDeferred
}
