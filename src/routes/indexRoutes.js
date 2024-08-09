import { Router } from "express";
import { query } from '../utils/query.js';

const router = Router();

router.route('/')
    .get(async (req, res) => {

        const resultado = await query('SELECT * FROM tbTeste')

        res.json(resultado);
    })


export default router;
