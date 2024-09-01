import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

const router = Router();
const upload = multer();

router.route('/')
    .get(async (req, res) => {
        try {
            const { nome, tipoEntidade, statusEntidade, idUsuario, orderBy, orderDirection = 'ASC' } = req.query;
            let queryStr = `
                SELECT
                    u.idUsuario,
                    u.usuario,
                    u.emailUsuario,
                    u.dataCriacao,
                    u.dataModificacao,
                    u.ultimoLogin,
                    u.tentativasLogin,
                    u.tipoEntidade,
                    u.statusEntidade,
                    COALESCE(a.nomeAdmin, o.nomeOng, e.nomeExDetento, emp.nomeEmpresa, esc.nomeEscola) AS nomeUsuario
                FROM
                    tbUsuario u
                LEFT JOIN
                    tbAdmin a ON u.idUsuario = a.idUsuario
                LEFT JOIN
                    tbOng o ON u.idUsuario = o.idUsuario
                LEFT JOIN
                    tbExDetento e ON u.idUsuario = e.idUsuario
                LEFT JOIN
                    tbEmpresa emp ON u.idUsuario = emp.idUsuario
                LEFT JOIN
                    tbEscola esc ON u.idUsuario = esc.idUsuario
                WHERE statusEntidade = 'ativo' OR statusEntidade = 'bloqueado'
            `;

            if (nome) {
                const nomeCondition = `%${nome}%`;
                queryStr += `
                    AND (
                        a.nomeAdmin LIKE '${nomeCondition}' OR
                        o.nomeOng LIKE '${nomeCondition}' OR
                        e.nomeExDetento LIKE '${nomeCondition}' OR
                        emp.nomeEmpresa LIKE '${nomeCondition}' OR
                        esc.nomeEscola LIKE '${nomeCondition}' OR
                        u.usuario LIKE '${nomeCondition}' OR
                        u.emailUsuario LIKE '${nomeCondition}' OR
                        u.tipoEntidade LIKE '${nomeCondition}' OR
                        u.statusEntidade LIKE '${nomeCondition}'
                    )
                `;
            }

            if (tipoEntidade) {
                queryStr += ` AND u.tipoEntidade = '${tipoEntidade}'`;
            }

            if (statusEntidade) {
                queryStr += ` AND u.statusEntidade = '${statusEntidade}'`;
            }

            if (idUsuario) {
                queryStr += ` AND u.idUsuario = '${idUsuario}'`;
            }

            // Ordenação
            if (orderBy) {
                const validColumns = ['idUsuario', 'usuario', 'emailUsuario', 'dataCriacao', 'dataModificacao', 'ultimoLogin', 'tentativasLogin', 'tipoEntidade', 'statusEntidade', 'nomeUsuario'];
                if (validColumns.includes(orderBy)) {
                    queryStr += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()}`;
                } else {
                    return res.status(400).json({ erro: 'Coluna de ordenação inválida.' });
                }
            }

            const resposta = await query(queryStr);

            return res.json(resposta);
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

router.route('/status/:usuario')
    .put(upload.none(), async (req, res) => {
        const { status } = req.body || '';
        const { usuario } = req.params || undefined;

        if (!['ativo', 'bloqueado', 'excluido'].includes(status)) {
            return res.status(400).json({ erro: '`status` não é um campo válido.' });
        }

        try {
            const resposta = await query(`
                UPDATE tbUsuario
                SET statusEntidade = '${status}'
                WHERE usuario = '${usuario}'
            `);

            if (resposta.affectedRows === 0) {
                return res.status(404).json({ erro: 'Usuário não encontrado.' });
            }

            return res.json({ mensagem: 'Status atualizado com sucesso.' });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    });


export default router;
