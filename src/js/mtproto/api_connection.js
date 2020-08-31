import {App} from '../app.js';
import {getDeferred, Emitter} from '../utils.js';

class ApiConnection {
  connectionReady = false;
  connectionInited = false;

  emitter = new Emitter();

  constructor(options = {}) {
    this.options = options;
    this.connectionDefered = getDeferred();

    import('./mtproto.js').then(({MTProto}) => {
      this.updateConnectionState('connecting');
      this.mtproto = new MTProto({
        dcId: options.dcId,
        onConnectionReady: () => {
          this.init();
          this.updateConnectionState('connected');
        },
        onUpdates: this.onUpdates,
      });
    });
  }

  exportAuthorization(dcId) {
    return ApiClient.callMethod('auth.exportAuthorization', {dc_id: dcId});
  }

  async importAuthorization({id, bytes}) {
    await this.callMethod('auth.importAuthorization', {id, bytes}, true);
  }

  updateConnectionState(state) {
    this.emitter.trigger('updateConnectionState', state);
  }

  onUpdates = (object) => {
    this.emitter.trigger('updates', object);
  };

  async init() {
    if (this.options.upload && !this.mtproto.hasApiAuth()) {
      try {
        const authorization = await ApiClient.exportAuthorization(this.options.dcId);
        await this.importAuthorization(authorization);
      } catch (e) {
        this.connectionDefered.reject(e);
        return;
      }
    }
    this.connectionReady = true;
    this.connectionDefered.resolve();
  }

  destroy() {
    this.mtproto.destroy();
  }

  wrapCall(method, params) {
    const serializer = this.mtproto.getSerializer({api: true, upload: this.options.upload});

    if (!this.connectionInited) {
      const Schema = this.mtproto.getSchema();
      serializer.storeInt(0xda9b0d0d, 'invokeWithLayer');
      serializer.storeInt(Schema.API.layer, 'layer');
      serializer.storeInt(0xc7481da6, 'initConnection');
      serializer.storeInt(App.API_ID, 'api_id');
      serializer.storeString(getBrowser(), 'device_model');
      serializer.storeString(getOSName(), 'system_version');
      serializer.storeString(App.APP_VERSION, 'app_version');
      serializer.storeString('en', 'system_lang_code');
      serializer.storeString('', 'lang_pack');
      serializer.storeString('en', 'lang_code');
      this.connectionInited = true;
    }

    const options = {api: true, source: method};
    options.resultType = serializer.storeMethod(method, params);

    return this.mtproto.prepareMessageFromBuffer(serializer.getBuffer(), options);
  }

  async callMethod(method, params = {}, force = false) {
    if (!this.connectionReady && !force) {
      await this.connectionDefered.promise;
    }
    // console.log('[API] calling method', {method, params});
    const message = this.wrapCall(method, params);
    const result = await this.mtproto.pushMessage(message);
    if (result._ === 'rpc_error') {
      if (result.error_code === 303) {
        await this.migrateDC(this.getMigrateErrorDcId(result.error_message));
        return this.callMethod(method, params);
      } else if (result.error_message === 'AUTH_KEY_UNREGISTERED') {
        if (!this.options.upload) {
          App.logOutDone();
        }
      }
      console.trace(result);
      return Promise.reject(result);
    } else if (result._ === 'auth.authorization') {
      this.mtproto.saveApiAuth();
    }
    return result;
  }

  getDcId() {
    return this.mtproto.dcId;
  }

  migrateDC(dcId) {
    this.connectionInited = false;
    return this.mtproto.migrateDC(dcId);
  }

  getMigrateErrorDcId(errorMessage) {
    return +errorMessage.match(/\d+$/)[0];
  }

  getServerTimeOffset() {
    return this.mtproto.timeOffset;
  }

  getServerTimeNow() {
    return Math.floor(Date.now() / 1000) + this.getServerTimeOffset();
  }
}

function getSystemLang() {
  return navigator.language || 'en';
}

function getBrowser() {
  const isIE = !!document.documentMode;
  const isEdge = !isIE && !!window.StyleMedia;
  if (navigator.userAgent.includes('Chrome') && !isEdge) {
    return 'Chrome';
  }
  if (navigator.userAgent.includes('Safari') && !isEdge) {
    return 'Safari';
  }
  if (navigator.userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  if (navigator.userAgent.includes('MSIE') || isIE) {
    //IF IE > 10
    return 'IE';
  }
  if (isEdge) {
    return 'Edge';
  }
  return 'Unknown';
}

function getOSName() {
  if (window.navigator.userAgent.includes('Windows NT 10.0')) {
    return 'Windows 10';
  }
  if (window.navigator.userAgent.includes('Windows NT 6.2')) {
    return 'Windows 8';
  }
  if (window.navigator.userAgent.includes('Windows NT 6.1')) {
    return 'Windows 7';
  }
  if (window.navigator.userAgent.includes('Windows NT 6.0')) {
    return 'Windows Vista';
  }
  if (window.navigator.userAgent.includes('Windows NT 5.1')) {
    return 'Windows XP';
  }
  if (window.navigator.userAgent.includes('Windows NT 5.0')) {
    return 'Windows 2000';
  }
  if (window.navigator.userAgent.includes('Mac')) {
    return 'Mac/iOS';
  }
  if (window.navigator.userAgent.includes('X11')) {
    return 'UNIX';
  }
  if (window.navigator.userAgent.includes('Linux')) {
    return 'Linux';
  }
  return 'Unknown';
}

export {ApiConnection};
