import { requireFirebaseUser } from './_firebaseAdmin.mjs';
import { makePptx, makeDocx } from './_artifactBuilders.mjs';

const sanitizeFile = (value, fallback) => (String(value || fallback).replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '-').replace(/-+/g,'-').slice(0,80) || fallback);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    await requireFirebaseUser(req);
    const type = String(req.body?.type || 'report');
    const title = String(req.body?.title || 'Flow Space AI').slice(0,200);
    let buffer; let contentType; let extension;
    if (type === 'presentation') {
      buffer = makePptx(Array.isArray(req.body?.slides) ? req.body.slides : []);
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; extension = 'pptx';
    } else if (type === 'report') {
      buffer = makeDocx({ title, sections: Array.isArray(req.body?.sections) ? req.body.sections : [] });
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; extension = 'docx';
    } else if (type === 'social_post') {
      const caption = String(req.body?.caption || '').slice(0,20000);
      const hashtags = Array.isArray(req.body?.hashtags) ? req.body.hashtags.map(String).slice(0,30).join(' ') : '';
      buffer = Buffer.from(`${caption}${hashtags ? `\n\n${hashtags}` : ''}`, 'utf8'); contentType = 'text/plain; charset=utf-8'; extension = 'txt';
    } else {
      return res.status(400).json({ error: 'Unsupported artifact type.' });
    }
    const filename = `${sanitizeFile(title, 'flow-space-ai')}.${extension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Artifact generation failed.' });
  }
}

