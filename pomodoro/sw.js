const CACHE = 'pomodoro-v1';
const STATIC = ['/', '/index.html', '/src/app.js',
  '/src/core/EventBus.js', '/src/core/StateMachine.js', '/src/core/PomodoroTimer.js',
  '/src/detection/PresenceChecker.js', '/src/detection/PostureAnalyzer.js', '/src/detection/GestureRecognizer.js',
  '/src/health/RemindScheduler.js', '/src/health/RestValidator.js',
  '/src/ui/TimerDisplay.js', '/src/ui/PosturePanel.js', '/src/ui/SkeletonCanvas.js',
  '/src/ui/RestGuide.js', '/src/ui/ToastNotifier.js',
  '/src/storage/Database.js', '/src/storage/StatsPersister.js',
  '/src/utils/AudioPlayer.js', '/src/utils/Geometry.js', '/src/utils/Throttle.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // CDN 资源不缓存
  if (e.request.url.includes('cdn.jsdelivr.net') ||
      e.request.url.includes('storage.googleapis.com')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
