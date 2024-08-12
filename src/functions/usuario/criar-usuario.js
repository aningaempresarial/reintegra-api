import { generateUniqueUsername } from "./criar-username.js"
import bcrypt from 'bcryptjs';
import { query } from "../../db/query.js";
import { geraHash } from "./gera-hash.js";

export function criarUsuario(nome, senha, tipo) {
    // a função retorna um vetor. a primeira posição é "true" ou "false" (true é se o usuario for criado com êxito)
    // se for "true", a segunda posição do vetor é o ID

    // nome é o primeiro nome da empresa, ong, escola ou ex-detento

    // tipo 0 = empresa
    // tipo 1 = ong
    // tipo 2 = escola
    // tipo 3 = ex-detento
    // tipo 4 = admin (tem uma função só pra ele criar conta, tipo 4 nao é aceito)

    return new Promise(async (resolve, reject) => {
        const entidades = ['empresa', 'ong', 'escola', 'ex-detento'];

        if (tipo >= 4) {
            return resolve([false]);
        }
        const tipoEntidade = entidades[tipo]

        try {
            const username = await generateUniqueUsername(nome);
            const hash = await geraHash(senha);

            try {
                const insertResult = await query(
                    `INSERT INTO tbUsuario (usuario, senhaUsuario, dataCriacao, dataModificacao, tipoEntidade, statusEntidade)
                        VALUES ('${username}', '${hash}', NOW(), NOW(), '${tipoEntidade}', 'ativo')`,
                    [username, hash, tipo]
                );

                const userId = insertResult.insertId;

                resolve([true, userId]);
            } catch (error) {
                reject(error);
            }
        } catch (error) {
            reject(error);
        }
    });
}
