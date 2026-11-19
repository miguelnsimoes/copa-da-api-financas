'use strict';

// Treino 1 — códigos de status do Projeto 2.
const statusTreino1 = {
  a: 409, // nome de categoria já existente para o mesmo tipo
  b: 400, // tipo inválido
  c: 400, // parâmetros obrigatórios inicio e fim ausentes
  d: 401, // credenciais incorretas
  e: 404, // rota inexistente
  f: 201, // lançamento criado
};

// Treino 2 — a rota delega o SQL ao model, usa parâmetros e encerra
// a resposta assim que detecta que o registro não existe.
async function excluirFonteDestino(req, res, model) {
  const removidas = await model.excluir(req.params.id, req.auth.id);
  if (removidas === 0) {
    return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
  }
  return res.status(204).end();
}

// Exemplo de model para o treino 2: SQL parametrizado e isolado em models/.
async function excluirFonteDestinoModel(db, id, usuarioId) {
  const [resultado] = await db.query(
    'DELETE FROM fontes_destinos WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return resultado.affectedRows;
}

// Treino 3 — divide em centavos inteiros e coloca o resto na primeira parcela.
function dividirEmParcelas(valorReais, quantidade) {
  if (!Number.isFinite(valorReais) || valorReais < 0) {
    throw new TypeError('valorReais deve ser um número não negativo.');
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new RangeError('quantidade deve ser um inteiro positivo.');
  }

  const totalCentavos = Math.round(valorReais * 100);
  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, indice) =>
    (base + (indice === 0 ? resto : 0)) / 100
  );
}

// Treinos 4 e 5 — calcula fechamento, vencimento e referência (mês do vencimento).
function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

function dataComDiaLimitado(ano, mes, dia) {
  return new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)));
}

function somarMeses(ano, mes, quantidade) {
  const data = new Date(ano, mes + quantidade, 1);
  return { ano: data.getFullYear(), mes: data.getMonth() };
}

function formatarData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function calcularFaturas(compra, quantidade, valorReais, diaFechamento, diaVencimento) {
  if (!(compra instanceof Date) || Number.isNaN(compra.getTime())) {
    throw new TypeError('compra deve ser uma data válida.');
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new RangeError('quantidade deve ser um inteiro positivo.');
  }
  if (![diaFechamento, diaVencimento].every((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 31)) {
    throw new RangeError('dias de fechamento e vencimento devem estar entre 1 e 31.');
  }

  const parcelas = dividirEmParcelas(valorReais, quantidade);
  const anoCompra = compra.getFullYear();
  const mesCompra = compra.getMonth();
  const primeira = somarMeses(
    anoCompra,
    mesCompra,
    compra.getDate() >= diaFechamento ? 1 : 0
  );

  return parcelas.map((valor, indice) => {
    const fechamentoMes = somarMeses(primeira.ano, primeira.mes, indice);
    const fechamento = dataComDiaLimitado(
      fechamentoMes.ano,
      fechamentoMes.mes,
      diaFechamento
    );
    const mesVencimento = somarMeses(
      fechamentoMes.ano,
      fechamentoMes.mes,
      diaVencimento > diaFechamento ? 0 : 1
    );
    const vencimento = dataComDiaLimitado(
      mesVencimento.ano,
      mesVencimento.mes,
      diaVencimento
    );

    return {
      parcela: `${indice + 1}/${quantidade}`,
      valor,
      fechamento: formatarData(fechamento),
      vencimento: formatarData(vencimento),
      referencia: `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, '0')}`,
    };
  });
}

// Treino 4: fechamento 18, vencimento 3, compra em 18/08/2026, R$ 250 em 2x.
const respostaTreino4 = calcularFaturas(new Date(2026, 7, 18), 2, 250, 18, 3);

// Treino 5: fechamento 31, vencimento 8, compra em 31/01/2026, R$ 120 em 2x.
const respostaTreino5 = calcularFaturas(new Date(2026, 0, 31), 2, 120, 31, 8);

module.exports = {
  statusTreino1,
  excluirFonteDestino,
  excluirFonteDestinoModel,
  dividirEmParcelas,
  calcularFaturas,
  respostaTreino4,
  respostaTreino5,
};
