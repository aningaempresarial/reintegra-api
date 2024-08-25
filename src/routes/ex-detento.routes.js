import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

import { criarUsuario } from "../functions/usuario/criar-usuario.js";
import { validaSenha } from "../functions/usuario/valida-senha.js";
import { validaTelefone } from "../functions/utils/valida-telefone.js";
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



router.route('/')
    .get(async (req, res) => {

         try {
            const resultado = await query(`SELECT idExDetento, nomeExDetento, dataNascExDetento, logradouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento,tbUsuario.idUsuario, usuario FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE statusEntidade = 'ativo'`);
            res.json(resultado);
         } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
         }

    })

router.route('/simple')
    .post(upload.none(), async (req, res) => {
        const { nome, cpf, email, sexo, dataNasc, senha } = req.body || {};

        if (typeof(nome) != 'string') {
            return res.status(400).json({ erro: '`nome` não é um campo válido.' });
        }

        if (typeof(cpf) != 'string') {
            return res.status(400).json({ erro: '`cpf` não é um campo válido.' });
        }

        if (typeof(email) != 'string') {
            return res.status(400).json({ erro: '`email` não é um campo válido.' });
        }

        if (typeof(sexo) != 'string') {
            return res.status(400).json({ erro: '`sexo` não é um campo válido.' });
        }

        if (typeof(dataNasc) != 'string') {
            return res.status(400).json({ erro: '`dataNasc` não é um campo válido.' });
        }

        if (typeof(senha) != 'string') {
            return res.status(400).json({ erro: '`senha` não é um campo válido.' });
        }

        try {

            const usuario = await criarUsuario(nome, email, senha, 3);

            // Se o usuário foi criado, criar o exdetento e registrar no banco
            if (usuario[0]) {
                const consulta = await query(`INSERT INTO tbExDetento (nomeExDetento, cpfExDetento, dataNascExDetento, sexoExDetento, idUsuario) VALUES ('${nome}', '${cpf}', '${dataNasc}', '${sexo}', ${usuario[1]})`)

                return res.status(201).json({ mensagem: 'Login' });
            } else {
                return res.status(500).json({ erro: 'Erro ao criar usuario.' });
            }

        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/')
    .post(upload.none(), async (req, res) => {

        const { nome, cpf, email, dataNasc, logradouro, num, cep, bairro, cidade, estado, senha } = req.body || {};

        // Verificações de Existência de Conteúdo

        if (typeof(nome) != 'string') {
            return res.status(400).json({ erro: '`nome` não é um campo válido.' });
        }

        if (typeof(senha) != 'string') {
            return res.status(400).json({ erro: '`senha` não é um campo válido.' });
        }

        // Verificações no Banco
        try {
            console.log (nome)
            console.log (senha)
            //
            // Criação de Usuario
            const usuario = await criarUsuario(nome, email, senha, 3);

            // Se o usuário foi criado, criar a empresa e registrar no banco
            if (usuario[0]) {
                const consulta = await query(`INSERT INTO tbExDetento (nomeExDetento, cpfExDetento, dataNascExDetento, logradouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento, idUsuario) VALUES ('${nome}', '${cpf}', '${dataNasc}', '${logradouro}', '${num}', '${cep}', '${bairro}', '${cidade}', '${estado}', ${usuario[1]})`)

                return res.status(201).json({ mensagem: 'Login' });
            } else {
                return res.status(500).json({ erro: 'Erro ao criar usuario.' });
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
                SELECT idExDetento, nomeExDetento, dataNascExDetento, logradouroExDetento, numExDetento, cepExDetento, bairroExDetento, cidadeExDetento, estadoExDetento,
                usuario FROM tbExDetento JOIN tbUsuario ON tbUsuario.idUsuario = tbExDetento.idUsuario WHERE statusEntidade = 'ativo' AND usuario = '${usuario}'
            `);

            if (resultado.length === 0) {
                return res.status(404).json({ erro: 'Ex detento não encontrada.' });
            }

            let exDetento = resultado[0];

            const telefones = await query(`
                SELECT idFoneExDetento, numFoneExDetento
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
            logradouro,
            num,
            cep,
            bairro,
            cidade,
            estado
        } = req.body || {};

        try {

            // Passo 1 - Verificar se o ex-Detento existe.

            const resultado = await query(`
                SELECT
                    tbExDetento.cpfExDetento,
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
                    nomeExDetento = '${nomeAtualizado}',
                    logradouroExDetento = '${logradouro}',
                    numExDetento = '${num}',
                    cepExDetento = '${cep}',
                    bairroExDetento = '${bairro}',
                    cidadeExDetento = '${cidade}',
                    estadoExDetento = '${estado}'
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
            INSERT INTO tbFoneExDetento (numFoneExDetento, idExDetento)
            VALUES ('${numero}', ${idExDetento})`);

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
            numFoneExDetento = '${numeroAtualizado}'
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

            const consulta = query(`DELETE FROM tbFoneExDetento WHERE idExDetento = ${exDetento.idExDetento} AND idFoneExDetento = ${id}`)

            return res.status(200).json({ mensagem: 'Telefone excluído com êxito.' })
        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }

    })

router.route('/existe/:cpf')
    .get(async (req, res) => {

        const cpf = req.params.cpf || undefined;

        if (typeof cpf == 'undefined') {
            return res.status(400).json({ erro: '`cpf` nao é um campo válido.' });
        }

        try {
            const resultado = await query(`
                SELECT cpfExDetento
                FROM tbExDetento
                WHERE cpfExDetento = '${cpf}'
            `);

            if (resultado.length > 0) {
                return res.json({ existe: true })
            }

            return res.json({ existe: false })

        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })

// verifica se o cadastro está completo
router.route('/completo/:usuario')
    .get(async (req, res) => {
        const usuario = req.params.usuario || undefined;

        if (typeof usuario == 'undefined') {
            return res.status(400).json({
                erro: '`usuario` nao é um campo válido.'
            })
        }

        try {
            const resultado = await query(`
            SELECT e.*, f.*, ed.*, ex.*
            FROM tbExDetento e
            LEFT JOIN tbFoneExDetento f ON e.idExDetento = f.idExDetento
            LEFT JOIN tbEducacaoExDetento ed ON e.idExDetento = ed.idExDetento
            LEFT JOIN tbExperienciasExDetento ex ON e.idExDetento = ex.idExDetento
            JOIN tbUsuario u ON e.idUsuario = u.idUsuario
            WHERE (
            e.nomeExDetento IS NULL
            OR e.sexoExDetento IS NULL
            OR e.cpfExDetento IS NULL
            OR e.dataNascExDetento IS NULL
            OR e.logradouroExDetento IS NULL
            OR e.numExDetento IS NULL
            OR e.cepExDetento IS NULL
            OR e.bairroExDetento IS NULL
            OR e.cidadeExDetento IS NULL
            OR e.estadoExDetento IS NULL
            OR f.numFoneExDetento IS NULL
            OR ed.nomeEscola IS NULL
            OR ex.nomeEmpresaExpericencia IS NULL
            )
            AND u.usuario = '${usuario}';
            `)

            if (resultado.length > 0) {
                return res.json({ completo: false })
            } else {
                return res.json({ completo: true})
            }
        } catch(erro) {
            res.status(500).json({ erro: 'Erro ao processar a solicitação.', detalhe: erro.message });
        }
    })


export default router;


