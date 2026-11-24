/* ChannelPro — utilidades gerais
   Formatação, datas, dinheiro, modais e download de arquivos.
   Sem dependências externas: funciona offline em file://          */
'use strict';

var $ = function (seletor, raiz) { return (raiz || document).querySelector(seletor); };
var $$ = function (seletor, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor)); };

var CanalUtil = (function () {

  /* ---------- identificadores ---------- */
  function uid(prefixo) {
    var base = (prefixo || 'id') + '_';
    return base + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- datas ---------- */
  function doisDigitos(n) { return String(n).padStart(2, '0'); }

  function paraISO(data) {
    return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate());
  }

  function hojeISO() { return paraISO(new Date()); }

  function deISO(iso) {
    if (!iso) return null;
    var partes = String(iso).slice(0, 10).split('-');
    if (partes.length !== 3) return null;
    var d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatarData(iso) {
    var d = deISO(iso);
    if (!d) return '—';
    return doisDigitos(d.getDate()) + '/' + doisDigitos(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function formatarDataCurta(iso) {
    var d = deISO(iso);
    if (!d) return '—';
    return doisDigitos(d.getDate()) + '/' + doisDigitos(d.getMonth() + 1);
  }

  function diferencaEmDias(isoInicial, isoFinal) {
    var a = deISO(isoInicial), b = deISO(isoFinal || hojeISO());
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function adicionarDias(iso, dias) {
    var d = deISO(iso);
    if (!d) return null;
    d.setDate(d.getDate() + dias);
    return paraISO(d);
  }

  function inicioDaSemana(iso) {
    var d = deISO(iso || hojeISO());
    if (!d) return null;
    var diaSemana = d.getDay();          /* 0 = domingo */
    var recuo = diaSemana === 0 ? 6 : diaSemana - 1;
    d.setDate(d.getDate() - recuo);
    return paraISO(d);
  }

  function fimDaSemana(iso) {
    return adicionarDias(inicioDaSemana(iso), 6);
  }

  function mesmoMes(isoA, isoB) {
    if (!isoA || !isoB) return false;
    return String(isoA).slice(0, 7) === String(isoB).slice(0, 7);
  }

  function descricaoRelativa(iso) {
    var dias = diferencaEmDias(iso);
    if (dias === null) return '';
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias === -1) return 'amanhã';
    if (dias > 1) return 'há ' + dias + ' dias';
    return 'em ' + Math.abs(dias) + ' dias';
  }

  /* ---------- números e dinheiro ---------- */
  var formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var formatoNumero = new Intl.NumberFormat('pt-BR');

  function formatarMoeda(valor) {
    var n = Number(valor);
    return formatoMoeda.format(isFinite(n) ? n : 0);
  }

  function formatarNumero(valor) {
    var n = Number(valor);
    return formatoNumero.format(isFinite(n) ? n : 0);
  }

  function formatarPercentual(valor) {
    var n = Number(valor);
    if (!isFinite(n)) return '—';
    return n.toFixed(1).replace('.', ',') + '%';
  }

  /* Aceita "R$ 1.234,56", "1234,56", "1234.56", "-120" */
  function numeroDoTexto(texto) {
    if (texto === null || texto === undefined) return 0;
    if (typeof texto === 'number') return texto;
    var limpo = String(texto)
      .replace(/[R$\s\u00a0]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')
      .replace(/[^0-9.\-]/g, '');
    var n = parseFloat(limpo);
    return isFinite(n) ? n : 0;
  }

  /* ---------- texto ---------- */
  function escapar(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pluralizar(n, singular, plural) {
    return n === 1 ? singular : (plural || singular + 's');
  }

  /* ---------- avisos na tela ---------- */
  function toast(mensagem, tipo) {
    var area = $('#area-avisos');
    if (!area) return;
    var aviso = document.createElement('div');
    aviso.className = 'aviso aviso--' + (tipo || 'info');
    aviso.textContent = mensagem;
    area.appendChild(aviso);
    setTimeout(function () { aviso.classList.add('aviso--saindo'); }, 2600);
    setTimeout(function () { aviso.remove(); }, 3200);
  }

  /* ---------- modal ---------- */
  function abrirModal(opcoes) {
    fecharModal();
    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.id = 'modal-fundo';

    var largura = opcoes.largura === 'larga' ? 'modal--larga' : '';
    fundo.innerHTML =
      '<div class="modal ' + largura + '" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
        '<div class="modal__topo">' +
          '<h2 id="modal-titulo">' + escapar(opcoes.titulo || '') + '</h2>' +
          '<button type="button" class="botao botao--icone" data-acao="fechar-modal" aria-label="Fechar">✕</button>' +
        '</div>' +
        '<div class="modal__corpo"></div>' +
        '<div class="modal__rodape"></div>' +
      '</div>';

    var corpo = $('.modal__corpo', fundo);
    if (typeof opcoes.conteudo === 'string') corpo.innerHTML = opcoes.conteudo;
    else if (opcoes.conteudo) corpo.appendChild(opcoes.conteudo);

    var rodape = $('.modal__rodape', fundo);
    (opcoes.acoes || []).forEach(function (acao) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'botao ' + (acao.classe || 'botao--secundario');
      botao.textContent = acao.rotulo;
      botao.addEventListener('click', acao.aoClicar);
      rodape.appendChild(botao);
    });
    if (!rodape.children.length) rodape.remove();

    fundo.addEventListener('click', function (evento) {
      if (evento.target === fundo || evento.target.closest('[data-acao="fechar-modal"]')) fecharModal();
    });
    document.addEventListener('keydown', teclaEsc);

    document.body.appendChild(fundo);
    document.body.classList.add('com-modal');
    var primeiroCampo = $('input, select, textarea', corpo);
    if (primeiroCampo) primeiroCampo.focus();
    return fundo;
  }

  function teclaEsc(evento) {
    if (evento.key === 'Escape') fecharModal();
  }

  function fecharModal() {
    var existente = $('#modal-fundo');
    if (existente) existente.remove();
    document.body.classList.remove('com-modal');
    document.removeEventListener('keydown', teclaEsc);
  }

  /* ---------- arquivos ---------- */
  function baixarArquivo(nome, conteudo, tipoMime) {
    var blob = new Blob([conteudo], { type: tipoMime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function lerArquivoTexto(arquivo) {
    return new Promise(function (resolver, rejeitar) {
      var leitor = new FileReader();
      leitor.onload = function () { resolver(String(leitor.result)); };
      leitor.onerror = function () { rejeitar(new Error('Não foi possível ler o arquivo.')); };
      leitor.readAsText(arquivo, 'utf-8');
    });
  }

  function escolherArquivo(aceita) {
    return new Promise(function (resolver) {
      var entrada = document.createElement('input');
      entrada.type = 'file';
      entrada.accept = aceita || '';
      entrada.addEventListener('change', function () {
        resolver(entrada.files && entrada.files[0] ? entrada.files[0] : null);
      });
      entrada.click();
    });
  }

  /* ---------- tabela CSV ---------- */
  function parseCSV(texto, separador) {
    var sep = separador || detectarSeparador(texto);
    var linhas = [];
    var linha = [];
    var campo = '';
    var dentroDeAspas = false;

    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (dentroDeAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; }
          else dentroDeAspas = false;
        } else campo += c;
      } else if (c === '"') {
        dentroDeAspas = true;
      } else if (c === sep) {
        linha.push(campo); campo = '';
      } else if (c === '\n') {
        linha.push(campo); campo = '';
        linhas.push(linha); linha = [];
      } else if (c === '\r') {
        /* ignora */
      } else {
        campo += c;
      }
    }
    if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }

    return linhas.filter(function (l) {
      return l.some(function (v) { return String(v).trim() !== ''; });
    });
  }

  function detectarSeparador(texto) {
    var primeira = texto.split('\n')[0] || '';
    var contagem = { ';': 0, ',': 0, '\t': 0 };
    for (var i = 0; i < primeira.length; i++) {
      if (contagem[primeira[i]] !== undefined) contagem[primeira[i]]++;
    }
    var melhor = ',';
    var maior = -1;
    Object.keys(contagem).forEach(function (k) {
      if (contagem[k] > maior) { maior = contagem[k]; melhor = k; }
    });
    return melhor;
  }

  return {
    uid: uid,
    paraISO: paraISO,
    hojeISO: hojeISO,
    deISO: deISO,
    formatarData: formatarData,
    formatarDataCurta: formatarDataCurta,
    diferencaEmDias: diferencaEmDias,
    adicionarDias: adicionarDias,
    inicioDaSemana: inicioDaSemana,
    fimDaSemana: fimDaSemana,
    mesmoMes: mesmoMes,
    descricaoRelativa: descricaoRelativa,
    formatarMoeda: formatarMoeda,
    formatarNumero: formatarNumero,
    formatarPercentual: formatarPercentual,
    numeroDoTexto: numeroDoTexto,
    escapar: escapar,
    pluralizar: pluralizar,
    toast: toast,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
    baixarArquivo: baixarArquivo,
    lerArquivoTexto: lerArquivoTexto,
    escolherArquivo: escolherArquivo,
    parseCSV: parseCSV,
    detectarSeparador: detectarSeparador
  };
})();
