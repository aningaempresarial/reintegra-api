import { query } from "../../db/query.js";
import { checkUsernameExists } from "../utils/verifica-usuario.js";

export function generateUniqueUsername(name) {
    return new Promise(async (resolve, reject) => {
        let baseUsername = name.toLowerCase().replace(/\s+/g, '');
        let username = baseUsername;
        let counter = 1;

        try {
            while (await checkUsernameExists(username)) {
                username = `${baseUsername}${counter}`;
                counter++;
            }
            resolve(username);
        } catch (error) {
            reject(error);
        }
    });
}



