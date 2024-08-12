
export function validaEmail(email) {
    if ((email == null) || (email.length < 4))
    return false;

    var partes = email.split('@');
    if (partes.length < 2 ) return false;

    var pre = partes[0];
    if (pre.length == 0) return false;

    if (!/^[a-zA-Z0-9_.-/+]+$/.test(pre))
        return false;

    var partesDoDominio = partes[1].split('.');
    if (partesDoDominio.length < 2 ) return false;

    for ( var indice = 0; indice < partesDoDominio.length; indice++ )
    {
        var parteDoDominio = partesDoDominio[indice];

        if (parteDoDominio.length == 0) return false;

        if (!/^[a-zA-Z0-9-]+$/.test(parteDoDominio))
            return false;
    }

    return true;
}
