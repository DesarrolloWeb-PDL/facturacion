import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

buildApp()
  .then((app) =>
    app.listen({ port, host }).then(() => {
      app.log.info(`API escuchando en http://${host}:${port}`);
    }),
  )
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
