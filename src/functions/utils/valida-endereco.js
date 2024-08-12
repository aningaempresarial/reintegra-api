
export function validaLogradouro(logradouro) {
    if (logradouro === undefined || logradouro === null) return false;
    return typeof logradouro === 'string' && logradouro.length > 0;
}

export function validaNumero(numero) {
    if (numero === undefined || numero === null) return false;
    return typeof numero === 'string' && !isNaN(numero);
}

export function validaCEP(cep) {
    if (cep === undefined || cep === null) return false;
    return typeof cep === 'string' && /^\d{5}-?\d{3}$/.test(cep);
}

export function validaBairro(bairro) {
    if (bairro === undefined || bairro === null) return false;
    return typeof bairro === 'string' && bairro.length > 0;
}

export function validaEstado(estado) {
    if (estado === undefined || estado === null) return false;
    return typeof estado === 'string' && estadosValidos.includes(estado.toUpperCase());
}
