(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],{

/***/ "./src/js/api/password_manager.js":
/*!****************************************!*\
  !*** ./src/js/api/password_manager.js ***!
  \****************************************/
/*! exports provided: getInputPasswordSRP */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"getInputPasswordSRP\", function() { return getInputPasswordSRP; });\n/* harmony import */ var _mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../mtproto/bin.js */ \"./src/js/mtproto/bin.js\");\n/* harmony import */ var _mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../mtproto/crypto.js */ \"./src/js/mtproto/crypto.js\");\n\n\n\nasync function getInputPasswordSRP(password, accountPassword) {\n  return await calcInputPassword(password, accountPassword);\n\n  async function SH(data, salt) {\n    return await Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bufferConcat\"])(salt, data, salt));\n  }\n\n  async function calcPasswordHash(password, salt1, salt2) {\n    const buf = await SH((await SH(password, salt1)), salt2);\n    const key = await crypto.subtle.importKey('raw', buf, 'PBKDF2', false, ['deriveBits']);\n    const hash = await crypto.subtle.deriveBits({\n      name: 'PBKDF2',\n      hash: 'SHA-512',\n      salt: salt1,\n      iterations: 100000\n    }, key, 512);\n    return SH(hash, salt2);\n  }\n\n  async function calcInputPassword(password, srpParams) {\n    const {\n      srp_B: B,\n      srp_id\n    } = srpParams;\n    const {\n      p,\n      salt1,\n      salt2\n    } = srpParams.current_algo;\n    const g = new Uint8Array([srpParams.current_algo.g]);\n    const p_bn = Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(p);\n    const B_bn = Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(B);\n    const zero_bn = Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigint\"])(0);\n    const g_padded = new Uint8Array(256);\n    g_padded.set(g);\n    g_padded.reverse();\n    const a = new Uint8Array(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bufferRandom\"])(256));\n    const a_bn = Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(a);\n    const A = await Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bytesPowMod\"])(g, a, p);\n    const [x, u, k] = await Promise.all([calcPasswordHash(new TextEncoder().encode(password), salt1, salt2), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bufferConcat\"])(A, B)), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bufferConcat\"])(p, g_padded))]);\n    const v = await Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bytesPowMod\"])(g, x, p);\n    const kv_bn = Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(k).multiply(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(v)).mod(p_bn);\n    let t_bn = B_bn.subtract(kv_bn).mod(p_bn);\n\n    if (t_bn.compareTo(zero_bn) < 0) {\n      t_bn = t_bn.add(p_bn);\n    }\n\n    const exp = a_bn.add(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(u).multiply(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bigBytesInt\"])(x))).toByteArray();\n    const S = await Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bytesPowMod\"])(t_bn.toByteArray(), exp, p);\n    const S_padded = new Uint8Array(256);\n    S_padded.set(S);\n    const [K, h1, h2, hs1, hs2] = await Promise.all([Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(S_padded), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(p), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(g_padded), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(salt1), Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(salt2)]);\n    const M1 = await Object(_mtproto_crypto_js__WEBPACK_IMPORTED_MODULE_1__[\"sha256Hash\"])(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bufferConcat\"])(Object(_mtproto_bin_js__WEBPACK_IMPORTED_MODULE_0__[\"bytesXor\"])(h1, h2), hs1, hs2, A, B, K));\n    return {\n      srp_id,\n      A,\n      M1\n    };\n  }\n}\n\n\n\n//# sourceURL=webpack:///./src/js/api/password_manager.js?");

/***/ })

}]);