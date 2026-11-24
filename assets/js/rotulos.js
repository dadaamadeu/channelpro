/* ChannelPro — rótulos legíveis
   As listas de dados guardam chaves técnicas ("edicao", "adsense").
   Aqui fica a tradução para o que a pessoa lê na tela.
   Regra de vocabulário (RF16): nada de jargão de agência. */

'use strict';

var CanalRotulos = (function () {

  var STATUS = {
    ideia: 'Ideia',
    roteiro: 'Roteiro',
    gravado: 'Gravado',
    editado: 'Editado',
    publicado: 'Publicado'
  };

  var ORIGEM = {
    adsense: 'AdSense (YouTube)',
    patrocinio: 'Patrocínio',
    outro: 'Outro'
  };

  var CATEGORIA = {
    edicao: 'Edição',
    thumbnail: 'Thumbnail',
    trilha: 'Trilha sonora',
    equipamento: 'Equipamento',
    software: 'Software e assinaturas',
    arte: 'Arte',
    outro: 'Outro'
  };

  var MODO_CUSTO = {
    video: 'Só deste vídeo',
    rateio: 'Dividido entre vários vídeos',
    geral: 'Do canal (sem vídeo)'
  };

  function buscar(mapa, chave) {
    if (!chave) return '';
    return mapa[chave] || String(chave);
  }

  return {
    status: function (chave) { return buscar(STATUS, chave); },
    origem: function (chave) { return buscar(ORIGEM, chave); },
    categoria: function (chave) { return buscar(CATEGORIA, chave); },
    modoCusto: function (chave) { return buscar(MODO_CUSTO, chave); },
    mapa: { status: STATUS, origem: ORIGEM, categoria: CATEGORIA, modoCusto: MODO_CUSTO }
  };
})();
