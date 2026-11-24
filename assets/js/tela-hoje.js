/* ChannelPro — tela Hoje (RF01, RF02)
   Responde a uma pergunta: o que eu não posso esquecer hoje?
   Ordem: atrasadas primeiro, depois as que vencem, depois as demais. */

'use strict';

var CanalTelaHoje = (function () {

  /* ---------- rótulos ---------- */

  function etiqueta(item) {
    var p = item.patrocinio;
    if (item.situacao === 'entregue') {
      return p.pago
        ? '<span class="etiqueta etiqueta--pago">✓ Entregue e pago</span>'
        : '<span class="etiqueta etiqueta--naopago">Entregue, a receber</span>';
    }
    if (item.venceHoje) return '<span class="etiqueta etiqueta--hoje">Vence hoje</span>';
    if (item.situacao === 'atrasada') return '<span class="etiqueta etiqueta--atrasada">Atrasada</span>';
    return '<span class="etiqueta etiqueta--pendente">Pendente</span>';
  }

  function textoRelativo(item) {
    var p = item.patrocinio;
    if (p.entregue) return p.pago ? 'concluída' : 'aguardando pagamento';
    if (item.diasDeAtraso > 0) {
      return 'há ' + item.diasDeAtraso + (item.diasDeAtraso === 1 ? ' dia' : ' dias');
    }
    if (!p.dataPrazo) return 'sem prazo';
    var restam = item.diasParaVencer;
    if (restam === 0) return 'hoje';
    if (restam === 1) return 'amanhã';
    return 'em ' + restam + ' dias';
  }

  /* ---------- linha de uma entrega ---------- */

  function linha(item) {
    var p = item.patrocinio;
    var dataCurta = p.dataPrazo ? CanalUtil.formatarDataCurta(p.dataPrazo) : '—';
    var classeExtra = item.situacao === 'atrasada' ? ' entrega--atrasada' : '';

    var acoes = '';
    if (!p.entregue) {
      acoes += '<button type="button" class="botao botao--primario botao--pequeno" data-acao="entregar" data-id="' + p.id + '">Entreguei</button>';
    } else if (!p.pago) {
      acoes += '<button type="button" class="botao botao--primario botao--pequeno" data-acao="receber" data-id="' + p.id + '">Recebi</button>';
    }
    acoes += '<button type="button" class="botao botao--secundario botao--pequeno" data-acao="editar" data-id="' + p.id + '">Editar</button>';
    acoes += '<button type="button" class="botao botao--icone" data-acao="excluir" data-id="' + p.id + '" aria-label="Excluir entrega" title="Excluir">✕</button>';

    var video = p.videoId ? CanalDados.nomeDoVideo(p.videoId) : '';
    var meta = [];
    if (item.marca) meta.push(CanalUtil.escapar(item.marca));
    if (video) meta.push(CanalUtil.escapar(video));
    if (p.valor > 0) meta.push(CanalUtil.formatarMoeda(p.valor));

    return '' +
      '<div class="entrega' + classeExtra + '">' +
        '<div class="entrega__data">' +
          '<span class="entrega__data-dia">' + CanalUtil.escapar(dataCurta) + '</span>' +
          '<span class="entrega__data-relativo">' + CanalUtil.escapar(textoRelativo(item)) + '</span>' +
        '</div>' +
        '<div class="entrega__principal">' +
          '<span class="entrega__titulo">' + CanalUtil.escapar(p.descricao || 'Entrega sem descrição') + '</span>' +
          '<span class="entrega__meta">' + meta.join(' · ') + '</span>' +
        '</div>' +
        '<div>' + etiqueta(item) + '</div>' +
        '<div class="entrega__acoes">' + acoes + '</div>' +
      '</div>';
  }

  /* ---------- tela ---------- */

  function render(raiz) {
    var resumo = CanalDados.resumoDoMes();
    var lista = CanalDados.entregas();
    var atrasados = CanalDados.recebimentosAtrasados();
    var pendentes = lista.filter(function (i) { return i.situacao !== 'entregue'; });
    var entregues = lista.filter(function (i) { return i.situacao === 'entregue'; }).slice(0, 5);

    var html = '' +
      '<div class="cabecalho-tela">' +
        '<div class="cabecalho-tela__texto">' +
          '<h1>Hoje</h1>' +
          '<span class="cabecalho-tela__sub">O que você não pode esquecer, na ordem em que dói.</span>' +
        '</div>' +
        '<div class="cabecalho-tela__acoes">' +
          '<button type="button" class="botao botao--secundario" data-acao="minha-semana">🖨 Imprimir minha semana</button>' +
          '<button type="button" class="botao botao--primario" data-acao="nova-entrega">+ Nova entrega</button>' +
        '</div>' +
      '</div>';

    if (atrasados.length) {
      var somaAtraso = atrasados.reduce(function (t, a) { return t + a.patrocinio.valor; }, 0);
      var maisAntigo = atrasados[0];
      html += '' +
        '<div class="faixa-alerta">' +
          '<span class="faixa-alerta__icone" aria-hidden="true">⚠</span>' +
          '<div class="faixa-alerta__texto">' +
            '<span class="faixa-alerta__titulo">' +
              atrasados.length + (atrasados.length === 1 ? ' entrega feita, ' : ' entregas feitas, ') +
              CanalUtil.formatarMoeda(somaAtraso) + ' não recebidos' +
            '</span>' +
            '<span class="faixa-alerta__detalhe">A mais antiga espera há ' + maisAntigo.diasEsperando +
              ' dias' + (maisAntigo.marca ? ' (' + CanalUtil.escapar(maisAntigo.marca) + ')' : '') +
              '. Uma ligação resolve.</span>' +
          '</div>' +
          '<button type="button" class="botao botao--secundario faixa-alerta__acao" data-acao="ver-recebimentos">Ver quais</button>' +
        '</div>';
    }

    html += '' +
      '<div class="grade-resumo">' +
        bloco('Entrou no mês', CanalUtil.formatarMoeda(resumo.entrou), 'receitas e patrocínios pagos') +
        bloco('Saiu no mês', CanalUtil.formatarMoeda(resumo.saiu), 'custos lançados') +
        bloco('Sobrou', CanalUtil.formatarMoeda(resumo.sobrou), resumo.sobrou >= 0 ? 'lucro do mês' : 'prejuízo no mês') +
        bloco('A receber', CanalUtil.formatarMoeda(resumo.aReceber), 'entregue e ainda não pago') +
      '</div>';

    html += '<div class="cartao">' +
      '<div class="cartao__topo"><h2>Entregas em aberto</h2>' +
        '<span class="cabecalho-tela__sub">' + pendentes.length + (pendentes.length === 1 ? ' pendente' : ' pendentes') + '</span>' +
      '</div>';

    if (!pendentes.length) {
      html += '<div class="cartao__corpo"><div class="vazio">' +
        '<span class="vazio__titulo">Nenhuma entrega em aberto</span>' +
        '<span class="vazio__texto">Quando fechar um patrocínio, lance aqui a data e você nunca mais perde o prazo.</span>' +
        '<button type="button" class="botao botao--primario" data-acao="nova-entrega">+ Nova entrega</button>' +
        '</div></div>';
    } else {
      html += '<div class="lista-entregas">' + pendentes.map(linha).join('') + '</div>';
    }
    html += '</div>';

    if (entregues.length) {
      html += '<div class="cartao">' +
        '<div class="cartao__topo"><h2>Concluídas recentemente</h2></div>' +
        '<div class="lista-entregas">' + entregues.map(linha).join('') + '</div>' +
      '</div>';
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

  /* ---------- ações ---------- */

  function ligarAcoes(raiz) {
    CanalUtil.$$('[data-acao]', raiz).forEach(function (botao) {
      botao.addEventListener('click', function () {
        tratar(botao.getAttribute('data-acao'), botao.getAttribute('data-id'));
      });
    });
  }

  function tratar(acao, id) {
    if (acao === 'minha-semana') { CanalRelatorios.minhaSemana(); return; }
    if (acao === 'nova-entrega') { abrirEntrega(null); return; }
    if (acao === 'ver-recebimentos') { CanalApp.irPara('dinheiro'); return; }

    if (acao === 'entregar') {
      CanalDados.atualizar('patrocinios', id, { entregue: true, dataEntrega: CanalUtil.hojeISO() });
      CanalUtil.toast('Entrega marcada como feita.');
      CanalApp.recarregar();
      return;
    }
    if (acao === 'receber') {
      CanalDados.atualizar('patrocinios', id, { pago: true, dataPagamento: CanalUtil.hojeISO(), entregue: true });
      CanalUtil.toast('Pagamento registrado.');
      CanalApp.recarregar();
      return;
    }
    if (acao === 'editar') { abrirEntrega(CanalDados.obter('patrocinios', id)); return; }
    if (acao === 'excluir') {
      if (window.confirm('Excluir esta entrega? Não dá para desfazer.')) {
        CanalDados.remover('patrocinios', id);
        CanalUtil.toast('Entrega excluída.');
        CanalApp.recarregar();
      }
    }
  }

  /* ---------- formulário ---------- */

  function abrirEntrega(patrocinio) {
    var p = patrocinio || {};
    var marcas = CanalDados.listar('marcas');
    var videos = CanalDados.listar('videos');

    var opcoesMarca = marcas.map(function (m) {
      return '<option value="' + m.id + '"' + (p.marcaId === m.id ? ' selected' : '') + '>' +
        CanalUtil.escapar(m.nome) + '</option>';
    }).join('');

    var opcoesVideo = '<option value="">(nenhum vídeo vinculado)</option>' + videos.map(function (v) {
      return '<option value="' + v.id + '"' + (p.videoId === v.id ? ' selected' : '') + '>' +
        CanalUtil.escapar(v.titulo) + '</option>';
    }).join('');

    var conteudo = '' +
      '<div class="campo">' +
        '<label class="campo__rotulo" for="f-marca">Marca</label>' +
        '<select id="f-marca">' +
          '<option value="">— escolha a marca —</option>' +
          opcoesMarca +
          '<option value="__nova"' + (!p.marcaId && !marcas.length ? ' selected' : '') + '>+ Cadastrar nova marca</option>' +
        '</select>' +
      '</div>' +
      '<div class="campo" id="campo-nova-marca" style="display:none">' +
        '<label class="campo__rotulo" for="f-nova-marca">Nome da nova marca</label>' +
        '<input type="text" id="f-nova-marca" placeholder="Ex.: Suplementos Vale">' +
      '</div>' +
      '<div class="campo">' +
        '<label class="campo__rotulo" for="f-descricao">O que você precisa entregar</label>' +
        '<input type="text" id="f-descricao" value="' + CanalUtil.escapar(p.descricao || '') + '" placeholder="Ex.: integrado de 60 segundos">' +
      '</div>' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-valor">Valor combinado (R$)</label>' +
          '<input type="number" id="f-valor" min="0" step="0.01" value="' + (p.valor || '') + '" placeholder="0,00">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-prazo">Prazo de entrega</label>' +
          '<input type="date" id="f-prazo" value="' + (p.dataPrazo || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-video">Vídeo vinculado</label>' +
          '<select id="f-video">' + opcoesVideo + '</select>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-alcance">Alcance previsto (views)</label>' +
          '<input type="number" id="f-alcance" min="0" step="1000" value="' + (p.alcance || '') + '" placeholder="Ex.: 40000">' +
          '<span class="campo__ajuda">Serve para calcular seu valor por mil views no histórico da marca.</span>' +
        '</div>' +
      '</div>' +
      '<div class="campo">' +
        '<label class="campo__rotulo" for="f-observacao">Observação</label>' +
        '<input type="text" id="f-observacao" value="' + CanalUtil.escapar(p.observacao || '') + '" placeholder="Cupom, link, condições...">' +
      '</div>' +
      '<div class="linha-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-entregue">Entrega</label>' +
          '<label><input type="checkbox" id="f-entregue"' + (p.entregue ? ' checked' : '') + '> Já entreguei</label>' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="f-pago">Pagamento</label>' +
          '<label><input type="checkbox" id="f-pago"' + (p.pago ? ' checked' : '') + '> Já recebi</label>' +
        '</div>' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: p.id ? 'Editar entrega' : 'Nova entrega de patrocínio',
      conteudo: conteudo,
      acoes: [
        { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
        { rotulo: 'Salvar', classe: 'botao--primario', aoClicar: salvar }
      ]
    });

    var seletorMarca = $('#f-marca');
    var campoNovaMarca = $('#campo-nova-marca');
    function ajustarNovaMarca() {
      campoNovaMarca.style.display = seletorMarca.value === '__nova' ? 'flex' : 'none';
    }
    seletorMarca.addEventListener('change', ajustarNovaMarca);
    ajustarNovaMarca();

    function salvar() {
      var marcaId = seletorMarca.value;
      var valor = CanalUtil.numeroDoTexto($('#f-valor').value);
      var descricao = $('#f-descricao').value.trim();

      if (!descricao) {
        CanalUtil.toast('Escreva o que precisa ser entregue.', 'erro');
        $('#f-descricao').focus();
        return;
      }

      if (marcaId === '__nova') {
        var nomeMarca = $('#f-nova-marca').value.trim();
        if (!nomeMarca) {
          CanalUtil.toast('Dê um nome à marca.', 'erro');
          $('#f-nova-marca').focus();
          return;
        }
        var nova = CanalDados.inserir('marcas', { nome: nomeMarca, contato: '', observacao: '' });
        marcaId = nova.id;
      }

      var dados = {
        marcaId: marcaId || null,
        descricao: descricao,
        valor: valor,
        dataPrazo: $('#f-prazo').value || null,
        videoId: $('#f-video').value || null,
        alcance: CanalUtil.numeroDoTexto($('#f-alcance').value),
        observacao: $('#f-observacao').value.trim(),
        entregue: $('#f-entregue').checked,
        pago: $('#f-pago').checked
      };

      if (dados.entregue && !p.dataEntrega) dados.dataEntrega = CanalUtil.hojeISO();
      if (!dados.entregue) dados.dataEntrega = null;
      if (dados.pago) dados.dataPagamento = p.dataPagamento || CanalUtil.hojeISO();
      if (!dados.pago) dados.dataPagamento = null;

      if (p.id) CanalDados.atualizar('patrocinios', p.id, dados);
      else CanalDados.inserir('patrocinios', dados);

      CanalUtil.fecharModal();
      CanalUtil.toast(p.id ? 'Entrega atualizada.' : 'Entrega criada.');
      CanalApp.recarregar();
    }
  }

  return {
    render: render,
    abrirEntrega: abrirEntrega
  };
})();
