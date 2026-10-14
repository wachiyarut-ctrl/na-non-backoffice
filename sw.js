/* ณ.นนท์ — service worker (ทำให้ติดตั้งเป็นแอปได้ + เปิดได้แม้เน็ตหลุดชั่วคราว)
   หลักการ:
   - หน้าแอป (index.html): ดึงจากเน็ตก่อนเสมอ → ได้เวอร์ชันล่าสุดทันทีที่อัปโหลดไฟล์ใหม่ขึ้น GitHub
     ถ้าไม่มีเน็ต ค่อยใช้ฉบับที่เก็บไว้ในเครื่อง
   - ไม่ยุ่งกับการเชื่อมต่อ Google Sheets / Apps Script / Google Drive เลย (ข้อมูลไม่ถูกเก็บแคชที่นี่)
   ถ้าแก้ไฟล์นี้ ให้เปลี่ยนเลข CACHE_VERSION ด้วย */
const CACHE_VERSION = 'nanon-v8';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './icon-coin-192.png', './icon-coin-512.png', './icon-coin-180.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return Promise.all(SHELL.map(function(url){ return cache.add(url).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // Google Sheets, Drive, ฟอนต์ ฯลฯ ปล่อยผ่านตามปกติ

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if(isPage){
    event.respondWith(
      fetch(req).then(function(res){
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(r){ return r || caches.match('./'); });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(res){
        if(res.ok){ const copy = res.clone(); caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      });
    })
  );
});
