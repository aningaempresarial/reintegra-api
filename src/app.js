// App
import express from 'express';
import cors from 'cors';
import consola from 'consola';

// DB
import { createPool } from './db/index.js';

// routes
import indexRoutes from './routes/index.routes.js';
import empresaRoutes from './routes/empresa.routes.js';
import adminUsuarioRoutes from './routes/admin-usuario.routes.js';
import exDetentoRoutes from './routes/ex-detento.routes.js';
import userRoutes from './routes/user.routes.js';
import sspRoutes from './routes/ssp.routes.js';


export class App {

    app;

    constructor() {
        this.app = express();
        this.cors();
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

    cors() {
        const corsOptions = {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        };

        this.app.use(cors(corsOptions));
    }

    routes() {
        this.app.use('/ssp', sspRoutes);

        this.app.use('/', indexRoutes);
        this.app.use('/user', userRoutes);
        this.app.use('/empresa', empresaRoutes);
        this.app.use('/admin/usuario', adminUsuarioRoutes);
        this.app.use('/exDetento', exDetentoRoutes);
    }

}
