import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';
import { getUser } from "../functions/auth/login.js";

const router = Router();
const upload = multer();

router.route('/getdata')
    .post(upload.none(), async (req, res) => {

        const { token } = req.body || {}

        if (typeof token == 'undefined') {
            return res.status(400).json({ erro: "`token` não é um campo válido." });
        }


        try {
            const user = await getUser(token);

            if (user[0]) {
                const usuario = user[1];
                const consulta = await query(`SELECT emailUsuario, usuario, nomeAdmin, fotoPerfil, bannerPerfil, descricaoPerfil FROM tbAdmin JOIN tbUsuario ON tbAdmin.idUsuario = tbUsuario.idUsuario JOIN tbPerfil ON tbUsuario.idUsuario = tbPerfil.idUsuario WHERE tbUsuario.idUsuario = ${usuario.idUsuario}`);
                return res.json(consulta[0]);
            } else {
                return res.status(404).json({ erro: 'Usuario não encontrado.' })
            }

        } catch (erro) {
            res.status(500).json({
                erro: "Erro ao processar a solicitação.",
                detalhe: erro.message,
            });
        }

    });

router.route("/stats")
    .get(async (req, res) => {
        try {
            const stats = await query(`
                SELECT
                    COUNT(tbUsuario.idUsuario) AS totalUsuarios,
                    COUNT(CASE WHEN tbUsuario.tipoEntidade = 'empresa' THEN tbUsuario.idUsuario END) AS totalEmpresas,
                    COUNT(CASE WHEN tbUsuario.tipoEntidade = 'ex-detento' THEN tbUsuario.idUsuario END) AS totalExDetentos,
                    COUNT(CASE WHEN tbPostagem.categoriaPostagem = 'emprego' THEN tbPostagem.idPostagem END) AS totalVagas
                FROM
                    tbUsuario
                LEFT JOIN
                    tbPostagem ON tbUsuario.idUsuario = tbPostagem.idUsuario
            `);
    
            if (stats.length === 0) {
                return res.status(404).json({
                    erro: "Nenhum dado encontrado.",
                });
            }
    
            return res.json(stats[0]);
        } catch (erro) {
            console.error(erro);
            res.status(500).json({
                erro: "Erro ao processar a solicitação.",
                detalhe: erro.message,
            });
        }
    });    

export default router;
