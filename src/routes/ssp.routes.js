import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

const router = Router();
const upload = multer();

router.route('/')
    .post(upload.none(), async (req, res) => {

        const {
            nome,
            nomeMae,
            sexo,
            dob,
            cpf
        } = req.body || {};

        if (typeof(nome) != 'string') {
            return res.status(400).json({ erro: '`nome` não é um campo válido.' });
        }
        if (typeof(nomeMae) != 'string') {
            return res.status(400).json({ erro: '`nomeMae` não é um campo válido.' });
        }
        if (typeof(sexo) != 'string') {
            return res.status(400).json({ erro: '`sexo` não é um campo válido.' });
        }
        if (typeof(dob) != 'string') {
            return res.status(400).json({ erro: '`dob` não é um campo válido.' });
        }
        if (typeof(cpf) != 'string') {
            return res.status(400).json({ erro: '`cpf` não é um campo válido.' });
        }

        try {
            const resultado = await query(`
            SELECT *
            FROM tbSSP
            WHERE LOWER(nomeDetento) = LOWER('${nome}')
            AND LOWER(nomeMaeDetento) = LOWER('${nomeMae}')
            AND sexoDetento = '${sexo}'
            AND dataNascDetento = '${dob}'
            AND cpfDetento = '${cpf}'`)

            if (resultado.length > 0) {
                return res.json({ existe: true })
            }
            return res.json({ existe: false})

        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })


export default router;
