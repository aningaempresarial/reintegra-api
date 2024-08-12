import bcrypt from 'bcryptjs';

export async function geraHash(senha) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(senha, salt);
        return hash;
    } catch (erro) {
        throw new Error('Erro ao gerar hash: ' + erro.message);
    }
}
