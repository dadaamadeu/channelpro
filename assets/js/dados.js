/* ChannelPro — camada de dados
   Guarda tudo em localStorage (um único registro JSON chave-valor).
   Regra RN01: custo e receita são entidades independentes do vídeo.
   Custo dividido vive em "rateio" com a lista de vídeos, nunca embutido. */

'use strict';

var CanalDados = (function () {

  var CHAVE = 'ChannelPro.dados.v1';
  var VERSAO = 1;
  var assinantes = [];
  var estado = null;

  var STATUS_VIDEO = ['ideia', 'roteiro', 'gravado', 'editado', 'publicado'];
  var ROTULO_STATUS = {
    ideia: 'Ideia',
    roteiro: 'Roteiro',
    gravado: 'Gravado',
    editado: 'Editado',
    publicado: 'Publicado'
  };
  var ORIGENS_RECEITA = ['adsense', 'patrocinio', 'outro'];
  var ROTULO_ORIGEM = {
    adsense: 'YouTube/AdSense',
    patrocinio: 'Patrocínio',
    outro: 'Outro'
  };
  var CATEGORIAS_CUSTO = ['edicao', 'thumbnail', 'trilha', 'equipamento', 'software', 'arte', 'outro'];
  var ROTULO_CATEGORIA = {
    edicao: 'Edição',
    thumbnail: 'Thumbnail',
    trilha: 'Trilha e efeitos',
    equipamento: 'Equipamento',
    software: 'Software e assinaturas',
    arte: 'Arte e cenário',
    outro: 'Outro'
  };
  var LIMITE_ATRASO_PAGAMENTO = 30; /* RN03 */

  /* ---------------- estrutura ---------------- */

  function estadoInicial() {
    return {
      versao: VERSAO,
      config: {
        nomeCanal: '',
        onboardingConcluido: false,
        pastaMidiaPadrao: '',
        ultimoBackup: null
      },
      videos: [],
      marcas: [],
      patrocinios: [],
      custos: [],
      receitas: []
    };
  }

  function normalizar(bruto) {
    var base = estadoInicial();
    if (!bruto || typeof bruto !== 'object') return base;
    var saida = {
      versao: VERSAO,
      config: Object.assign(base.config, bruto.config || {}),
      videos: Array.isArray(bruto.videos) ? bruto.videos : [],
      marcas: Array.isArray(bruto.marcas) ? bruto.marcas : [],
      patrocinios: Array.isArray(bruto.patrocinios) ? bruto.patrocinios : [],
      custos: Array.isArray(bruto.custos) ? bruto.custos : [],
      receitas: Array.isArray(bruto.receitas) ? bruto.receitas : []
    };
    saida.videos.forEach(function (v) {
      if (STATUS_VIDEO.indexOf(v.status) === -1) v.status = 'ideia';
      v.views = Number(v.views) || 0;
    });
    saida.custos.forEach(function (c) {
      c.valor = Number(c.valor) || 0;
      if (c.modo !== 'rateio') c.modo = 'video';
      if (!Array.isArray(c.videoIds)) c.videoIds = c.videoId ? [c.videoId] : [];
    });
    saida.receitas.forEach(function (r) {
      r.valor = Number(r.valor) || 0;
      if (ORIGENS_RECEITA.indexOf(r.origem) === -1) r.origem = 'outro';
    });
    saida.patrocinios.forEach(function (p) {
      p.valor = Number(p.valor) || 0;
      p.alcance = Number(p.alcance) || 0;
      p.entregue = !!p.entregue;
      p.pago = !!p.pago;
      if (!Array.isArray(p.contratos)) p.contratos = [];
    });
    return saida;
  }

  function carregar() {
    var texto = null;
    try { texto = window.localStorage.getItem(CHAVE); } catch (erro) { texto = null; }
    if (!texto) { estado = estadoInicial(); return estado; }
    try {
      estado = normalizar(JSON.parse(texto));
    } catch (erro) {
      estado = estadoInicial();
    }
    return estado;
  }

  function salvar() {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (erro) {
      if (window.CanalUtil) CanalUtil.toast('Não foi possível gravar os dados no navegador.', 'erro');
    }
    assinantes.forEach(function (fn) { try { fn(estado); } catch (e) {} });
  }

  function aoMudar(fn) { assinantes.push(fn); }

  function obterEstado() {
    if (!estado) carregar();
    return estado;
  }

  /* ---------------- configuração ---------------- */

  function config() { return obterEstado().config; }

  function definirConfig(chave, valor) {
    obterEstado().config[chave] = valor;
    salvar();
  }

  /* ---------------- CRUD genérico ---------------- */

  function colecao(nome) {
    var e = obterEstado();
    if (!Array.isArray(e[nome])) e[nome] = [];
    return e[nome];
  }

  function listar(nome) { return colecao(nome).slice(); }

  function obter(nome, id) {
    return colecao(nome).filter(function (item) { return item.id === id; })[0] || null;
  }

  function inserir(nome, registro) {
    var novo = Object.assign({}, registro);
    if (!novo.id) novo.id = CanalUtil.uid(nome.slice(0, 3));
    colecao(nome).push(novo);
    salvar();
    return novo;
  }

  function atualizar(nome, id, mudancas) {
    var registro = obter(nome, id);
    if (!registro) return null;
    Object.assign(registro, mudancas);
    salvar();
    return registro;
  }

  function remover(nome, id) {
    var lista = colecao(nome);
    var indice = lista.findIndex(function (item) { return item.id === id; });
    if (indice === -1) return false;
    lista.splice(indice, 1);
    if (nome === 'videos') {
      colecao('receitas').forEach(function (r) { if (r.videoId === id) r.videoId = null; });
      colecao('custos').forEach(function (c) {
        if (c.videoId === id) c.videoId = null;
        c.videoIds = (c.videoIds || []).filter(function (v) { return v !== id; });
      });
      colecao('patrocinios').forEach(function (p) { if (p.videoId === id) p.videoId = null; });
    }
    if (nome === 'marcas') {
      colecao('patrocinios').forEach(function (p) { if (p.marcaId === id) p.marcaId = null; });
    }
    salvar();
    return true;
  }

  /* ---------------- cálculos de dinheiro ---------------- */

  function custoDoVideo(videoId) {
    return colecao('custos').reduce(function (total, custo) {
      if (custo.modo === 'rateio') {
        var alvos = custo.videoIds || [];
        if (!alvos.length) return total;
        if (alvos.indexOf(videoId) === -1) return total;
        return total + (custo.valor / alvos.length);
      }
      return custo.videoId === videoId ? total + custo.valor : total;
    }, 0);
  }

  function receitaDoVideo(videoId) {
    var direta = colecao('receitas').reduce(function (total, receita) {
      return receita.videoId === videoId ? total + receita.valor : total;
    }, 0);
    var patrocinada = colecao('patrocinios').reduce(function (total, p) {
      return (p.videoId === videoId && p.pago) ? total + p.valor : total;
    }, 0);
    return direta + patrocinada;
  }

  function linhasDeMargem() {
    return colecao('videos').map(function (video) {
      var receita = receitaDoVideo(video.id);
      var custo = custoDoVideo(video.id);
      var resultado = receita - custo;
      return {
        video: video,
        receita: receita,
        custo: custo,
        resultado: resultado,
        margem: receita > 0 ? (resultado / receita) * 100 : null
      };
    });
  }

  function nomeDoVideo(id) {
    var v = obter('videos', id);
    return v ? v.titulo : 'sem vídeo';
  }

  /* Situação da entrega de um patrocínio: pendente, atrasada ou entregue.
     Não confundir com pagamento (RF09). */
  function situacaoDaEntrega(patrocinio) {
    if (patrocinio.entregue) return 'entregue';
    if (!patrocinio.dataPrazo) return 'pendente';
    var dias = CanalUtil.diferencaEmDias(patrocinio.dataPrazo);
    if (dias !== null && dias > 0) return 'atrasada';
    return 'pendente';
  }

  function entregas() {
    var hoje = CanalUtil.hojeISO();
    return colecao('patrocinios').map(function (p) {
      var situacao = situacaoDaEntrega(p);
      var dias = p.dataPrazo ? CanalUtil.diferencaEmDias(p.dataPrazo) : null;
      var marca = obter('marcas', p.marcaId);
      return {
        patrocinio: p,
        situacao: situacao,
        venceHoje: !p.entregue && p.dataPrazo === hoje,
        diasDeAtraso: situacao === 'atrasada' ? dias : 0,
        diasParaVencer: (dias !== null && dias <= 0) ? Math.abs(dias) : null,
        marca: marca ? marca.nome : ''
      };
    }).sort(function (a, b) {
      var ordem = { atrasada: 0, pendente: 1, entregue: 2 };
      if (ordem[a.situacao] !== ordem[b.situacao]) return ordem[a.situacao] - ordem[b.situacao];
      var dataA = a.patrocinio.dataPrazo || '9999-12-31';
      var dataB = b.patrocinio.dataPrazo || '9999-12-31';
      return dataA < dataB ? -1 : (dataA > dataB ? 1 : 0);
    });
  }

  /* RF02 / RN03: entregue, não pago, mais de 30 dias desde a entrega */
  function recebimentosAtrasados(limite) {
    var dias = limite || LIMITE_ATRASO_PAGAMENTO;
    return colecao('patrocinios').filter(function (p) {
      if (!p.entregue || p.pago) return false;
      var referencia = p.dataEntrega || p.dataPrazo;
      if (!referencia) return false;
      var passados = CanalUtil.diferencaEmDias(referencia);
      return passados !== null && passados > dias;
    }).map(function (p) {
      var referencia = p.dataEntrega || p.dataPrazo;
      var marca = obter('marcas', p.marcaId);
      return {
        patrocinio: p,
        marca: marca ? marca.nome : '',
        diasEsperando: CanalUtil.diferencaEmDias(referencia)
      };
    }).sort(function (a, b) { return b.diasEsperando - a.diasEsperando; });
  }

  function resumoDoMes(isoReferencia) {
    var mes = (isoReferencia || CanalUtil.hojeISO()).slice(0, 7);
    var receitas = colecao('receitas').filter(function (r) { return (r.data || '').slice(0, 7) === mes; });
    var patrociniosPagos = colecao('patrocinios').filter(function (p) {
      return p.pago && (p.dataPagamento || '').slice(0, 7) === mes;
    });
    var custos = colecao('custos').filter(function (c) { return (c.data || '').slice(0, 7) === mes; });

    var entrou = receitas.reduce(function (t, r) { return t + r.valor; }, 0) +
                 patrociniosPagos.reduce(function (t, p) { return t + p.valor; }, 0);
    var saiu = custos.reduce(function (t, c) { return t + c.valor; }, 0);
    var aReceber = colecao('patrocinios').filter(function (p) { return p.entregue && !p.pago; })
      .reduce(function (t, p) { return t + p.valor; }, 0);

    return {
      mes: mes,
      entrou: entrou,
      saiu: saiu,
      sobrou: entrou - saiu,
      aReceber: aReceber,
      custosGerais: custos.filter(function (c) { return !c.videoId && (!c.videoIds || !c.videoIds.length); })
        .reduce(function (t, c) { return t + c.valor; }, 0)
    };
  }

  /* RF08 / RN04: histórico da própria usuária, valor por mil views praticado */
  function historicoDaMarca(marcaId) {
    var fechados = colecao('patrocinios').filter(function (p) {
      return p.marcaId === marcaId && p.valor > 0 && p.alcance > 0;
    });
    var total = fechados.reduce(function (t, p) { return t + p.valor; }, 0);
    var views = fechados.reduce(function (t, p) { return t + p.alcance; }, 0);
    return {
      fechamentos: fechados.length,
      total: total,
      views: views,
      porMilViews: views > 0 ? (total / views) * 1000 : null,
      itens: fechados.slice().sort(function (a, b) {
        return (b.dataPrazo || '') < (a.dataPrazo || '') ? -1 : 1;
      })
    };
  }

  /* ---------------- backup ---------------- */

  function exportarJSON() {
    var copia = JSON.parse(JSON.stringify(obterEstado()));
    copia.exportadoEm = new Date().toISOString();
    copia.aplicativo = 'ChannelPro';
    return JSON.stringify(copia, null, 2);
  }

  function importarJSON(texto) {
    var bruto;
    try { bruto = JSON.parse(texto); }
    catch (erro) { throw new Error('O arquivo não é um backup válido do ChannelPro.'); }
    if (!bruto || (!bruto.videos && !bruto.receitas && !bruto.custos)) {
      throw new Error('O arquivo não parece ser um backup do ChannelPro.');
    }
    estado = normalizar(bruto);
    salvar();
    return estado;
  }

  function apagarTudo() {
    estado = estadoInicial();
    salvar();
  }

  return {
    STATUS_VIDEO: STATUS_VIDEO,
    ROTULO_STATUS: ROTULO_STATUS,
    ORIGENS_RECEITA: ORIGENS_RECEITA,
    ROTULO_ORIGEM: ROTULO_ORIGEM,
    CATEGORIAS_CUSTO: CATEGORIAS_CUSTO,
    ROTULO_CATEGORIA: ROTULO_CATEGORIA,
    LIMITE_ATRASO_PAGAMENTO: LIMITE_ATRASO_PAGAMENTO,
    carregar: carregar,
    salvar: salvar,
    aoMudar: aoMudar,
    estado: obterEstado,
    config: config,
    definirConfig: definirConfig,
    listar: listar,
    obter: obter,
    inserir: inserir,
    atualizar: atualizar,
    remover: remover,
    custoDoVideo: custoDoVideo,
    receitaDoVideo: receitaDoVideo,
    linhasDeMargem: linhasDeMargem,
    nomeDoVideo: nomeDoVideo,
    situacaoDaEntrega: situacaoDaEntrega,
    entregas: entregas,
    recebimentosAtrasados: recebimentosAtrasados,
    resumoDoMes: resumoDoMes,
    historicoDaMarca: historicoDaMarca,
    exportarJSON: exportarJSON,
    importarJSON: importarJSON,
    apagarTudo: apagarTudo
  };
})();
