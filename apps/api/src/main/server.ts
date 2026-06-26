import Fastify from 'fastify';
import cors from '@fastify/cors';

// Bootstrap do servidor. A injeção de dependência (repositórios →
// use-cases → rotas) é montada aqui na Etapa 4.
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({
  status: 'ok',
  service: 'sistema-api',
  fase: 1,
}));

const port = Number(process.env.API_PORT ?? 3333);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`API ouvindo em http://localhost:${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
