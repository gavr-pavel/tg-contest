self.addEventListener('install', () => {
  console.log('sw installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('sw activated');
  event.waitUntil(
      self.clients.claim()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'init') {
    initPort(event.ports[0]);
  }
});

let port;
function initPort(p) {
  port = p;
  port.onmessage = (event) => {
    const {data} = event;
    if (data.type === 'taskResult') {
      const {taskId, result} = data;
      const resolve = tasks.get(taskId);
      resolve(result);
      tasks.delete(taskId);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const match = req.url.match(/document(\d+)_(\d+)_(\d+)\.(mp3|mp4)$/);
  if (match) {
    // console.log(req, Array.from(req.headers));
    const [, messageId, documentId, size, ext] = match;
    const range = req.headers.get('range');
    let [, start, end] = range.match(/bytes=(\d+)-(\d*)/);
    start = +start;
    end = +end || Math.min(size, start + 1024 * 256) - 1;
    const limit = end - start + 1;
    const stream = loadDocumentRange(messageId, documentId, start, limit);
    const response = new Response(stream, {
      status: 206,
      headers: {
        'Content-Type': ext === 'mp4' ? 'video/mp4' : 'audio/mp3',
        'Content-Length': limit,
        'Content-Range': `bytes ${start}-${end}/${size}`
      }
    });
    return event.respondWith(response);
  }
  // if (/bg\.jpg\?blurred$/.test(event.request.url)) {
  //   event.respondWith(
  //       caches.match(event.request).then((response) => {
  //         return response || fetch(event.request);
  //       })
  //   );
  // }
});

let taskId = 0;
const tasks = new Map();

function loadDocumentRange(messageId, documentId, offset, limit) {
  function loadPart(offset, limit) {
    const message = {
      taskId: ++taskId,
      task: 'loadDocumentRange',
      messageId,
      documentId,
      offset,
      limit
    };
    // console.log('LOADPART', message);
    return new Promise((resolve) => {
      tasks.set(message.taskId, resolve);
      port.postMessage(message);
    });
  }

  return new ReadableStream({
    start(controller) {
      // let _offset = offset;
      // const chunkSize = 256 * 1024;
      // const loop = async (offset) => {
      //   try {
      //     const {bytes} = await loadPart(offset, chunkSize)
      //     controller.enqueue(bytes);
      //   } catch(e) {
      //     controller.close();
      //   }
      //
      loadPart(offset, limit)
          .then(({bytes}) => controller.enqueue(bytes))
          .finally(() => controller.close());
      // };
      // loop(offset);
    }
  });
}
