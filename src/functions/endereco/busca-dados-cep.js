import axios from "axios";

export function buscaDadosCep(cep) {
    const url = `https://www.cepaberto.com/api/v3/cep?cep=${cep}`;
    const headers = { 'Authorization': 'Token token=5040d1c3dfa00b26f23271b71f8192d5' };

    return new Promise((resolve, reject) => {
        axios.get(url, { headers })
            .then(response => {
                resolve([true, response.data]);
            })
            .catch(error => {
                resolve([false]);
            });
    });
}
