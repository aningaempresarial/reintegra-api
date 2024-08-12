import { app } from "../server.js";

export async function query(sql) {
    const pool = app.app.locals.pool;

    return new Promise((resolve, reject) => {
        pool.query(sql, (err, res) => {
            if (err) {
                console.log(err);
                return reject(err);
            }
            resolve(res);
        });
    });
}
