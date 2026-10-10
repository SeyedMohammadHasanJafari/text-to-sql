import { createApp } from '../server/src/app.js';

let appInstance = null;

function getApp() {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export default function handler(req, res) {
  const app = getApp();
  return app(req, res);
}
