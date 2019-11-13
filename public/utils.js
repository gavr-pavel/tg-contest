export function getOSName() {
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

export function getBrowser() {
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

export function getSystemLang() {
  return navigator.language || 'en';
}

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function importTemplate(id) {
  const template = $('#template_' + id);
  return document.importNode(template.content, true);
}

export function getLabeledElements(container) {
  const result = {
    container
  };
  if (container.childElementCount) {
    for (const child of container.children) {
      const label = child.dataset.jsLabel;
      if (label) {
        result[child.dataset.jsLabel] = child;
      }
      Object.assign(result, getLabeledElements(child, result));
    }
  }
  return result;
}

export function buildHtmlElement(htmlStr) {
  const tmp = document.createElement('div');
  tmp.innerHTML = htmlStr;
  return tmp.firstElementChild;
}

export function cmpStrNum(a, b) {
  const diff = a.length - b.length;
  if (diff !== 0) {
    return diff < 0 ? -1 : 1;
  }
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
}