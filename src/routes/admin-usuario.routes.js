import { Router } from "express";
import multer from "multer";
import nodemailer from 'nodemailer'
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
                WHERE (statusEntidade = 'ativo' OR statusEntidade = 'bloqueado')
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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yotozangue@gmail.com',
        pass: '',
    },
});


async function enviarEmail(destinatario, assunto, mensagem) {
    try {
        const info = await transporter.sendMail({
            from: '"Suporte Reintegra" <aningaempresarial@gmail.com',
            to: destinatario,
            subject: assunto,
            html: mensagem,
        });
        console.log(`E-mail enviado: ${info.messageId}`);
    } catch (erro) {
        console.error(`Erro ao enviar e-mail: ${erro.message}`);
    }
}

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

            const usuarioData = await query(`SELECT emailUsuario FROM tbUsuario WHERE usuario = '${usuario}'`);
            const emailUsuario = usuarioData[0].emailUsuario;

            let mensagem = '';
            let assunto = '';

            if (status === 'bloqueado') {
                assunto = 'Conta Reintegra Bloqueada';
                mensagem = `
                    <p>Olá,</p>
                    <p>Somos da equipe de suporte do Reintegra!</p>
                    <p>Informamos que sua conta foi <b>bloqueada</b>. Caso tenha dúvidas, entre em contato com nosso suporte.</p>
                    <p>Suporte: aningaempresarial@gmail.com</p>
                `;
            } else if (status === 'excluido') {
                assunto = 'Conta Reintegra Excluída';
                mensagem = `
                    <p>Olá,</p>
                    <p>Somos da equipe de suporte do Reintegra!</p>
                    <p>Informamos que sua conta foi <b>excluída</b>. Caso tenha dúvidas, entre em contato com nosso suporte.</p>
                    <p>Suporte: aningaempresarial@gmail.com</p>
                `;
            }

            if (mensagem && assunto) {
                enviarEmail(emailUsuario, assunto, mensagem);
            }

            return res.json({ mensagem: 'Status atualizado com sucesso.' });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    });

    router.route('/lasts')
    .get(async (req, res) => {
        try {
            const cadastros = await query(`
                SELECT
                    dataCriacao,
                    fotoPerfil,
                    COALESCE(a.nomeAdmin, o.nomeOng, e.nomeExDetento, emp.nomeEmpresa) AS nomeUsuario
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
                    tbPerfil ON u.idUsuario = tbPerfil.idUsuario
                WHERE
                    u.statusEntidade = 'ativo'
                ORDER BY
                    dataCriacao DESC
                LIMIT 5;
            `);

            if (cadastros.length === 0) {
                return res.status(404).json({
                    erro: "Nenhum dado encontrado.",
                });
            }
    
            return res.json(cadastros);
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

    router.get('/mensal', async (req, res) => {
        try {
            const usuariosMes = `
                SELECT 
                    DATE_FORMAT(u.dataCriacao, '%b') AS mes,
                    SUM(CASE WHEN e.idUsuario IS NOT NULL THEN 1 ELSE 0 END) AS exDetentos,
                    SUM(CASE WHEN emp.idUsuario IS NOT NULL THEN 1 ELSE 0 END) AS empresas
                FROM 
                    tbUsuario u
                LEFT JOIN 
                    tbExDetento e ON u.idUsuario = e.idUsuario
                LEFT JOIN 
                    tbEmpresa emp ON u.idUsuario = emp.idUsuario
                WHERE 
                    u.statusEntidade = 'ativo'
                GROUP BY 
                    DATE_FORMAT(u.dataCriacao, '%Y-%m')
                ORDER BY 
                    DATE_FORMAT(u.dataCriacao, '%Y-%m');
            `;
    
            const resultado = await query(usuariosMes);
            const data = resultado.map(row => ({
                mes: row.mes,
                empresas: row.empresas,
                exDetentos: row.exDetentos
            }));
    
            res.json({ data });
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            res.status(500).json({ error: 'Erro ao buscar dados.' });
        }
    });

export default router;
