import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from '../db/query.js';
import { v4 as uuidv4 } from 'uuid';
import { getUser } from "../functions/auth/login.js";

const router = Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), '/public', 'posts'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });


router.route('/all/:usuario')
    .get(async (req, res) => {
        const usuario = req.params.usuario || undefined;

        if (typeof usuario == 'undefined') {
            return res.status(400).json({ erro: "`usuario` não é um campo válido." });
        }

        try {
            const respostaPost = await query(`
                SELECT
                    tbPostagem.idPostagem,
                    tbPostagem.tituloPostagem,
                    tbPostagem.conteudoPostagem,
                    DATE_FORMAT(tbPostagem.dataCriacao, '%d/%m/%Y') AS dataCriacao,
                    DATE_FORMAT(tbPostagem.dataModificacao, '%d/%m/%Y') AS dataModificacao,
                    DATE_FORMAT(tbPostagem.dataFim, '%d/%m/%Y') AS dataFim,
                    tbPostagem.categoriaPostagem,
                    tbPostagem.statusPostagem,
                    tbPostagem.imagemPostagem,
                    tbUsuario.idUsuario,
                    tbUsuario.usuario,
                    tbUsuario.emailUsuario,
                    tbUsuario.senhaUsuario,
                    DATE_FORMAT(tbUsuario.ultimoLogin, '%d/%m/%Y %H:%i:%s') AS ultimoLogin,
                    tbUsuario.tentativasLogin,
                    tbUsuario.tipoEntidade,
                    tbUsuario.statusEntidade
                FROM
                    tbPostagem
                JOIN
                    tbUsuario ON tbPostagem.idUsuario = tbUsuario.idUsuario
                WHERE
                    usuario = '${usuario}'
                ORDER BY
                    tbPostagem.dataCriacao DESC
            `);
            return res.json(respostaPost);
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    });

router.route('/vaga')
    .post(upload.single('imagem'), async (req, res) => {
        const {
            titulo,
            descricao,
            dtFim,
            token
        } = req.body || {};

        if (!req.file) {
            console.log('b')
            return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
        }

        if (typeof titulo != "string") {
            return res.status(400).json({ erro: "`titulo` não é um campo válido." });
        }
        if (typeof descricao != "string") {
            return res.status(400).json({ erro: "`descricao` não é um campo válido." });
        }
        if (typeof dtFim != "string") {
            return res.status(400).json({ erro: "`dtFim` não é um campo válido." });
        }
        if (typeof token != "string") {
            return res.status(400).json({ erro: "`token` não é um campo válido." });
        }

        try {
            const user = await getUser(token);

            if (user[0]) {
                const usuario = user[1];


                const resPost = await query(`INSERT INTO tbPostagem (tituloPostagem, conteudoPostagem, dataFim, categoriaPostagem, statusPostagem, idUsuario, imagemPostagem) VALUES ('${titulo}', '${descricao}', '${dtFim}', 'emprego', 'ativo', ${usuario.idUsuario}, '/public/posts/${req.file.filename}')`);

                const empresa = await query(`SELECT idEmpresa FROM tbEmpresa JOIN tbUsuario ON tbUsuario.idUsuario = tbEmpresa.idUsuario WHERE tbEmpresa.idUsuario = ${usuario.idUsuario}`);

                const resVaga = await query(`INSERT INTO tbVaga (nomeVaga, descricaoVaga, idEmpresa, imagem) VALUES ('${titulo}', '${descricao}', ${empresa[0].idEmpresa}, '/public/posts/${req.file.filename}')`);

                const imagemPath = `/public/posts/${req.file.filename}`;

                return res.json({ idPost: resPost.insertId, idVaga: resVaga.insertId, imagem: imagemPath });
            } else {
                res.status(404).json({ erro: 'Empresa não encontrado.' })
            }
        } catch (erro) {
            console.log(erro)
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    });

export default router;
