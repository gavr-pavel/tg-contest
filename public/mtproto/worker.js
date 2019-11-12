// import {aesIgeDecrypt} from './crypto.js';

addEventListener('message', (event) => {
  const taskId = event.data.taskId;
  let result = false;

  switch (event.data.task) {
    case 'aesIgeDecrypt': {
      result = aesIgeDecrypt(event.data.cipher, event.data.key, event.data.iv);
    } break;
  }

  postMessage({taskId, result});
});

setTimeout(() => {
  postMessage('ready');
}, 0);
