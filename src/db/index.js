import consola from 'consola';
import mysql from 'mysql2';

export const createPool = () => {

    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        return pool;

    } catch(err) {
        console.error(err)
    }

}

