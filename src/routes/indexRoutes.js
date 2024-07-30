import { Router } from "express";

const router = Router();

router.route('/')
    .get(async (req, res) => {
        res.send('Hello World!')
    })


export default router;
