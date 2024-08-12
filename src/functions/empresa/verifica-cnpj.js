import { query } from "../../db/query.js";

export async function verificaCnpjExiste(cnpj) {
    const result = await query(`SELECT COUNT(*) AS count FROM tbEmpresa WHERE cnpjEmpresa = '${cnpj}'`);
    return result[0].count > 0;
}
