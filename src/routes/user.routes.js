import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';
import { login } from "../functions/auth/login.js";

const router = Router();
const upload = multer();

router.route('/login')
    .post(upload.none(), async (req, res) => {

        try {

            const {
                identificacao,
                senha
            } = req.body || {};

            if (typeof identificacao == 'undefined') {
                return res.status(400).json({ erro: '`identificacao` não é um campo válido.' });
            }

            const resultado = await query(`
            SELECT
                u.idUsuario,
                u.usuario,
                u.emailUsuario,
                u.senhaUsuario,
                u.dataCriacao,
                u.dataModificacao,
                u.ultimoLogin,
                u.tentativasLogin,
                u.tipoEntidade,
                u.statusEntidade
            FROM tbUsuario u
            LEFT JOIN tbAdmin a ON u.idUsuario = a.idUsuario
            LEFT JOIN tbOng o ON u.idUsuario = o.idUsuario
            LEFT JOIN tbEmpresa e ON u.idUsuario = e.idUsuario
            LEFT JOIN tbExDetento d ON u.idUsuario = d.idUsuario
            LEFT JOIN tbEscola s ON u.idUsuario = s.idUsuario
            WHERE
                u.usuario = '${identificacao}'
                OR u.emailUsuario = '${identificacao}'
                OR a.cpfAdmin = '${identificacao}'
                OR o.cnpjOng = '${identificacao}'
                OR e.cnpjEmpresa = '${identificacao}'
                OR d.cpfExDetento = '${identificacao}'
                OR s.cnpjEscola = '${identificacao}';
            `)


            if (resultado.length == 0) {
                return res.status(404).json({ erro: 'Usuário ou senha incorretos.' });
            }

            const usuario = resultado[0];

            if (usuario.statusEntidade == 'bloqueado') {
                return res.status(404).json({ erro: 'Usuário bloqueado.', bloqueado: true })
            }


            if (typeof usuario.tentativasLogin == 'number') {

                if (usuario.tentativasLogin >= 3) {
                    await query(`UPDATE tbUsuario SET tentativasLogin = tentativasLogin + 1, statusEntidade = 'bloqueado' WHERE usuario = '${usuario.usuario}'`)
                    return res.status(401).json({ erro: 'Usuário bloqueado.', bloqueado: true });
                }

            }

            const logou = await login(usuario.usuario, senha, usuario.tipoEntidade);


            if (!logou[0]) {
                return res.status(500).json({ erro: 'Usuário ou senha incorretos.'});
            }

            return res.status(200).json({ token: logou[1], entidade: usuario.tipoEntidade, usuario: usuario.usuario });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/info/:usuario')
    .get(async (req, res) => {

        const usuario = req.params.usuario || undefined;

        if (typeof usuario == 'undefined') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }


        try {

            const resposta = await query(`SELECT usuario, emailUsuario FROM tbUsuario WHERE usuario = '${usuario}'`);

            if (resposta.length == 0) {
                return res.status(404).json({ erro: 'Usuário não encontrado.' })
            }

            return res.json(resposta[0])

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })
    .put(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || undefined;

        if (typeof usuario == 'undefined') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            new_usuario,
            new_email,
            new_senha,
            old_senha,
        } = req.body || {};

    })

export default router;
