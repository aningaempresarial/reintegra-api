// App
import express from 'express';

import consola from 'consola';

// DB
import { createPool } from './db/index.js';

// routes
import indexRoutes from './routes/index.routes.js';
import empresaRoutes from './routes/empresa.routes.js';

export class App {

    app;

    constructor() {
        this.app = express();
        this.routes();
    }

    start() {
        this.startDatabase();
        const PORT = process.env.API_PORT;
        this.app.listen(PORT, () => {
            consola.success(`Iniciando em http://localhost:${PORT}`);
        });
    }

    startDatabase() {
        const pool = createPool();
        this.app.locals.pool = pool;
    }

    routes() {
        this.app.use('/', indexRoutes);
        this.app.use('/empresa', empresaRoutes);
    }

}
