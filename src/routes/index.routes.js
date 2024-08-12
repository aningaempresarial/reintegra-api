import { Router } from "express";
import multer from "multer";
import { query } from '../db/query.js';

const router = Router();
const upload = multer();

router.route('/')
    .get(async (req, res) => {

        res.send('<h1>Olá Mundo!</h1>')
    })
    .post(upload.none(), async (req, res) => {

        const {
            nome,
            idade,
            sexo
        } = req.body || {};


    })

router.route('/:usuario')
    .put(upload.none(), async (req, res) => {

        const usuario = req.params.usuario || undefined;

    })

export default router;
