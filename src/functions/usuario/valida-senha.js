import bcrypt from 'bcryptjs';
import { query } from "../../db/query.js";

export async function validaSenha(usuario, senha, hash) {
    try {

        const resultado = await query(`SELECT senhaUsuario, statusEntidade FROM tbUsuario WHERE usuario = '${usuario}'`);

        if (resultado.length === 0) {
            return false;
        }
        const hash = resultado[0].senhaUsuario;
        const status = resultado[0].statusEntidade;

        const isValid = await bcrypt.compare(senha, hash);

        if (!isValid) {
            return false;
        }

        return status == 'ativo';
    } catch (erro) {
        return false;
    }

}
