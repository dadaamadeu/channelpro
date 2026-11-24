/* ChannelPro — tela Dinheiro (RF04, RF05, RF06, RF07)
   A pergunta que ela responde: eu estou ganhando dinheiro nisso?
   Traz também os formulários de receita e custo, usados pelas outras telas.
   RN01: custo é entidade separada do vídeo. Rateio vive em "videoIds". */

'use strict';

var CanalTelaDinheiro = (function () {

  var ordenacao = { coluna: 'resultado', direcao: -1 };

  function render(raiz) {
    var resumo = CanalDados.resumoDoMes();
    var linhas = CanalDados.linhasDeMargem();

    var html = '' +
      '<div class="cabecalho-tela">' +
        '<div class="cabecalho-tela__texto">' +
          '<h1>Dinheiro</h1>' +
          '<span class="cabecalho-tela__sub">Quanto entrou, quanto saiu e o que sobrou por vídeo.</span>' +
        '</div>' +
        '<div class="cabecalho-tela__acoes">' +
          '<button type="button" class="botao botao--secundario" data-acao="relatorio-mes">🖨 Relatório do contador</button>' +
          '<button type="button" class="botao botao--secundario" data-acao="novo-custo">+ Custo</button>' +
          '<button type="button" class="botao botao--primario" data-acao="nova-receita">+ Receita</button>' +
        '</div>' +
      '</div>' +
      '<div class="grade-resumo">' +
        bloco('Entrou', CanalUtil.formatarMoeda(resumo.entrou), 'no mês corrente') +
        bloco('Saiu', CanalUtil.formatarMoeda(resumo.saiu), 'custos do mês') +
        bloco('Sobrou', CanalUtil.formatarMoeda(resumo.sobrou), resumo.sobrou >= 0 ? 'lucro' : 'prejuízo') +
        bloco('A receber', CanalUtil.formatarMoeda(resumo.aReceber), 'fora do mês também') +
      '</div>';

    html += '<div class="cartao">' +
      '<div class="cartao__topo"><h2>Margem por vídeo</h2>' +
        '<span class="cabecalho-tela__sub">Clique no título da coluna para ordenar.</span>' +
      '</div>';

    if (!linhas.length) {
      html += '<div class="cartao__corpo"><div class="vazio">' +
        '<span class="vazio__titulo">Nenhum vídeo cadastrado</span>' +
        '<span class="vazio__texto">Cadastre um vídeo na tela Conteúdo para ver aqui a receita, o custo e a margem dele.</span>' +
        '<button type="button" class="botao botao--primario" data-acao="ir-conteudo">Ir para Conteúdo</button>' +
        '</div></div>';
    } else {
      html += tabelaMargem(linhas) + '</div>';
    }

    raiz.innerHTML = html;
    ligarAcoes(raiz);
  }

  function bloco(rotulo, valor, nota) {
    return '<div class="bloco-numero">' +
      '<span class="bloco-numero__rotulo">' + CanalUtil.escapar(rotulo) + '</span>' +
      '<span class="bloco-numero__valor">' + CanalUtil.escapar(valor) + '</span>' +
      '<span class="bloco-numero__nota">' + CanalUtil.escapar(nota) + '</span>' +
    '</div>';
  }

  function tabelaMargem(linhas) {
    var copia = linhas.slice();
    var coluna = ordenacao.coluna;
    var direcao = ordenacao.direcao;

    copia.sort(function (a, b) {
      var va, vb;
      if (coluna === 'titulo') { va = a.video.titulo || ''; vb = b.video.titulo || ''; }
      else if (coluna === 'margem') { va = a.margem === null ? -999 : a.margem; vb = b.margem === null ? -999 : b.margem; }
      else { va = a[coluna]; vb = b[coluna]; }
      if (va === vb) return 0;
      return va > vb ? direcao : -direcao;
    });

    var seta = function (nome) {
      if (coluna !== nome) return '';
      return direcao === 1 ? ' ▲' : ' ▼';
    };

    var totalReceita = 0, totalCusto = 0, totalResultado = 0;

    var corpo = copia.map(function (l) {
      totalReceita += l.receita;
      totalCusto += l.custo;
      totalResultado += l.resultado;

      var margemTexto = l.margem === null ? '—' : CanalUtil.formatarPercentual(l.margem);
      var classeMargem = l.resultado < 0 ? ' class="valor-negativo"' : '';

      return '<tr>' +
        '<td>' + CanalUtil.escapar(l.video.titulo || 'Vídeo sem título') +
          (l.video.status ? '<br><span class="campo__ajuda">' + CanalUtil.escapar(CanalDados.ROTULO_STATUS[l.video.status] || l.video.status) + '</span>' : '') +
        '</td>' +
        '<td class="numero">' + CanalUtil.formatarMoeda(l.receita) + '</td>' +
        '<td class="numero">' + CanalUtil.formatarMoeda(l.custo) + '</td>' +
        '<td class="numero"' + classeMargem + '>' + CanalUtil.formatarMoeda(l.resultado) + '</td>' +
        '<td class="numero"' + classeMargem + '>' + margemTexto + '</td>' +
      '</tr>';
    }).join('');

    return '' +
      '<table class="tabela">' +
        '<thead><tr>' +
          '<th class="cabecalho-ordenavel" data-ordenar="titulo">Vídeo' + seta('titulo') + '</th>' +
          '<th class="cabecalho-ordenavel numero" data-ordenar="receita">Entrou' + seta('receita') + '</th>' +
          '<th class="cabecalho-ordenavel numero" data-ordenar="custo">Saiu' + seta('custo') + '</th>' +
          '<th class="cabecalho-ordenavel numero" data-ordenar="resultado">Sobrou' + seta('resultado') + '</th>' +
          '<th class="cabecalho-ordenavel numero" data-ordenar="margem">Margem' + seta('margem') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + corpo + '</tbody>' +
        '<tfoot><tr>' +
          '<th>Total</th>' +
          '<th class="numero">' + CanalUtil.formatarMoeda(totalReceita) + '</th>' +
          '<th class="numero">' + CanalUtil.formatarMoeda(totalCusto) + '</th>' +
          '<th class="numero">' + CanalUtil.formatarMoeda(totalResultado) + '</th>' +
          '<th class="numero">' + (totalReceita > 0 ? CanalUtil.formatarPercentual((totalResultado / totalReceita) * 100) : '—') + '</th>' +
        '</tr></tfoot>' +
      '</table>';
  }

  /* ---------- ações ---------- */

  function ligarAcoes(raiz) {
    CanalUtil.$$('[data-acao]', raiz).forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-acao');
        if (acao === 'nova-receita') abrirReceita(null, null);
        else if (acao === 'novo-custo') abrirCusto(null, null);
        else if (acao === 'relatorio-mes') CanalRelatorios.relatorioDoMes();
        else if (acao === 'ir-conteudo') CanalApp.irPara('conteudo');
      });
    });

    CanalUtil.$$('[data-ordenar]', raiz).forEach(function (celula) {
      celula.addEventListener('click', function () {
        var coluna = celula.getAttribute('data-ordenar');
        if (ordenacao.coluna === coluna) ordenacao.direcao = -ordenacao.direcao;
        else { ordenacao.coluna = coluna; ordenacao.direcao = coluna === 'titulo' ? 1 : -1; }
        CanalApp.recarregar();
      });
    });
  }

  /* ---------- receita ---------- */

  function abrirReceita(receita, videoIdFixo) {
    var r = receita || {};
    var videos = CanalDados.listar('videos');
    var opcoesOrigem = CanalDados.ORIGENS_RECEITA.map(function (chave) {
      return '<option value="' + chave + '"' + ((r.origem || 'adsense') === chave ? ' selected' : '') + '>' +
        CanalUtil.escapar(CanalDados.ROTULO_ORIGEM[chave] || chave) + '</option>';
    }).join('');

    var opcoesVideo = '<option value="">(não vincular a um vídeo)</option>' + videos.map(function (v) {
      var escolhido = (r.videoId || videoIdFixo) === v.id;
      return '<option value="' + v.id + '"' + (escolhido ? ' selected' : '') + '>' +
        CanalUtil.escapar(v.titulo) + '</option>';
    }).join('');

    var conteudo = '' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="r-data">Data do recebimento</label>' +
          '<input type="date" id="r-data" value="' + (r.data || CanalUtil.hojeISO()) + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="r-valor">Valor (R$)</label>' +
          '<input type="number" id="r-valor" min="0" step="0.01" value="' + (r.valor || '') + '" placeholder="0,00">' +
        '</div>' +
      '</div>' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="r-origem">De onde veio</label>' +
          '<select id="r-origem">' + opcoesOrigem + '</select>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="r-video">Vídeo</label>' +
          '<select id="r-video">' + opcoesVideo + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="campo">' +
        '<label class="campo__rotulo" for="r-descricao">Descrição</label>' +
        '<input type="text" id="r-descricao" value="' + CanalUtil.escapar(r.descricao || '') + '" placeholder="Ex.: AdSense de outubro">' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: r.id ? 'Editar receita' : 'Nova receita',
      conteudo: conteudo,
      acoes: [
        { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
        { rotulo: 'Salvar', classe: 'botao--primario', aoClicar: function () {
          var valor = CanalUtil.numeroDoTexto($('#r-valor').value);
          if (!valor || valor <= 0) {
            CanalUtil.toast('Informe um valor maior que zero.', 'erro');
            $('#r-valor').focus();
            return;
          }
          var dados = {
            data: $('#r-data').value || CanalUtil.hojeISO(),
            valor: valor,
            origem: $('#r-origem').value,
            videoId: $('#r-video').value || null,
            descricao: $('#r-descricao').value.trim()
          };
          if (r.id) CanalDados.atualizar('receitas', r.id, dados);
          else CanalDados.inserir('receitas', dados);
          CanalUtil.fecharModal();
          CanalUtil.toast('Receita lançada.');
          CanalApp.recarregar();
        } }
      ]
    });
  }

  /* ---------- custo ---------- */

  function abrirCusto(custo, videoIdFixo) {
    var c = custo || {};
    var videos = CanalDados.listar('videos');
    var modo = c.modo || (videoIdFixo ? 'video' : 'geral');
    var marcados = (c.videoIds || (c.videoId ? [c.videoId] : [])).slice();
    if (videoIdFixo && !marcados.length) marcados = [videoIdFixo];

    var opcoesCategoria = CanalDados.CATEGORIAS_CUSTO.map(function (chave) {
      return '<option value="' + chave + '"' + ((c.categoria || 'edicao') === chave ? ' selected' : '') + '>' +
        CanalUtil.escapar(CanalDados.ROTULO_CATEGORIA[chave] || chave) + '</option>';
    }).join('');

    var opcoesVideo = videos.map(function (v) {
      return '<option value="' + v.id + '"' + ((c.videoId || videoIdFixo) === v.id ? ' selected' : '') + '>' +
        CanalUtil.escapar(v.titulo) + '</option>';
    }).join('');

    var listaSelecao = videos.map(function (v) {
      return '<label style="display:flex;gap:6px;align-items:center;padding:3px 0">' +
        '<input type="checkbox" class="c-video-rateio" value="' + v.id + '"' +
          (marcados.indexOf(v.id) !== -1 ? ' checked' : '') + '> ' +
        CanalUtil.escapar(v.titulo) + '</label>';
    }).join('');

    var conteudo = '' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="c-data">Data do gasto</label>' +
          '<input type="date" id="c-data" value="' + (c.data || CanalUtil.hojeISO()) + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="c-valor">Valor (R$)</label>' +
          '<input type="number" id="c-valor" min="0" step="0.01" value="' + (c.valor || '') + '" placeholder="0,00">' +
        '</div>' +
      '</div>' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="c-categoria">Categoria</label>' +
          '<select id="c-categoria">' + opcoesCategoria + '</select>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="c-descricao">Descrição</label>' +
          '<input type="text" id="c-descricao" value="' + CanalUtil.escapar(c.descricao || '') + '" placeholder="Ex.: edição do vídeo de terça">' +
        '</div>' +
      '</div>' +
      '<div class="campo">' +
        '<label class="campo__rotulo" for="c-modo">Esse custo é de...</label>' +
        '<select id="c-modo">' +
          '<option value="video"' + (modo === 'video' ? ' selected' : '') + '>um vídeo só</option>' +
          '<option value="rateio"' + (modo === 'rateio' ? ' selected' : '') + '>dividido entre vários vídeos</option>' +
          '<option value="geral"' + (modo === 'geral' ? ' selected' : '') + '>do canal inteiro</option>' +
        '</select>' +
      '</div>' +
      '<div class="campo" id="c-campo-video">' +
        '<label class="campo__rotulo" for="c-video">Qual vídeo</label>' +
        '<select id="c-video"><option value="">— escolha —</option>' + opcoesVideo + '</select>' +
      '</div>' +
      '<div class="campo" id="c-campo-rateio">' +
        '<label class="campo__rotulo">Entre quais vídeos</label>' +
        '<div>' + (listaSelecao || '<span class="campo__ajuda">Nenhum vídeo cadastrado ainda.</span>') + '</div>' +
        '<span class="campo__ajuda" id="c-previa-rateio"></span>' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: c.id ? 'Editar custo' : 'Novo custo',
      conteudo: conteudo,
      acoes: [
        { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
        { rotulo: 'Salvar', classe: 'botao--primario', aoClicar: salvar }
      ]
    });

    var campoVideo = $('#c-campo-video');
    var campoRateio = $('#c-campo-rateio');
    var seletorModo = $('#c-modo');

    function ajustarModo() {
      campoVideo.style.display = seletorModo.value === 'video' ? 'flex' : 'none';
      campoRateio.style.display = seletorModo.value === 'rateio' ? 'flex' : 'none';
      atualizarPrevia();
    }

    function atualizarPrevia() {
      var previa = $('#c-previa-rateio');
      if (!previa) return;
      var valor = CanalUtil.numeroDoTexto($('#c-valor').value);
      var escolhidos = CanalUtil.$$('.c-video-rateio').filter(function (x) { return x.checked; });
      if (!valor || !escolhidos.length) {
        previa.textContent = 'Marque os vídeos do pacote. A divisão é feita em partes iguais.';
        return;
      }
      previa.textContent = CanalUtil.formatarMoeda(valor) + ' divididos em ' + escolhidos.length +
        (escolhidos.length === 1 ? ' vídeo = ' : ' vídeos = ') +
        CanalUtil.formatarMoeda(valor / escolhidos.length) + ' cada.';
    }

    seletorModo.addEventListener('change', ajustarModo);
    $('#c-valor').addEventListener('input', atualizarPrevia);
    CanalUtil.$$('.c-video-rateio').forEach(function (caixa) {
      caixa.addEventListener('change', atualizarPrevia);
    });
    ajustarModo();

    function salvar() {
      var valor = CanalUtil.numeroDoTexto($('#c-valor').value);
      if (!valor || valor <= 0) {
        CanalUtil.toast('Informe um valor maior que zero.', 'erro');
        $('#c-valor').focus();
        return;
      }

      var dados = {
        data: $('#c-data').value || CanalUtil.hojeISO(),
        valor: valor,
        categoria: $('#c-categoria').value,
        descricao: $('#c-descricao').value.trim(),
        modo: seletorModo.value,
        videoId: null,
        videoIds: []
      };

      if (dados.modo === 'video') {
        dados.videoId = $('#c-video').value || null;
        if (!dados.videoId) {
          CanalUtil.toast('Escolha o vídeo deste custo.', 'erro');
          return;
        }
      } else if (dados.modo === 'rateio') {
        dados.videoIds = CanalUtil.$$('.c-video-rateio').filter(function (x) { return x.checked; })
          .map(function (x) { return x.value; });
        if (!dados.videoIds.length) {
          CanalUtil.toast('Marque ao menos um vídeo para dividir o custo.', 'erro');
          return;
        }
      }

      if (c.id) CanalDados.atualizar('custos', c.id, dados);
      else CanalDados.inserir('custos', dados);

      CanalUtil.fecharModal();
      CanalUtil.toast('Custo lançado.');
      CanalApp.recarregar();
    }
  }

  return {
    render: render,
    abrirReceita: abrirReceita,
    abrirCusto: abrirCusto
  };
})();
