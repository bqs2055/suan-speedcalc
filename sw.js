/* 速算练习 PWA · Service Worker
   策略：stale-while-revalidate（先给缓存，后台顺手更新）
   —— 打开永远秒开，且装完之后完全离线可用；下次启动拿到新版本。
   改了 速算练习.html 之后记得把 build_pwa.py 里的 CACHE_VERSION +1。 */
var CACHE = 'suan-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* 单个失败不该让整个安装挂掉（比如图标还没上传完） */
      return Promise.all(ASSETS.map(function(u){
        return c.add(u).catch(function(){ return null; });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  /* 只管同源，别去动别人的请求 */
  try {
    if (new URL(req.url).origin !== self.location.origin) return;
  } catch (err) { return; }

  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(resp){
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return resp;
      }).catch(function(){
        /* 离线且缓存也没有 —— 兜底回首页，至少不是白屏 */
        return caches.match('./index.html');
      });
      return hit || net;
    })
  );
});
