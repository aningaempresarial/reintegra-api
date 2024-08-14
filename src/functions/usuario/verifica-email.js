
export async function verificaEmailExiste(email) {
    try {
        const resultado = await query(`SELECT emailUsuario FROM tbUsuario WHERE emailUsuario = '${email}'`)
        if (resultado.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return undefined;
    }
}
