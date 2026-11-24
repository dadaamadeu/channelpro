/* ChannelPro — tela Conteúdo (RF04, RF05, RF12, RF17)
   Pipeline de vídeos em cinco colunas + ficha do vídeo.
   Mover cartão: botões ◀ ▶ ou arrastar até a coluna (RF05).
   A ficha concentra receitas, custos, patrocínios, pasta de mídia e Studio. */

'use strict';

var CanalTelaConteudo = (function () {

  /* ---------- dinheiro do vídeo (uma consulta por chamada é caro no quadro;
     a ficha consulta uma vez só) ---------- */

  function linhaDoVideo(videoId) {
    return CanalDados.linhasDeMargem().filter(function (l) { return l.video.id === videoId; })[0] || null;
  }

  function bloco(rotulo, valor, nota) {
    return '<div class="bloco-numero">' +
      '<span class="bloco-numero__rotulo">' + CanalUtil.escapar(rotulo) + '</span>' +
      '<span class="bloco-numero__valor">' + CanalUtil.escapar(valor) + '</span>' +
      '<span class="bloco-numero__nota">' + CanalUtil.escapar(nota) + '</span>' +
    '</div>';
  }

  /* ---------- cartão do quadro ---------- */

  function metaHtml(video) {
    var partes = [];
    if (video.dataPrevista) partes.push('previsto ' + CanalUtil.formatarDataCurta(video.dataPrevista));
    if (video.dataPublicacao) partes.push('publicado ' + CanalUtil.formatarDataCurta(video.dataPublicacao));
    if (video.views > 0) partes.push(CanalUtil.formatarNumero(video.views) + ' views');
    return partes.length
      ? '<div class="cartao-video__meta"><span>' + CanalUtil.escapar(partes.join(' · ')) + '</span></div>'
      : '';
  }

  function valoresHtml(linha) {
    if (!linha || (!linha.receita && !linha.custo)) return '';
    var classe = linha.resultado < 0
      ? 'cartao-video__linha--negativo'
      : (linha.resultado > 0 ? 'cartao-video__linha--positivo' : '');
    return '<div class="cartao-video__valores">' +
      '<div class="cartao-video__linha"><span>Entrou</span><span>' + CanalUtil.formatarMoeda(linha.receita) + '</span></div>' +
      '<div class="cartao-video__linha"><span>Saiu</span><span>' + CanalUtil.formatarMoeda(linha.custo) + '</span></div>' +
      '<div class="cartao-video__linha ' + classe + '"><span>Sobrou</span><span>' + CanalUtil.formatarMoeda(linha.resultado) + '</span></div>' +
    '</div>';
  }

  function cartao(video, indice, totalColunas) {
    var podeVoltar = indice > 0;
    var podeAvancar = indice < totalColunas - 1;

    var acoes = '';
    if (podeVoltar) {
      acoes += '<button type="button" class="botao botao--icone botao--mini" data-acao="mover" data-id="' + video.id + '" data-dir="-1" title="Mover para a coluna anterior" aria-label="Mover para trás">◀</button>';
    }
    if (podeAvancar) {
      acoes += '<button type="button" class="botao botao--icone botao--mini" data-acao="mover" data-id="' + video.id + '" data-dir="1" title="Mover para a próxima coluna" aria-label="Avançar coluna">▶</button>';
    }
    if (!acoes) acoes = '<span class="campo__ajuda">fim do pipeline</span>';

    return '' +
      '<div class="cartao-video" draggable="true" data-id="' + video.id + '" tabindex="0" role="button" aria-label="Abrir ficha do vídeo">' +
        '<div class="cartao-video__titulo">' + CanalUtil.escapar(video.titulo || 'Vídeo sem título') + '</div>' +
        metaHtml(video) +
        valoresHtml(linhaDoVideo(video.id)) +
        '<div class="cartao-video__acoes">' + acoes + '</div>' +
      '</div>';
  }

  /* ---------- tela ---------- */

  function render(raiz) {
    var videos = CanalDados.listar('videos');
    var status = CanalDados.STATUS_VIDEO;
    var rotulos = CanalDados.ROTULO_STATUS;

    var html = '' +
      '<div class="cabecalho-tela">' +
        '<div class="cabecalho-tela__texto">' +
          '<h1>Conteúdo</h1>' +
          '<span class="cabecalho-tela__sub">Cada vídeo do canal, da ideia até publicar. Clique no cartão para abrir a ficha.</span>' +
        '</div>' +
        '<div class="cabecalho-tela__acoes">' +
          '<button type="button" class="botao botao--primario" data-acao="novo-video">+ Novo vídeo</button>' +
        '</div>' +
      '</div>';

    if (!videos.length) {
      html += '<div class="cartao"><div class="cartao__corpo"><div class="vazio">' +
        '<span class="vazio__titulo">Nenhum vídeo cadastrado</span>' +
        '<span class="vazio__texto">Cadastre o primeiro vídeo — mesmo que seja só uma ideia — para acompanhar prazo, custo e resultado dele.</span>' +
        '<button type="button" class="botao botao--primario" data-acao="novo-video">+ Novo vídeo</button>' +
        '</div></div></div>';
    }

    html += '<div class="quadro">';
    status.forEach(function (chave, indice) {
      var daColuna = videos.filter(function (v) { return v.status === chave; });
      html += '<div class="coluna" data-status="' + chave + '">' +
        '<div class="coluna__topo">' +
          '<span class="coluna__titulo">' + CanalUtil.escapar(rotulos[chave] || chave) + '</span>' +
          '<span class="coluna__contagem">' + daColuna.length + '</span>' +
        '</div>';
      if (!daColuna.length) {
        html += '<div class="coluna__vazio">Nenhum vídeo</div>';
      } else {
        daColuna.forEach(function (v) { html += cartao(v, indice, status.length); });
      }
      html += '</div>';
    });
    html += '</div>';

    raiz.innerHTML = html;
    ligar(raiz);
  }

  /* ---------- interação ---------- */

  function ligar(raiz) {
    CanalUtil.$$('[data-acao]', raiz).forEach(function (botao) {
      botao.addEventListener('click', function (evento) {
        /* stopPropagation: os botões do cartão não podem abrir a ficha */
        evento.stopPropagation();
        var acao = botao.getAttribute('data-acao');
        var id = botao.getAttribute('data-id');
        if (acao === 'novo-video') abrirVideo(null);
        else if (acao === 'mover') mover(id, Number(botao.getAttribute('data-dir')));
      });
    });

    CanalUtil.$$('.cartao-video', raiz).forEach(function (elemento) {
      elemento.addEventListener('click', function () {
        abrirFicha(elemento.getAttribute('data-id'));
      });
      elemento.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          abrirFicha(elemento.getAttribute('data-id'));
        }
      });
      elemento.addEventListener('dragstart', function (evento) {
        evento.dataTransfer.setData('text/plain', elemento.getAttribute('data-id'));
        elemento.classList.add('cartao-video--arrastando');
      });
      elemento.addEventListener('dragend', function () {
        elemento.classList.remove('cartao-video--arrastando');
      });
    });

    CanalUtil.$$('.coluna', raiz).forEach(function (coluna) {
      coluna.addEventListener('dragover', function (evento) {
        evento.preventDefault();
        coluna.classList.add('coluna--alvo');
      });
      coluna.addEventListener('dragleave', function () {
        coluna.classList.remove('coluna--alvo');
      });
      coluna.addEventListener('drop', function (evento) {
        evento.preventDefault();
        coluna.classList.remove('coluna--alvo');
        var id = evento.dataTransfer.getData('text/plain');
        if (id) moverPara(id, coluna.getAttribute('data-status'));
      });
    });
  }

  function mover(id, direcao) {
    var video = CanalDados.obter('videos', id);
    if (!video) return;
    var indice = CanalDados.STATUS_VIDEO.indexOf(video.status);
    var alvo = indice + direcao;
    if (alvo < 0 || alvo >= CanalDados.STATUS_VIDEO.length) return;
    moverPara(id, CanalDados.STATUS_VIDEO[alvo]);
  }

  function moverPara(id, status) {
    var video = CanalDados.obter('videos', id);
    if (!video || video.status === status) return;
    CanalDados.atualizar('videos', id, { status: status });
    CanalUtil.toast('"' + (video.titulo || 'Vídeo') + '" agora está em "' + (CanalDados.ROTULO_STATUS[status] || status) + '".');
    CanalApp.recarregar();
  }

  /* ---------- formulário do vídeo ---------- */

  function abrirVideo(video) {
    var v = video || {};
    var opcoesStatus = CanalDados.STATUS_VIDEO.map(function (chave) {
      return '<option value="' + chave + '"' + ((v.status || 'ideia') === chave ? ' selected' : '') + '>' +
        CanalUtil.escapar(CanalDados.ROTULO_STATUS[chave]) + '</option>';
    }).join('');

    var conteudo = '' +
      '<div class="grade-campos">' +
        '<div class="campo campo--largo">' +
          '<label class="campo__rotulo" for="v-titulo">Título do vídeo</label>' +
          '<input type="text" id="v-titulo" value="' + CanalUtil.escapar(v.titulo || '') + '" placeholder="Ex.: Como fiz X em Y minutos">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="v-status">Etapa</label>' +
          '<select id="v-status">' + opcoesStatus + '</select>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="v-views">Visualizações</label>' +
          '<input type="number" id="v-views" min="0" step="1" value="' + (v.views || '') + '" placeholder="0">' +
          '<span class="campo__ajuda">O ChannelPro não se conecta ao YouTube; atualize aqui quando quiser.</span>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="v-prevista">Data prevista</label>' +
          '<input type="date" id="v-prevista" value="' + (v.dataPrevista || '') + '">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="v-publicacao">Data de publicação</label>' +
          '<input type="date" id="v-publicacao" value="' + (v.dataPublicacao || '') + '">' +
        '</div>' +
        '<div class="campo campo--largo">' +
          '<label class="campo__rotulo" for="v-link">Link do vídeo (YouTube ou Studio)</label>' +
          '<input type="url" id="v-link" value="' + CanalUtil.escapar(v.link || '') + '" placeholder="https://...">' +
        '</div>' +
        '<div class="campo campo--largo">' +
          '<label class="campo__rotulo" for="v-pasta">Pasta dos arquivos no computador</label>' +
          '<input type="text" id="v-pasta" value="' + CanalUtil.escapar(v.pastaMidia || '') + '" placeholder="Ex.: D:\\Videos\\brutos\\video-x">' +
          '<span class="campo__ajuda">A ficha cria um atalho para abrir esta pasta.</span>' +
        '</div>' +
        '<div class="campo campo--largo">' +
          '<label class="campo__rotulo" for="v-observacao">Observação</label>' +
          '<textarea id="v-observacao" rows="2">' + CanalUtil.escapar(v.observacao || '') + '</textarea>' +
        '</div>' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: v.id ? 'Editar vídeo' : 'Novo vídeo',
      conteudo: conteudo,
      acoes: [
        { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
        { rotulo: 'Salvar', classe: 'botao--primario', aoClicar: function () {
          var titulo = $('#v-titulo').value.trim();
          if (!titulo) {
            CanalUtil.toast('Dê um título ao vídeo.', 'erro');
            $('#v-titulo').focus();
            return;
          }
          var dados = {
            titulo: titulo,
            status: $('#v-status').value,
            views: CanalUtil.numeroDoTexto($('#v-views').value),
            dataPrevista: $('#v-prevista').value || null,
            dataPublicacao: $('#v-publicacao').value || null,
            link: $('#v-link').value.trim(),
            pastaMidia: $('#v-pasta').value.trim(),
            observacao: $('#v-observacao').value.trim()
          };
          if (v.id) CanalDados.atualizar('videos', v.id, dados);
          else CanalDados.inserir('videos', dados);
          CanalUtil.fecharModal();
          CanalUtil.toast(v.id ? 'Vídeo atualizado.' : 'Vídeo criado.');
          CanalApp.recarregar();
        } }
      ]
    });
  }

  /* ---------- ficha do vídeo (RF04) ---------- */

  function etiquetasDoPatrocinio(p) {
    var entrega;
    if (p.entregue) entrega = '<span class="etiqueta etiqueta--entregue">entregue</span>';
    else if (CanalDados.situacaoDaEntrega(p) === 'atrasada') entrega = '<span class="etiqueta etiqueta--atrasada">atrasada</span>';
    else entrega = '<span class="etiqueta etiqueta--pendente">entrega pendente</span>';
    var pagamento = p.pago
      ? '<span class="etiqueta etiqueta--pago">pago</span>'
      : '<span class="etiqueta etiqueta--naopago">a receber</span>';
    return entrega + ' ' + pagamento;
  }

  function linhaPatrocinio(p) {
    var marca = CanalDados.obter('marcas', p.marcaId);
    return '<div class="ficha-linha">' +
      '<span class="ficha-linha__principal">' + CanalUtil.escapar(p.descricao || 'Entrega') +
        (marca ? '<br><span class="campo__ajuda">' + CanalUtil.escapar(marca.nome) + '</span>' : '') + '</span>' +
      '<span class="ficha-linha__etiquetas">' + etiquetasDoPatrocinio(p) + '</span>' +
      '<span class="numero">' + CanalUtil.formatarMoeda(p.valor) + '</span>' +
    '</div>';
  }

  function tabelaReceitas(receitas) {
    return '<table class="tabela-simples">' +
      '<thead><tr><th>Data</th><th>Descrição</th><th class="numero">Valor</th></tr></thead><tbody>' +
      receitas.map(function (r) {
        return '<tr><td>' + CanalUtil.formatarData(r.data) + '</td><td>' + CanalUtil.escapar(r.descricao || '') + '</td>' +
          '<td class="numero">' + CanalUtil.formatarMoeda(r.valor) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function tabelaCustos(custos) {
    return '<table class="tabela-simples">' +
      '<thead><tr><th>Data</th><th>Descrição</th><th class="numero">Valor</th></tr></thead><tbody>' +
      custos.map(function (c) {
        var detalhe = c.modo === 'rateio'
          ? ' (dividido entre ' + (c.videoIds || []).length + ' vídeos)'
          : '';
        return '<tr><td>' + CanalUtil.formatarData(c.data) + '</td><td>' + CanalUtil.escapar(c.descricao || '') + detalhe + '</td>' +
          '<td class="numero">' + CanalUtil.formatarMoeda(c.valor) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function abrirFicha(videoId) {
    var video = CanalDados.obter('videos', videoId);
    if (!video) return;
    var linha = linhaDoVideo(videoId);
    var patrocinios = CanalDados.listar('patrocinios').filter(function (p) { return p.videoId === videoId; });
    var receitas = CanalDados.listar('receitas').filter(function (r) { return r.videoId === videoId; });
    var custos = CanalDados.listar('custos').filter(function (c) {
      return c.videoId === videoId || (c.modo === 'rateio' && (c.videoIds || []).indexOf(videoId) !== -1);
    });
    var pasta = video.pastaMidia || CanalDados.config().pastaMidiaPadrao || '';
    var margem = (linha && linha.margem !== null && linha.margem !== undefined)
      ? CanalUtil.formatarPercentual(linha.margem)
      : '—';

    var html = '' +
      '<div class="grade-resumo">' +
        bloco('Entrou', CanalUtil.formatarMoeda(linha ? linha.receita : 0), 'receitas e patrocínios pagos') +
        bloco('Saiu', CanalUtil.formatarMoeda(linha ? linha.custo : 0), 'custos diretos e rateio') +
        bloco('Sobrou', CanalUtil.formatarMoeda(linha ? linha.resultado : 0), 'resultado do vídeo') +
        bloco('Margem', margem, 'sobrou dividido pelo que entrou') +
      '</div>' +
      '<p class="dica">' + CanalUtil.escapar(CanalDados.ROTULO_STATUS[video.status] || 'Ideia') +
        (video.dataPrevista ? ' · previsto para ' + CanalUtil.formatarData(video.dataPrevista) : '') +
        (video.dataPublicacao ? ' · publicado em ' + CanalUtil.formatarData(video.dataPublicacao) : '') +
        (video.views ? ' · ' + CanalUtil.formatarNumero(video.views) + ' views' : '') +
      '</p>' +
      (video.observacao ? '<p class="dica dica--alerta">' + CanalUtil.escapar(video.observacao) + '</p>' : '') +

      '<div class="ficha-secao">' +
        '<div class="linha linha--separada"><h3 class="ficha-secao__titulo">Patrocínios</h3>' +
          '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="nova-entrega">+ Entrega deste vídeo</button></div>' +
        (patrocinios.length ? patrocinios.map(linhaPatrocinio).join('') : '<p class="dica">Nenhum patrocínio vinculado.</p>') +
      '</div>' +

      '<div class="ficha-secao">' +
        '<div class="linha linha--separada"><h3 class="ficha-secao__titulo">Receitas</h3>' +
          '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="nova-receita">+ Receita</button></div>' +
        (receitas.length ? tabelaReceitas(receitas) : '<p class="dica">Nenhuma receita lançada.</p>') +
      '</div>' +

      '<div class="ficha-secao">' +
        '<div class="linha linha--separada"><h3 class="ficha-secao__titulo">Custos</h3>' +
          '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="novo-custo">+ Custo</button></div>' +
        (custos.length ? tabelaCustos(custos) : '<p class="dica">Nenhum custo vinculado.</p>') +
      '</div>' +

      '<div class="ficha-secao">' +
        '<h3 class="ficha-secao__titulo">Arquivos e links</h3>' +
        '<div class="ficha-linha">' +
          '<span class="ficha-linha__principal">Pasta dos arquivos' +
            '<br><span class="campo__ajuda">' + CanalUtil.escapar(pasta || 'não informada') + '</span></span>' +
          '<span class="ficha-linha__etiquetas">' +
            '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="abrir-pasta">Abrir pasta</button>' +
            '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="copiar-pasta">Copiar caminho</button>' +
          '</span>' +
        '</div>' +
        '<div class="ficha-linha">' +
          '<span class="ficha-linha__principal">YouTube Studio</span>' +
          '<span class="ficha-linha__etiquetas"><button type="button" class="botao botao--secundario botao--pequeno" data-acao="abrir-studio">Abrir no navegador</button></span>' +
        '</div>' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: 'Ficha — ' + (video.titulo || 'Vídeo'),
      largura: 'larga',
      conteudo: html,
      acoes: [
        { rotulo: 'Excluir vídeo', classe: 'botao--perigo', aoClicar: function () { excluirVideo(video); } },
        { rotulo: 'Editar dados', classe: 'botao--secundario', aoClicar: function () { abrirVideo(video); } },
        { rotulo: 'Imprimir ficha', classe: 'botao--primario', aoClicar: function () { CanalRelatorios.fichaDoVideo(videoId); } }
      ]
    });

    CanalUtil.$$('#modal-fundo [data-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-acao');
        if (acao === 'nova-entrega') { CanalTelaHoje.abrirEntrega({ videoId: videoId }); return; }
        if (acao === 'nova-receita') { CanalTelaDinheiro.abrirReceita(null, videoId); return; }
        if (acao === 'novo-custo') { CanalTelaDinheiro.abrirCusto(null, videoId); return; }
        if (acao === 'abrir-pasta') { abrirPasta(pasta); return; }
        if (acao === 'copiar-pasta') { copiarTexto(pasta); return; }
        if (acao === 'abrir-studio') { abrirLink(video); return; }
      });
    });
  }

  function excluirVideo(video) {
    if (!window.confirm('Excluir o vídeo "' + (video.titulo || '') + '"? Receitas e custos dele continuam guardados, mas deixam de estar vinculados. Não dá para desfazer.')) return;
    CanalDados.remover('videos', video.id);
    CanalUtil.fecharModal();
    CanalUtil.toast('Vídeo excluído.');
    CanalApp.recarregar();
  }

  /* RF12: abrir a pasta de mídia no Windows */
  function abrirPasta(caminho) {
    var limpo = String(caminho || '').trim().replace(/^["']|["']$/g, '');
    if (!limpo) {
      CanalUtil.toast('Informe a pasta dos arquivos na edição do vídeo (ou defina a pasta padrão em Ajustes).', 'erro');
      return;
    }
    var url = 'file:///' + limpo.replace(/\\/g, '/').replace(/^\/+/, '');
    var atalho = document.createElement('a');
    atalho.href = url;
    atalho.target = '_blank';
    atalho.rel = 'noopener';
    document.body.appendChild(atalho);
    atalho.click();
    atalho.remove();
    CanalUtil.toast('Se a pasta não abrir, use "Copiar caminho" e cole no Explorador de arquivos.');
  }

  function copiarTexto(texto) {
    if (!texto) {
      CanalUtil.toast('Nenhum caminho informado.', 'erro');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () { CanalUtil.toast('Caminho copiado.'); },
        function () { CanalUtil.toast(texto); }
      );
    } else {
      CanalUtil.toast(texto);
    }
  }

  /* RF17: abrir o YouTube Studio do vídeo */
  function abrirLink(video) {
    var url = (video.link || '').trim();
    if (url.indexOf('http') !== 0) url = 'https://studio.youtube.com';
    window.open(url, '_blank', 'noopener');
  }

  return { render: render, abrirVideo: abrirVideo };
})();
