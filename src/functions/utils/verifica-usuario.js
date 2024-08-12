import { query } from "../../db/query.js";

export async function checkUsernameExists(username) {
    const result = await query(`SELECT COUNT(*) AS count FROM tbUsuario WHERE usuario = '${username}'`);
    return result[0].count > 0;
}
