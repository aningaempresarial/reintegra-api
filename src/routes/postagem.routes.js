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
        const uniqueName = `${uuidv4()}.jpg`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

router.route('/aplicar-vaga')
    .post(upload.none(), async (req, res) => {
        const { token, tituloVaga } = req.body || {};
        try {
            const usuario = await getUser(token);
            if (usuario[0]) {
                const busca = await query(`SELECT idVaga FROM tbVaga WHERE nomeVaga = '${tituloVaga}'`);
                const buscaExDetento = await query(`SELECT idExDetento FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE tbUsuario.idUsuario = ${usuario[1].idUsuario}`)
                await query(`INSERT INTO tbCandidatoVaga (idExDetento, idVaga) VALUES (${buscaExDetento[0].idExDetento}, ${busca[0].idVaga})`);
            }
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }

    })

router.route('/destaques')
    .get(async (req, res) => {
        try {
            const respostaPost = await query(`
                SELECT
                    idPostagem, categoriaPostagem, tituloPostagem 'nome', tbPostagem.dataCriacao 'data', imagemPostagem 'imagem' FROM tbPostagem JOIN tbUsuario ON tbUsuario.idUsuario = tbPostagem.idUsuario JOIN tbPerfil ON tbPerfil.idUsuario = tbUsuario.idUsuario
                ORDER BY
                    tbPostagem.dataCriacao DESC
            `);
            return res.json(respostaPost);
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    })

router.route('/all')
    .get(async (req, res) => {
        try {
            const respostaPost = await query(`
                SELECT
                    tbPostagem.dataCriacao 'dtPostagem', usuario, tbPostagem.*, tbPerfil.*, tbEmpresa.nomeEmpresa FROM tbPostagem JOIN tbUsuario ON tbUsuario.idUsuario = tbPostagem.idUsuario JOIN tbPerfil ON tbPerfil.idUsuario = tbUsuario.idUsuario JOIN tbEmpresa on tbUsuario.idUsuario = tbEmpresa.idUsuario
                ORDER BY
                    tbPostagem.dataCriacao DESC
            `);
            return res.json(respostaPost);
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    })

router.route('/all/emprego')
    .get(async (req, res) => {
        try {
            const respostaPost = await query(`
                SELECT
                    tbPostagem.dataCriacao 'dtPostagem', usuario, tbPostagem.*, tbPerfil.* FROM tbPostagem JOIN tbUsuario ON tbUsuario.idUsuario = tbPostagem.idUsuario JOIN tbPerfil ON tbPerfil.idUsuario = tbUsuario.idUsuario
                ORDER BY
                    tbPostagem.dataCriacao DESC
            `);
            return res.json(respostaPost);
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    })
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
                    tbPostagem.dataCriacao 'dtPostagem',
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
                    tbUsuario.usuario = '${usuario}'
                ORDER BY
                    tbPostagem.dataCriacao DESC
            `);

            const postagensComCandidatos = await Promise.all(respostaPost.map(async postagem => {
                const candidatos = await query(`
                    SELECT
                        tbExDetento.idExDetento,
                        tbExDetento.nomeExDetento
                    FROM
                        tbCandidatoVaga
                    JOIN
                        tbExDetento ON tbCandidatoVaga.idExDetento = tbExDetento.idExDetento
                    JOIN
                        tbVaga ON tbCandidatoVaga.idVaga = tbVaga.idVaga
                    WHERE
                        tbVaga.nomeVaga = '${postagem.tituloPostagem}'
                `);

                return {
                    ...postagem,
                    candidatos: candidatos.map(candidato => ({
                        idUsuario: candidato.idExDetento,
                        nome: candidato.nomeExDetento
                    }))
                };
            }));

            return res.json(postagensComCandidatos);
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
            requisitos,
            salario,
            tipoContrato,
            escolaridade,
            cargaHoraria,
            horario,
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

                const resVaga = await query(`INSERT INTO tbVaga (nomeVaga, descricaoVaga, idEmpresa, imagem, requisitosVaga, salarioVaga, tipoContrato, tipoEscolaridade, cargaHoraria, horarioVaga) VALUES ('${titulo}', '${descricao}', ${empresa[0].idEmpresa}, '/public/posts/${req.file.filename}', '${requisitos}', '${salario}', '${tipoContrato}', '${escolaridade}', '${cargaHoraria}', '${horario}')`);

                const imagemPath = `/public/posts/${req.file.filename}`;

                return res.json({ idPost: resPost.insertId, idVaga: resVaga.insertId, imagem: imagemPath });
            } else {
                res.status(404).json({ erro: 'Empresa não encontrada.' })
            }
        } catch (erro) {
            console.log(erro)
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    });


router.route('/')
    .post(upload.single('imagem'), async (req, res) => {
        const {
            titulo,
            descricao,
            token,
            tipo
        } = req.body || {};

        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
        }

        if (typeof titulo != "string") {
            return res.status(400).json({ erro: "`titulo` não é um campo válido." });
        }
        if (typeof descricao != "string") {
            return res.status(400).json({ erro: "`descricao` não é um campo válido." });
        }
        if (typeof tipo != "string") {
            return res.status(400).json({ erro: "`tipo` não é um campo válido." });
        }
        if (typeof token != "string") {
            return res.status(400).json({ erro: "`token` não é um campo válido." });
        }

        try {
            const user = await getUser(token);

            if (user[0]) {
                const usuario = user[1];


                const resPost = await query(`INSERT INTO tbPostagem (tituloPostagem, conteudoPostagem, categoriaPostagem, statusPostagem, idUsuario, imagemPostagem) VALUES ('${titulo}', '${descricao}', '${tipo}', 'ativo', ${usuario.idUsuario}, '/public/posts/${req.file.filename}')`);

                return res.json({ idPost: resPost.insertId });
            } else {
                res.status(404).json({ erro: 'Usuario não encontrado.' })
            }
        } catch (erro) {
            console.log(erro)
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    });

router.route('/vagas/:usuario')
    .get(async (req, res) => {
        const { usuario } = req.params;

        if (!usuario) {
            return res.status(400).json({ erro: "`usuario` não é um campo válido." });
        }

        try {
            const resVagas = await query(`
                SELECT
                    tbVaga.idVaga,
                    tbVaga.nomeVaga,
                    tbVaga.descricaoVaga,
                    tbVaga.imagem,
                    tbVaga.requisitosVaga,
                    tbVaga.salarioVaga,
                    tbVaga.tipoContrato,
                    tbVaga.tipoEscolaridade,
                    tbVaga.cargaHoraria,
                    tbVaga.horarioVaga,
                    tbVaga.idPostagem
                FROM
                    tbVaga
                JOIN
                    tbPostagem ON tbPostagem.idPostagem = tbVaga.idPostagem
                JOIN
                    tbUsuario ON tbPostagem.idUsuario = tbUsuario.idUsuario
                WHERE
                    tbUsuario.usuario = '${usuario}'
            `);

            if (resVagas.length === 0) {
                return res.status(404).json({ erro: "Nenhuma vaga encontrada para esta empresa." });
            }

            return res.json(resVagas);
        } catch (erro) {
            console.log(erro);
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    });


export default router;
