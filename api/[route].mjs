import aiAudit from '../server/api-bundled/ai-audit.mjs';
import businessAgent from '../server/api-bundled/business-agent.mjs';
import businessMetrics from '../server/api-bundled/business-metrics.mjs';
import images from '../server/api-bundled/images.mjs';

const handlers = {
  'ai-audit': aiAudit,
  'business-agent': businessAgent,
  'business-metrics': businessMetrics,
  images,
};

export default async function handler(req, res) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  const routeHandler = handlers[route];

  if (!routeHandler) {
    return res.status(404).json({ error: 'API route not found' });
  }

  return routeHandler(req, res);
}
