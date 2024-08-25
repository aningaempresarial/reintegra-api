import { validaSenha } from "../usuario/valida-senha.js";
import { query } from "../../db/query.js";
import jwt from 'jsonwebtoken';
const secret = `${process.env.API_SECRET}`;

export async function login(usuario, senha, tipoEntidade) {
    try {
        const senhaValidade = await validaSenha(usuario, senha);

        if (senhaValidade) {

            const resultado = await query(`UPDATE tbUsuario SET ultimoLogin = NOW(), tentativasLogin = 0 WHERE usuario = '${usuario}'`)

            const token = jwt.sign(
                {
                    usuario: usuario,
                    entidade: tipoEntidade
                },
                secret,
                {
                    expiresIn: '60d',
                }
            );


            return [true, token];

        } else {
            const resultado = await query(`UPDATE tbUsuario SET tentativasLogin = COALESCE(tentativasLogin, 0) + 1 WHERE usuario = '${usuario}'`)
            return [false]
        }

    } catch (erro) {
        return [false];
    }
}
