import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from '../db/query.js';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userFolder = req.userFolder;

        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}.jpg`);
    }
});

const upload = multer({ storage });


router.route("/usuario/desc/:usuario")
    .put(upload.none(), async (req, res) => {

        try {
            const nomeUsuario = req.params.usuario;

            const { descricao } = req.body;

            const result = await query(`SELECT idPerfil FROM tbPerfil JOIN tbUsuario ON tbPerfil.idUsuario = tbUsuario.idUsuario WHERE usuario = '${nomeUsuario}'`);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            const usuarioId = result[0].idPerfil;

            await query(`UPDATE tbPerfil SET descricaoPerfil = '${descricao}' WHERE idPerfil = ${usuarioId}`);

            res.json({ message: 'Descrição atualizada com êxito!' });
        } catch (error) {
            console.error('Erro ao buscar o usuário:', error);
            return res.status(500).json({ erro: 'Erro ao buscar o usuário' });
        }

    });

router.route('/usuario/:usuario')
    .put(async (req, res, next) => {
        try {
            const nomeUsuario = req.params.usuario;

            const result = await query(`SELECT idPerfil FROM tbPerfil JOIN tbUsuario ON tbPerfil.idUsuario = tbUsuario.idUsuario WHERE usuario = '${nomeUsuario}'`);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            const usuarioId = result[0].idPerfil;

            req.userFolder = path.join(process.cwd(), '/public', 'profiles', String(usuarioId));

            next();

        } catch (error) {
            console.error('Erro ao buscar o usuário:', error);
            return res.status(500).json({ erro: 'Erro ao buscar o usuário' });
        }
    }, upload.fields([
        { name: 'foto', maxCount: 1 },
        { name: 'banner', maxCount: 1 }
    ]), (req, res) => {
        try {
            if (!req.files || (!req.files.foto && !req.files.banner)) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            res.json({ message: 'Imagens recebidas e salvas com sucesso!' });
        } catch (error) {
            console.error('Erro ao salvar as imagens:', error);
            res.status(500).json({ erro: 'Erro ao salvar as imagens' });
        }
    });

export default router;
