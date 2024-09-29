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

    })


export default router;
