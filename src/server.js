import { App } from './app.js';

export const app = new App();

export const run = async() => {
    app.start();
}
