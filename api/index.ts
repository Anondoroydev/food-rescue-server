import app, { initApp } from '../src/app';

export default async function handler(req: any, res: any) {
  try {
    await initApp();
  } catch (_) {}
  return app(req, res);
}
