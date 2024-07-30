import { Router } from "express";

const router = Router();

router.route('/')
    .get(async (req, res) => {
        res.send('Teste Webhook!')
    })


export default router;
