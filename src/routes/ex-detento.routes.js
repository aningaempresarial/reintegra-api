import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

import { criarUsuario } from "../functions/usuario/criar-usuario.js";
import { validaSenha } from "../functions/usuario/valida-senha.js";
import { validaTelefone } from "../functions/utils/valida-telefone.js";

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

router.route('/')
    .get(async (req, res) => {

         try {
            const resultado = await query(`SELECT idExDetento, nomeExDetento, dataNascExDetento, logadouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento, usuario FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE statusEntidade = 'ativo'`);
            res.json(resultado);
         } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
         }

    })

router.route('/')
    .post(upload.none(), async (req, res) => {

        const { nome, senha } = req.body || {};

        // Verificações de Existência de Conteúdo

        if (typeof(nome) != 'string') {
            return res.status(400).json({ erro: '`nome` não é um campo válido.' });
        }

        if (typeof(senha) != 'string') {
            return res.status(400).json({ erro: '`senha` não é um campo válido.' });
        }

        // Verificações no Banco
        try {

            // Criação de Usuario
            const usuario = await criarUsuario(nome, senha, 0);

            // Se o usuário foi criado, criar a empresa e registrar no banco
            if (usuario[0]) {
                const consulta = await query(`INSERT INTO tbExDetento (nomeExDetento, idUsuario) VALUES ('${nome}', ${usuario[1]}) `)

                return res.status(201).json({ mensagem: 'Login' });
            } 

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })


    router.route('/:usuario')
    .get(async (req, res) => {
        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        try {
            const resultado = await query(`
                SELECT idExDetento, nomeExDetento, dataNascExDetento, logadouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento, 
                usuario FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE statusEntidade = 'ativo' AND usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrada.' });
            }

            let exDetento = resultado[0];

            const telefones = await query(`
                SELECT idFoneExDetento, numFoneExDetento, visibilidade
                FROM tbFoneExDetento
                WHERE idExDetento = ${exDetento.idExDetento}
            `);

            exDetento.telefones = telefones;
  

            res.json(exDetento);

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
            nome,
        } = req.body || {};

        try {

            // Passo 1 - Verificar se o ex-Detento existe.

            const resultado = await query(`
                SELECT
                    tbExDetento.nomeExDetento,
                    tbUsuario.usuario
                FROM
                    tbExDetento
                JOIN
                    tbUsuario
                ON
                    tbUsuario.idUsuario = tbExDetento.idUsuario
                WHERE
                    tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrado.' });
            }

            const exDetentoAtual = resultado[0];

            // Passo 2 - Identificação de Dados Individuais
            // Precisamos checar se os dados passados são válidos

            let nomeAtualizado = nome || exDetentoAtual.nomeExDetento;

            // Passo 3 - Atualizar
            await query(`
                UPDATE tbExDetento
                JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario
                SET
                    tbExDetento.nomeExDetento = '${nomeAtualizado}',
                WHERE
                    tbUsuario.usuario = '${usuario}'
            `);


            return res.status(200).json({ mensagem: 'Dados atualizado com êxito!' });

        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })


    router.route('/telefone/:usuario')
    .post(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            numero,
        } = req.body || {};

        if (!validaTelefone(numero)) {
            return res.status(400).json({ erro: '`numero` não é um campo válido.' });
        }

        const visibilidadeBoolean = visibilidade === 'true' || visibilidade === true;

        try {
            const usuarioExistente = await checkUsernameExists(usuario);
            if (!usuarioExistente) {
                return res.status(401).json({ erro: 'Usuário não existe.' });
            }

            // Verifica se o telefone existe
            const telefoneAtual = await query(`
                SELECT *
                FROM tbFoneExDetento
                WHERE numFoneExDetento = '${numero}'
            `);

            if (telefoneAtual.length != 0) {
                return res.status(400).json({ erro: 'Telefone já foi cadastrado.' });
            }

            const resultado = await query(`SELECT idExDetento FROM tbExDetento JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario WHERE tbUsuario.usuario = '${usuario}'`);
            const idExDetento = resultado[0].idExDetento;

            await query(`
            INSERT INTO tbFoneExDetento (numFoneExDetento, idEmpresa)
            VALUES ('${numero}', ${visibilidadeBoolean}, ${idExDetento})`);

            res.status(201).json({ mensagem: 'Telefone cadastrado com sucesso.' });

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
            new_numero

        } = req.body || {};

        if (!id) {
            return res.status(400).json({ erro: '`id` do telefone é um campo obrigatório.' });
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

            // Passo 2 - Verifica se o telefone existe
            const telefoneAtual = await query(`
                SELECT *
                FROM tbFoneExDetento
                WHERE idFoneExDetento = ${id} AND idExDetento = ${idExDetento}
            `);

            if (telefoneAtual.length === 0) {
                return res.status(404).json({ erro: 'Telefone não encontrado.' });
            }

            // Passo 3 - Verifica se os dados são válidos

            let numeroAtualizado = telefoneAtual[0].numFoneExDetento;
            if (validaTelefone(new_numero)) {
                numeroAtualizado = new_numero;
            }


            // Passo 4 - Inserir dados no banco

            await query(`UPDATE tbFoneExDetento SET
            numFoneExDetento = '${numeroAtualizado}',
            visibilidade = ${visibilidadeAtualizada}
            WHERE idFoneExDetento = ${id} AND idExDetento = ${idExDetento}`);

            return res.status(200).json({ mensagem: 'Telefone atualizado com êxito!' });

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

    router.route('/telefone/:usuario/:id')
    .delete(async (req, res) => {
        const usuario = req.params.usuario || undefined;

        if (typeof usuario == 'undefined') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const id = req.params.id || undefined;

        if (typeof id == 'undefined') {
            return res.status(400).json({ erro: '`id` nao é um campo válido.' });
        }

        try {
            const resultado = await query(`
                SELECT tbExDetento.idExDetento
                FROM tbExDetento
                JOIN tbUsuario ON tbExDetento.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length == 0) {
                return res.status(404).erro('Ex detento não encontrada')
            }
            const exDetento = resultado[0];

            const consulta = query(`DELETE FROM tbFoneExDetento WHERE idExDetento = ${exDetento.idExDetento} AND idFoneExDetendo = ${id}`)

            return res.status(200).json({ mensagem: 'Telefone excluído com êxito.' })
        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })


export default router;


