import {TLSerialization, TLDeserialization, Schema} from './tl.js';
import MTProto from './mtproto.js';

const API_ID = 884322;
const API_HASH = '77498db3367014eec55b317377f52779';
const APP_VERSION = '0.0.1';

class Api {
  connectionInited = false;

  config = false;

  constructor() {
    this.mtproto = new MTProto({
      onConnectionReady: () => this.init()
    });
  }

  async init() {
    this.config = await this.callMethod('help.getConfig');
  }

  wrapCall(method, params) {
    const serializer = new TLSerialization();

    if (!this.connectionInited) {
      serializer.storeInt(0xda9b0d0d, 'invokeWithLayer');
      serializer.storeInt(Schema.API.layer, 'layer');
      serializer.storeInt(0xc7481da6, 'initConnection');
      serializer.storeInt(API_ID, 'api_id');
      serializer.storeString(getBrowser(), 'device_model');
      serializer.storeString(getOSName(), 'system_version');
      serializer.storeString(APP_VERSION, 'app_version');
      serializer.storeString(getSystemLang(), 'system_lang_code');
      serializer.storeString('', 'lang_pack');
      serializer.storeString(getSystemLang(), 'lang_code');
      this.connectionInited = true;
    }

    const resultType = serializer.storeMethod(method, params);

    const message = this.mtproto.prepareMessageFromBuffer(serializer.getBuffer(), {api: true, resultType, source: method});

    // this.mtproto.pushMessage(message);

    return message;
  }

  async callMethod(method, params = {}) {
    console.log('[API] calling method', {method, params});
    const message = this.wrapCall(method, params);
    const result = await this.mtproto.sendRequest(message);
    if (result._ === 'rpc_error') {
      if (result.error_code === 303) {
        await this.migrateDC(this.getMigrateErrorDcId(result.error_message));
        return this.callMethod(method, params);
      }
      return Promise.reject(result);
    }
    return result;
  }

  migrateDC(dcId) {
    this.connectionInited = false;
    return this.mtproto.migrateDC(dcId);
  }

  getMigrateErrorDcId(errorMessage) {
    return +errorMessage.match(/\d+$/)[0];
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

export {Api};
