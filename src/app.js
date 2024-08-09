// App
import express from 'express';

// routes
import indexRoutes from './routes/indexRoutes.js';
import consola from 'consola';
import { createPool } from './database.js';

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
        this.app.use('/', indexRoutes)
    }

}
