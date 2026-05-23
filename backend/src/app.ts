import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerCofRoutes } from './routes/cof.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerScenarioRoutes } from './routes/scenarios.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerTodoRoutes } from './routes/todo.js';
import { registerUserRoutes } from './routes/users.js';
import { registerWorldRoutes } from './routes/world.js';
import { registerStaticFrontend } from './services/static-frontend.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  app.log.info(
    {
      llmProvider: env.LLM_PROVIDER,
      anthropicModel:
        env.LLM_PROVIDER === 'anthropic' ? env.ANTHROPIC_MODEL : undefined,
    },
    'LLM provider configured.',
  );

  await app.register(cors, {
    origin: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await registerHealthRoutes(app);
  await registerCofRoutes(app);
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerScenarioRoutes(app);
  await registerAdminRoutes(app);
  await registerChatRoutes(app);
  await registerSessionRoutes(app);
  await registerTodoRoutes(app);
  await registerWorldRoutes(app);
  await registerStaticFrontend(app);

  return app;
}
