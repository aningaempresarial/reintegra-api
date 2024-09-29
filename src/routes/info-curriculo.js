import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

import { checkUsernameExists } from "../functions/utils/verifica-usuario.js";

const router = Router();
const upload = multer();


/*
Códigos:
200 - Ok! Tudo certo
201 - Criado
400 - Erro do cliente (algum dado foi enviado errado)
401 - Sem autorização
404 - Não encontrado
500 - Erro do server
*/


router.route('/:usuario')
    .get(async (req, res) => {
        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        try {
            const resultado = await query(`
                SELECT idExDetento, nomeExDetento, dataNascExDetento, logradouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento,
                usuario FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE statusEntidade = 'ativo' AND usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrada.' });
            }

            let exDetento = resultado[0];

            const experiencias = await query(`
                SELECT idExperienciaExDetento, nomeEmpresaExperiencia, descricaoCargoExperiencia, dataInicio, dataFim
                FROM tbExperienciasExDetento
                WHERE idExDetento = ${exDetento.idExDetento}
            `);

            const curso = await query(`
                SELECT idEducacaoExDetento, nomeEscola, nomeCurso, dataInicio, dataFim, descricaoCurso
                FROM tbEducacaoExDetento
                WHERE idExDetento = ${exDetento.idExDetento}
            `);


            exDetento.experiencias = experiencias;
            exDetento.curso = curso;



            res.json(exDetento);

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

router.route('/experiencia/:usuario')
    .post(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            nomeEmpresaExperiencia,
            nomeCargoExperiencia,
            descricaoCargoExperiencia,
            dataInicio,
            dataFim,
        } = req.body || {};

        if (typeof(nomeEmpresaExperiencia) != 'string') {
            return res.status(400).json({ erro: '`nomeEmpresaExperiencia` não é um campo válido.' });
        }

        if (typeof(nomeCargoExperiencia) != 'string') {
            return res.status(400).json({ erro: '`nomeCargoExperiencia` não é um campo válido.' });
        }

        if (typeof(descricaoCargoExperiencia) != 'string') {
            return res.status(400).json({ erro: '`descricaoCargoExperiencia` não é um campo válido.' });
        }

        if (typeof(dataInicio) != 'string') {
            return res.status(400).json({ erro: '`dataInicio` não é um campo válido.' });
        }

        if (typeof(dataFim) != 'string') {
            return res.status(400).json({ erro: '`dataFim` não é um campo válido.' });
        }

        try {
            const usuarioExistente = await checkUsernameExists(usuario);
            if (!usuarioExistente) {
                return res.status(401).json({ erro: 'Usuário não existe.' });
            }


            const resultado = await query(`SELECT idExDetento FROM tbExDetento JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario WHERE tbUsuario.usuario = '${usuario}'`);
            const idExDetento = resultado[0].idExDetento;

            await query(`
            INSERT INTO tbExperienciasExDetento (nomeEmpresaExperiencia, nomeCargoExperiencia, descricaoCargoExperiencia, dataInicio, dataFim, idExDetento)
            VALUES ('${nomeEmpresaExperiencia}', '${nomeCargoExperiencia}', '${descricaoCargoExperiencia}', '${dataInicio}', '${dataFim}', ${idExDetento})`);

            res.status(201).json({ mensagem: 'Experiência cadastrada com sucesso.' });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

    .put(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            id,
            nomeEmpresaExperiencia,
            nomeCargoExperiencia,
            descricaoCargoExperiencia,
            dataInicio,
            dataFim

        } = req.body || {};

        if (!id) {
            return res.status(400).json({ erro: '`id` do experiência é um campo obrigatório.' });
        }

        try {
            // Passo 1 - Verifica se o ex Detento existe
            const resultado = await query(`
                SELECT tbExDetento.idExDetento
                FROM tbExDetento
                JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrado.' });
            }

            const idExDetento = resultado[0].idExDetento;

            // Passo 2 - Verifica se a experiência existe
            const experienciaAtual = await query(`
                SELECT *
                FROM tbExperienciasExDetento
                WHERE idExperienciaExDetento = ${id} AND idExDetento = ${idExDetento}
            `);

            if (experienciaAtual.length === 0) {
                return res.status(404).json({ erro: 'Experiência não encontrado.' });
            }


            // Passo 3 - Inserir dados no banco

            await query(`UPDATE tbExperienciasExDetento SET
            nomeEmpresaExperiencia = '${nomeEmpresaExperiencia}',
            nomeCargoExperiencia = '${nomeCargoExperiencia}',
            descricaoCargoExperiencia = '${descricaoCargoExperiencia}',
            dataInicio = '${dataInicio}',
            dataFim = '${dataFim}'
            WHERE idExperienciaExDetento = ${id} AND idExDetento = ${idExDetento}`);

            return res.status(200).json({ mensagem: 'Experiência atualizada com êxito!' });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/curso/:usuario')
    .post(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            nomeEscola,
            nomeCurso,
            dataInicio,
            dataFim,
            descricaoCurso

        } = req.body || {};

        if (typeof(nomeEscola) != 'string') {
            return res.status(400).json({ erro: '`nomeEscola` não é um campo válido.' });
        }

        if (typeof(nomeCurso) != 'string') {
            return res.status(400).json({ erro: '`nomeCurso` não é um campo válido.' });
        }

        if (typeof(dataInicio) != 'string') {
            return res.status(400).json({ erro: '`dataInicio` não é um campo válido.' });
        }

        if (typeof(dataFim) != 'string') {
            return res.status(400).json({ erro: '`dataFim` não é um campo válido.' });
        }

        if (typeof(descricaoCurso) != 'string') {
            return res.status(400).json({ erro: '`descricaoCurso` não é um campo válido.' });
        }

        try {
            const usuarioExistente = await checkUsernameExists(usuario);
            if (!usuarioExistente) {
                return res.status(401).json({ erro: 'Usuário não existe.' });
            }


            const resultado = await query(`SELECT idExDetento FROM tbExDetento JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario WHERE tbUsuario.usuario = '${usuario}'`);
            const idExDetento = resultado[0].idExDetento;

            await query(`
            INSERT INTO tbEducacaoExDetento (nomeEscola, nomeCurso, dataInicio, dataFim, descricaoCurso, idExDetento)
            VALUES ('${nomeEscola}', '${nomeCurso}', '${dataInicio}', '${dataFim}','${descricaoCurso}', ${idExDetento})`);

            res.status(201).json({ mensagem: 'Curso cadastrado com sucesso.' });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

    .put(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            id,
            nomeEscola,
            nomeCurso,
            dataInicio,
            dataFim,
            descricaoCurso

        } = req.body || {};

        if (!id) {
            return res.status(400).json({ erro: '`id` do experiência é um campo obrigatório.' });
        }

        try {
            // Passo 1 - Verifica se o ex Detento existe
            const resultado = await query(`
                SELECT tbExDetento.idExDetento
                FROM tbExDetento
                JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrado.' });
            }

            const idExDetento = resultado[0].idExDetento;

            // Passo 2 - Verifica se a experiência existe
            const cursoAtual = await query(`
                SELECT *
                FROM tbEducacaoExDetento
                WHERE idEducacaoExDetento = ${id} AND idExDetento = ${idExDetento}
            `);

            if (cursoAtual.length === 0) {
                return res.status(404).json({ erro: 'Curso não encontrado.' });
            }


            // Passo 3 - Inserir dados no banco

            await query(`UPDATE tbEducacaoExDetento SET
            nomeEscola = '${nomeEscola}',
            nomeCurso = '${nomeCurso}',
            dataInicio = '${dataInicio}',
            dataFim = '${dataFim}',
            descricaoCurso = '${descricaoCurso}'

            WHERE idEducacaoExDetento = ${id} AND idExDetento = ${idExDetento}`);

            return res.status(200).json({ mensagem: 'Curso atualizado com êxito!' });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

export default router;
