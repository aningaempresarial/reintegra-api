export function validaTelefone(telefone) {
    if (telefone === undefined || telefone === null) return false;
    return typeof telefone === 'string' && /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(telefone);
}
