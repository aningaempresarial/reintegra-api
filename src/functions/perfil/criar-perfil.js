
import { query } from "../../db/query.js";
import { criarPastaUsuario } from "./criar-pasta-perfil.js";

export function criarPerfil(id, tipoEntidade) {

    return new Promise(async (resolve, reject) => {

        try {
            const res = await query(`INSERT INTO tbPerfil (idUsuario) VALUES (${id})`);

            const idPerfil = res.insertId;

            const fotos = criarPastaUsuario(idPerfil, tipoEntidade);

            if (!fotos[0]) {
                reject('Erro ao copiar foto.')
            } else {

                await query(`UPDATE tbPerfil SET fotoPerfil	= '${fotos[0]}', bannerPerfil = '${fotos[1]}' WHERE idPerfil = ${idPerfil}`);
                resolve([true, idPerfil]);
            }

        } catch (error) {
            reject([false]);
        }

    })


}
