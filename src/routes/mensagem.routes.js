import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from '../db/query.js';
import { getUser } from "../functions/auth/login.js";

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), '/public', 'mensagem'));
    },
    filename: (req, file, cb) => {
        cb(null, `voice.mp3`);
    }
});

const upload = multer({ storage });

router.post('/send', upload.single('voice'), async (req, res) => {
    const { token, destinatario, tipo_mensagem } = req.body;

    if (typeof token === 'undefined') {
        return res.status(400).json({ erro: "`token` não é um campo válido." });
    }

    if (typeof destinatario === 'undefined') {
        return res.status(400).json({ erro: "`destinatario` não é um campo válido." });
    }

    if (typeof tipo_mensagem === 'undefined') {
        return res.status(400).json({ erro: "`tipo_mensagem` não é um campo válido." });
    }

    if (tipo_mensagem !== 'text' && tipo_mensagem !== 'voice') {
        return res.status(400).json({ erro: "`tipo_mensagem` deve ser 'text' ou 'voice'." });
    }

    if (tipo_mensagem === 'text') {
        const { conteudo_mensagem } = req.body;

        if (typeof conteudo_mensagem === 'undefined' || conteudo_mensagem.trim() === '') {
            return res.status(400).json({ erro: "`conteudo_mensagem` não pode ser vazio." });
        }

        try {
            const user = await getUser(token);
            const user_destino = await query(`SELECT idUsuario FROM tbUsuario WHERE usuario = '${destinatario}'`)

            if (user_destino.lenght < 1) {
                return res.status(404).json({ error: 'Usuário especificado não existe.' });
            }

            await query(`INSERT INTO tbMensagem (idRemetente, idDestinatario, tipoMensagem, conteudoMensagem) VALUES (${user[1].idUsuario}, ${user_destino[0].idUsuario}, 'text', '${conteudo_mensagem}')`);
            res.status(200).json({ message: 'Mensagem de texto enviada com sucesso!' });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
        }
    } else if (tipo_mensagem === 'voice') {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
        }

        try {
            const user = await getUser(token);
            const user_destino = await query(`SELECT idUsuario FROM tbUsuario WHERE usuario = '${destinatario}'`)

            if (user_destino.lenght < 1) {
                return res.status(404).json({ error: 'Usuário especificado não existe.' });
            }

            const mensagem = await query(`INSERT INTO tbMensagem (idRemetente, idDestinatario, tipoMensagem) VALUES (${user[1].idUsuario}, ${user_destino[0].idUsuario}, 'voice')`);
            const insertId = mensagem.insertId;

            const mensagemFolder = path.join(process.cwd(), '/public', 'mensagem', String(insertId));
            if (!fs.existsSync(mensagemFolder)) {
                fs.mkdirSync(mensagemFolder, { recursive: true });
            }

            const oldPath = path.join(process.cwd(), '/public', 'mensagem', 'voice.mp3');
            const newPath = path.join(mensagemFolder, 'voice.mp3');
            fs.renameSync(oldPath, newPath);

            await query(`UPDATE tbMensagem SET conteudoMensagem = '/public/mensagem/${insertId}/voice.mp3' WHERE idMensagem = ${insertId}`);
            res.status(200).json({ message: 'Arquivo de áudio enviado com sucesso!', file: { path: newPath } });
        } catch (erro) {
            res.status(500).json({ erro: "Erro ao processar o upload do arquivo.", detalhe: erro.message });
        }
    }
});

router.get('/mensagens', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ erro: "`token` não é um campo válido." });
    }

    try {
        const user = await getUser(token);
        const idUsuario = user[1].idUsuario;

        const mensagens = await query(`
            SELECT
                m.idMensagem,
                m.idRemetente,
                m.idDestinatario,
                m.conteudoMensagem,
                m.tipoMensagem,
                DATE_FORMAT(m.dataCriacao, '%H:%i:%s') AS horario, 
                FORMAT(m.dataCriacao, 'dd/MM/yyyy') AS data,
                u.usuario,
                p.fotoPerfil
            FROM
                tbMensagem m
            JOIN
                tbUsuario u ON u.idUsuario = CASE
                    WHEN m.idRemetente = ${idUsuario} THEN m.idDestinatario
                    ELSE m.idRemetente
                END
            JOIN
                tbPerfil p ON m.idRemetente = p.idUsuario
            WHERE
                m.idRemetente = ${idUsuario} OR m.idDestinatario = ${idUsuario}
            ORDER BY
                m.idMensagem ASC
        `);

        const mensagensAgrupadas = [];

        mensagens.forEach((mensagem) => {
            const { idDestinatario, idRemetente, usuario, fotoPerfil, ...resto } = mensagem;
            const idOutroUsuario = idRemetente === idUsuario ? idDestinatario : idRemetente;

            let usuarioExistente = mensagensAgrupadas.find(usuario => usuario.usuario === idOutroUsuario);
            if (!usuarioExistente) {
                usuarioExistente = {
                    usuario: idOutroUsuario,
                    nomeUsuario: usuario,
                    fotoPerfil: fotoPerfil,
                    horario: mensagens.horario,
                    data: mensagens.data,
                    mensagens: []
                };
                mensagensAgrupadas.push(usuarioExistente);
            }

            usuarioExistente.mensagens.push({
                ...resto,
                usuario: idRemetente === idUsuario ? user[1].usuario : usuario,
            });
        })

        res.status(200).json(mensagensAgrupadas);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
    }
});

router.get('/mensagens/:idUsuario', async (req, res) => {
    const { token } = req.query;
    const { idUsuario } = req.params;

    if (!token) {
        return res.status(400).json({ erro: "`token` não é um campo válido." });
    }

    try {
        const user = await getUser(token);
        const idUsuarioLogado = user[1].idUsuario;

        if (!idUsuario) {
            return res.status(400).json({ erro: "`ID de usuário` não é um campo válido." });
        }

        const mensagens = await query(`
            SELECT
                m.idMensagem,
                m.idRemetente,
                m.idDestinatario,
                m.conteudoMensagem,
                m.tipoMensagem,
                u.usuario,
                DATE_FORMAT(m.dataCriacao, '%H:%i') AS horario, 
                FORMAT(m.dataCriacao, 'dd/MM/yyyy') AS data,
                p.fotoPerfil
            FROM
                tbMensagem m
            JOIN
                tbUsuario u ON u.idUsuario = CASE
                    WHEN m.idRemetente = ${idUsuarioLogado} THEN m.idDestinatario
                    ELSE m.idRemetente
                END
            JOIN
                tbPerfil p ON u.idUsuario = p.idUsuario
            WHERE
                (m.idRemetente = ${idUsuarioLogado} AND m.idDestinatario = ${idUsuario})
                OR (m.idRemetente = ${idUsuario} AND m.idDestinatario = ${idUsuarioLogado})
            ORDER BY
                m.idMensagem ASC
        `);

        res.status(200).json(mensagens);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao processar a solicitação.", detalhe: erro.message });
    }
});

export default router;
