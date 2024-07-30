// App
import express from 'express';

// routes
import indexRoutes from './routes/indexRoutes.js';
import abacate from './routes/admRoutes.js'

export default class App {

    app;

    constructor() {
        this.app = express();
        this.routes();
    }

    start() {
        //const PORT = process.env.PORT;
        const PORT = 8080
        this.app.listen(PORT, () => {
            console.log(`Iniciando na porta: ${PORT}`);
        });
    }

    routes() {
        this.app.use('/', indexRoutes)
        this.app.use('/adm', abacate)
    }

}
