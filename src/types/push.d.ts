// Push API type augmentation
// The DOM lib provides PushManager but some TS versions
// don't declare it on ServiceWorkerRegistration
interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
