import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function criarPastaUsuario(id, tipoEntidade) {
    try {
        const entidades = ['empresa', 'ong', 'escola', 'ex-detento'];

        const userFolder = path.join(process.cwd(), '/public', 'profiles', String(id));

        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        const fotoPadrao = path.join(process.cwd(), '/public', 'default', `${entidades[tipoEntidade]}_foto.png`);
        const caminhoFotoUsuario = path.join(userFolder, 'foto.jpg');

        const bannerPadrao = path.join(process.cwd(), '/public', 'default', `${entidades[tipoEntidade]}_banner.png`);
        const caminhoBannerUsuario = path.join(userFolder, 'banner.jpg');

        fs.copyFileSync(fotoPadrao, caminhoFotoUsuario);

        fs.copyFileSync(bannerPadrao, caminhoBannerUsuario);

        return [`/public/profiles/${id}/foto.jpg`, `/public/profiles/${id}/banner.jpg`];

    } catch (error) {
        console.error('Erro ao criar a pasta do usuário:', error);
        return false;
    }
}
