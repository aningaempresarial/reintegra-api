import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

import { validaCNPJ } from "../functions/empresa/valida-cnpj.js";
import { validaEmail } from "../functions/utils/valida-email.js";
import { verificaCnpjExiste } from "../functions/empresa/verifica-cnpj.js";
import { criarUsuario } from "../functions/usuario/criar-usuario.js";
import { validaSenha } from "../functions/usuario/valida-senha.js";
import { geraHash } from "../functions/usuario/gera-hash.js";
import { validaBairro, validaCEP, validaEstado, validaLogradouro, validaNumero } from "../functions/utils/valida-endereco.js";
import { checkUsernameExists } from "../functions/utils/verifica-usuario.js";
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
            const resultado = await query(`SELECT idEmpresa, nomeEmpresa, emailEmpresaContato, cnpjEmpresa, usuario FROM tbEmpresa JOIN tbUsuario ON tbUsuario.idUsuario = tbEmpresa.idUsuario WHERE statusEntidade = 'ativo'`);
            res.json(resultado);
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/')
    .post(upload.none(), async (req, res) => {

        const { nome, email, cnpj, senha } = req.body || {};

        // Verificações de Existência de Conteúdo

        if (typeof(nome) != 'string') {
            return res.status(400).json({ erro: '`nome` não é um campo válido.' });
        }

        if (!validaCNPJ(cnpj)) {
            return res.status(400).json({ erro: '`cnpj` não é um campo válido.' });
        }

        if (!validaEmail(email)) {
            return res.status(400).json({ erro: '`email` não é um campo válido.' });
        }

        if (typeof(senha) != 'string') {
            return res.status(400).json({ erro: '`senha` não é um campo válido.' });
        }

        // Verificações no Banco
        try {
            if (await verificaCnpjExiste(cnpj)) {
                return res.status(400).json({ erro: 'O CNPJ já existe.' });
            }

            // Criação de Usuario
            const usuario = await criarUsuario(nome, email, senha, 0);

            // Se o usuário foi criado, criar a empresa e registrar no banco
            if (usuario[0]) {
                const consulta = await query(`INSERT INTO tbEmpresa (nomeEmpresa, cnpjEmpresa, idUsuario) VALUES ('${nome}', '${String(cnpj).replace(/[^\d]/g, '')}', ${usuario[1]}) `)

                return res.status(201).json({ mensagem: 'Login' });
            } else {
                return res.status(400).json({ erro: 'Erro ao criar usuário.' })
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
                SELECT tbEmpresa.idEmpresa, nomeEmpresa, emailEmpresaContato, cnpjEmpresa, usuario
                FROM tbEmpresa
                JOIN tbUsuario ON tbUsuario.idUsuario = tbEmpresa.idUsuario
                WHERE statusEntidade = 'ativo' AND usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Empresa não encontrada.' });
            }

            let empresa = resultado[0];

            const telefones = await query(`
                SELECT idFoneEmpresa, numFoneEmpresa, visibilidade
                FROM tbFoneEmpresa
                WHERE idEmpresa = ${empresa.idEmpresa}
            `);

            const enderecos = await query(`
                SELECT idEnderecoEmpresa, logradouroEnderecoEmpresa, numEnderecoEmpresa, cepEnderecoEmpresa, bairroEnderecoEmpresa, estadoEnderecoEmpresa
                FROM tbEnderecoEmpresa
                WHERE idEmpresa = ${empresa.idEmpresa}
            `);

            empresa.telefones = telefones;
            empresa.enderecos = enderecos;

            res.json(empresa);

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
            emailContato
        } = req.body || {};

        try {

            // Passo 1 - Verificar se a empresa existe.

            const resultado = await query(`
                SELECT
                    tbEmpresa.nomeEmpresa,
                    tbEmpresa.emailEmpresaContato,
                    tbEmpresa.cnpjEmpresa,
                    tbUsuario.usuario
                FROM
                    tbEmpresa
                JOIN
                    tbUsuario
                ON
                    tbUsuario.idUsuario = tbEmpresa.idUsuario
                WHERE
                    tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Empresa não encontrada.' });
            }

            const empresaAtual = resultado[0];

            // Passo 2 - Identificação de Dados Individuais
            // Precisamos checar se os dados passados são válidos

            let nomeAtualizado = nome || empresaAtual.nomeEmpresa;

            let emailContatoAtualizado = empresaAtual.emailEmpresaContato;
            if (typeof(emailContato) == 'string') {
                if (validaEmail(emailContato)) {
                    const buscaEmail = await query(`SELECT emailEmpresaContato FROM tbEmpresa WHERE emailEmpresaContato = '${emailAtualizado}'`)
                    if (buscaEmail.length == 0) {
                        emailContatoAtualizado = emailContato;
                    }
                }
            }

            // Passo 3 - Atualizar
            await query(`
                UPDATE tbEmpresa
                JOIN tbUsuario ON tbUsuario.idUsuario = tbEmpresa.idUsuario
                SET
                    tbEmpresa.nomeEmpresa = '${nomeAtualizado}',
                    tbEmpresa.emailEmpresaContato = ${emailContatoAtualizado !== null ? `'${emailContatoAtualizado}'` : 'NULL'}
                WHERE
                    tbUsuario.usuario = '${usuario}'
            `);


            return res.status(200).json({ mensagem: 'Dados atualizado com êxito!' });

        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/endereco/:usuario')
    .post(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || 'admin';

        if (usuario == 'admin') {
            return res.status(400).json({ erro: '`usuario` nao é um campo válido.' });
        }

        const {
            logradouro,
            numero,
            cep,
            bairro,
            estado,
        } = req.body || {};

        if (!validaLogradouro(logradouro)) {
            return res.status(400).json({ erro: '`logradouro` não é um campo válido.' });
        }

        if (!validaNumero(numero)) {
            return res.status(400).json({ erro: '`numero` não é um campo válido.' });
        }

        if (!validaCEP(cep)) {
            return res.status(400).json({ erro: '`cep` não é um campo válido.' });
        }

        if (!validaBairro(bairro)) {
            return res.status(400).json({ erro: '`bairro` não é um campo válido.' });
        }

        if (!validaEstado(estado)) {
            return res.status(400).json({ erro: '`estado` não é um campo válido.' });
        }

        try {
            const usuarioExistente = await checkUsernameExists(usuario);
            if (!usuarioExistente) {
                return res.status(401).json({ erro: 'Usuário não existe.' })
            }

            const resultado = await query(`SELECT idEmpresa FROM tbEmpresa JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario WHERE tbUsuario.usuario = '${usuario}'`)
            const idEmpresa = resultado[0].idEmpresa;

            await query(`
            INSERT INTO tbEnderecoEmpresa (logradouroEnderecoEmpresa, numEnderecoEmpresa, cepEnderecoEmpresa, bairroEnderecoEmpresa, estadoEnderecoEmpresa, idEmpresa)
            VALUES ('${logradouro}', '${numero}', '${cep}', '${bairro}', '${estado}', ${idEmpresa})`);

            res.status(201).json({ mensagem: 'Endereço cadastrado com sucesso.' });

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
            logradouro,
            numero,
            cep,
            bairro,
            estado,
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ erro: '`id` do endereço é um campo obrigatório.' });
        }

        try {
            // Passo 1 - Verifica se a empresa existe
            const resultado = await query(`
                SELECT tbEmpresa.idEmpresa
                FROM tbEmpresa
                JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Empresa não encontrada.' });
            }

            const idEmpresa = resultado[0].idEmpresa;

            // Passo 2 - Verifica se o endereço existe
            const enderecoAtual = await query(`
                SELECT *
                FROM tbEnderecoEmpresa
                WHERE idEnderecoEmpresa = ${id} AND idEmpresa = ${idEmpresa}
            `);

            if (enderecoAtual.length === 0) {
                return res.status(404).json({ erro: 'Endereço não encontrado.' });
            }

            // Passo 3 - Verifica se os dados são válidos

            let logradouroAtualizado = enderecoAtual[0].logradouroEnderecoEmpresa;
            if (validaLogradouro(logradouro)) {
                logradouroAtualizado = logradouro;
            }

            let numeroAtualizado = enderecoAtual[0].numEnderecoEmpresa;
            if (validaNumero(numero)) {
                numeroAtualizado = numero
            }

            let cepAtualizado = enderecoAtual[0].cepEnderecoEmpresa;
            if (validaCEP(cep)) {
                cepAtualizado = cep
            }

            let bairroAtualizado = enderecoAtual[0].bairroEnderecoEmpresa;
            if (validaBairro(bairro)) {
                bairroAtualizado = bairro
            }

            let estadoAtualizado = enderecoAtual[0].estadoEnderecoEmpresa;
            if (validaEstado(estado)) {
                estadoAtualizado = estado
            }

            // Passo 4 - Inserir dados no banco

            await query(`UPDATE tbEnderecoEmpresa SET
            logradouroEnderecoEmpresa = '${logradouroAtualizado}',
            numEnderecoEmpresa = '${numeroAtualizado}',
            cepEnderecoEmpresa = '${cepAtualizado}',
            bairroEnderecoEmpresa = '${bairroAtualizado}',
            estadoEnderecoEmpresa = '${estadoAtualizado}'
            WHERE idEmpresa = ${idEmpresa}`);

            return res.status(200).json({ mensagem: 'Dados atualizado com êxito!' });

        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/endereco/:usuario/:id')
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
                SELECT tbEmpresa.idEmpresa
                FROM tbEmpresa
                JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length == 0) {
                return res.status(404).erro('Empresa não encontrada')
            }
            const empresa = resultado[0];

            const consulta = query(`DELETE FROM tbEnderecoEmpresa WHERE idEmpresa = ${empresa.idEmpresa} AND idEnderecoEmpresa = ${id}`)

            return res.status(200).json({ mensagem: 'Endereço excluído com êxito.' })
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
            visibilidade
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
                FROM tbFoneEmpresa
                WHERE numFoneEmpresa = '${numero}'
            `);

            if (telefoneAtual.length != 0) {
                return res.status(400).json({ erro: 'Telefone já foi cadastrado.' });
            }

            const resultado = await query(`SELECT idEmpresa FROM tbEmpresa JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario WHERE tbUsuario.usuario = '${usuario}'`);
            const idEmpresa = resultado[0].idEmpresa;

            await query(`
            INSERT INTO tbFoneEmpresa (numFoneEmpresa, visibilidade, idEmpresa)
            VALUES ('${numero}', ${visibilidadeBoolean}, ${idEmpresa})`);

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
            new_numero,
            visibilidade
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ erro: '`id` do telefone é um campo obrigatório.' });
        }

        const visibilidadeBoolean = visibilidade === 'true' || visibilidade === true;

        try {
            // Passo 1 - Verifica se a empresa existe
            const resultado = await query(`
                SELECT tbEmpresa.idEmpresa
                FROM tbEmpresa
                JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Empresa não encontrada.' });
            }

            const idEmpresa = resultado[0].idEmpresa;

            // Passo 2 - Verifica se o telefone existe
            const telefoneAtual = await query(`
                SELECT *
                FROM tbFoneEmpresa
                WHERE idFoneEmpresa = ${id} AND idEmpresa = ${idEmpresa}
            `);

            if (telefoneAtual.length === 0) {
                return res.status(404).json({ erro: 'Telefone não encontrado.' });
            }

            // Passo 3 - Verifica se os dados são válidos

            let numeroAtualizado = telefoneAtual[0].numFoneEmpresa;
            if (validaTelefone(new_numero)) {
                numeroAtualizado = new_numero;
            }

            let visibilidadeAtualizada = telefoneAtual[0].visibilidadeTelefoneEmpresa;
            if (visibilidade !== undefined) {
                visibilidadeAtualizada = visibilidadeBoolean;
            }

            // Passo 4 - Inserir dados no banco

            await query(`UPDATE tbFoneEmpresa SET
            numFoneEmpresa = '${numeroAtualizado}',
            visibilidade = ${visibilidadeAtualizada}
            WHERE idFoneEmpresa = ${id} AND idEmpresa = ${idEmpresa}`);

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
                SELECT tbEmpresa.idEmpresa
                FROM tbEmpresa
                JOIN tbUsuario ON tbEmpresa.idUsuario = tbUsuario.idUsuario
                WHERE tbUsuario.usuario = '${usuario}'
            `);

            if (resultado.length == 0) {
                return res.status(404).erro('Empresa não encontrada')
            }
            const empresa = resultado[0];

            const consulta = query(`DELETE FROM tbFoneEmpresa WHERE idEmpresa = ${empresa.idEmpresa} AND idFoneEmpresa = ${id}`)

            return res.status(200).json({ mensagem: 'Telefone excluído com êxito.' })
        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })


router.route('usuario/cnpj/:cnpj')
    .get(async (req, res) => {

        const cnpj = req.params.cnpj || undefined;

        if (typeof cnpj == 'undefined') {
            return res.status(400).json({ erro: '`cnpj` nao é um campo válido.' });
        }


        try {

            const resposta = await query(`SELECT usuario FROM tbUsuario JOIN tbEmpresa ON tbEmpresa.idUsuario = tbUsuario.idUsuario WHERE cnpj = '${cnpj}'`);

            if (resposta.length == 0) {
                return res.status(404).json({ erro: 'Usuário não encontrado.' })
            }

            return res.json(resposta[0])

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

export default router;
