/* ChannelPro — tela Marcas (RF08, RF09, RF11)
   Cadastro de marcas, histórico de valores praticados pela própria
   usuária (RN04) e anexos de contrato guardados dentro do arquivo de
   dados (modo navegador não permite gravar fora dele). */

'use strict';

var CanalTelaMarcas = (function () {

  var LIMITE_CONTRATO = 3 * 1024 * 1024; /* base64 vive no localStorage: limite prático por PDF */

  /* ---------- etiquetas de estado (RF09: entrega e pagamento são independentes) ---------- */

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

  /* ---------- tela ---------- */

  function render(raiz) {
    var marcas = CanalDados.listar('marcas');

    var html = '' +
      '<div class="cabecalho-tela">' +
        '<div class="cabecalho-tela__texto">' +
          '<h1>Marcas</h1>' +
          '<span class="cabecalho-tela__sub">Quem patrocina, quanto já pagou e o valor por mil views que você pratica.</span>' +
        '</div>' +
        '<div class="cabecalho-tela__acoes">' +
          '<button type="button" class="botao botao--secundario" data-acao="nova-entrega">+ Nova entrega</button>' +
          '<button type="button" class="botao botao--primario" data-acao="nova-marca">+ Nova marca</button>' +
        '</div>' +
      '</div>';

    if (!marcas.length) {
      html += '<div class="cartao"><div class="cartao__corpo"><div class="vazio">' +
        '<span class="vazio__titulo">Nenhuma marca cadastrada</span>' +
        '<span class="vazio__texto">Cadastre as marcas que já te patrocinam para começar a construir seu histórico de valores.</span>' +
        '<button type="button" class="botao botao--primario" data-acao="nova-marca">+ Nova marca</button>' +
        '</div></div></div>';
    } else {
      html += '<div class="lista-marcas">' + marcas.map(item).join('') + '</div>';
    }

    raiz.innerHTML = html;
    ligar(raiz);
  }

  function item(marca) {
    var historico = CanalDados.historicoDaMarca(marca.id);
    var pendentes = CanalDados.listar('patrocinios').filter(function (p) {
      return p.marcaId === marca.id && (!p.entregue || !p.pago);
    }).length;

    var numeros = '';
    if (pendentes) numeros += '<span class="marca-item__pendente">' + pendentes + ' em aberto</span>';
    if (historico.porMilViews !== null) {
      numeros += '<span><strong>' + CanalUtil.formatarMoeda(historico.porMilViews) + '</strong> por mil views</span>';
    }
    if (historico.total > 0) {
      numeros += '<span>' + CanalUtil.formatarMoeda(historico.total) + ' em ' + historico.fechamentos +
        (historico.fechamentos === 1 ? ' patrocínio' : ' patrocínios') + '</span>';
    }
    if (!numeros) numeros = '<span>sem patrocínios fechados ainda</span>';

    return '' +
      '<button type="button" class="marca-item" data-id="' + marca.id + '">' +
        '<span class="marca-item__texto">' +
          '<span class="marca-item__nome">' + CanalUtil.escapar(marca.nome) + '</span>' +
          (marca.contato ? '<span class="marca-item__sub">' + CanalUtil.escapar(marca.contato) + '</span>' : '') +
        '</span>' +
        '<span class="marca-item__numeros">' + numeros + '</span>' +
      '</button>';
  }

  function ligar(raiz) {
    CanalUtil.$$('[data-acao]', raiz).forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-acao');
        if (acao === 'nova-marca') abrirMarca(null);
        else if (acao === 'nova-entrega') CanalTelaHoje.abrirEntrega(null);
      });
    });
    CanalUtil.$$('.marca-item', raiz).forEach(function (botao) {
      botao.addEventListener('click', function () {
        abrirMarca(CanalDados.obter('marcas', botao.getAttribute('data-id')));
      });
    });
  }

  /* ---------- histórico (RF08 / RN04) ---------- */

  function tabelaHistorico(itens) {
    return '<div style="overflow-x:auto"><table class="tabela-simples">' +
      '<thead><tr><th>Prazo</th><th>Entrega</th><th class="numero">Valor</th><th class="numero">Views</th><th class="numero">Por mil</th></tr></thead><tbody>' +
      itens.map(function (p) {
        var porMil = p.alcance > 0 ? CanalUtil.formatarMoeda((p.valor / p.alcance) * 1000) : '—';
        return '<tr><td>' + CanalUtil.formatarData(p.dataPrazo) + '</td><td>' + CanalUtil.escapar(p.descricao || '') + '</td>' +
          '<td class="numero">' + CanalUtil.formatarMoeda(p.valor) + '</td>' +
          '<td class="numero">' + CanalUtil.formatarNumero(p.alcance) + '</td>' +
          '<td class="numero">' + porMil + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- contratos (RF11) ---------- */

  function contratosHtml(p) {
    var lista = (p.contratos || []).map(function (c) {
      return '<div class="ficha-linha ficha-linha--contrato">' +
        '<span class="ficha-linha__principal">Contrato: ' + CanalUtil.escapar(c.nome) +
          '<br><span class="campo__ajuda">anexado em ' + CanalUtil.formatarData(c.adicionadoEm) + '</span></span>' +
        '<span class="ficha-linha__etiquetas"><button type="button" class="botao botao--secundario botao--pequeno" data-p-acao="abrir-contrato" data-id="' + p.id + '" data-cid="' + c.id + '">Abrir PDF</button></span>' +
      '</div>';
    }).join('');
    return '<div class="ficha-contratos">' + lista +
      '<button type="button" class="botao botao--sutil" data-p-acao="contrato" data-id="' + p.id + '">+ Anexar contrato (PDF)</button>' +
      '</div>';
  }

  function lerArquivoDataURL(arquivo) {
    return new Promise(function (resolver, rejeitar) {
      var leitor = new FileReader();
      leitor.onload = function () { resolver(String(leitor.result)); };
      leitor.onerror = function () { rejeitar(new Error('Não foi possível ler o arquivo.')); };
      leitor.readAsDataURL(arquivo);
    });
  }

  function anexarContrato(patrocinioId, marcaId) {
    CanalUtil.escolherArquivo('application/pdf,.pdf').then(function (arquivo) {
      if (!arquivo) return;
      if (arquivo.size > LIMITE_CONTRATO) {
        CanalUtil.toast('O PDF passa de 3 MB e não cabe dentro do arquivo de dados. Guarde-o na pasta do vídeo e anote o caminho.', 'erro');
        return;
      }
      lerArquivoDataURL(arquivo).then(function (dataURL) {
        var p = CanalDados.obter('patrocinios', patrocinioId);
        if (!p) return;
        var contratos = (p.contratos || []).slice();
        contratos.push({
          id: CanalUtil.uid('con'),
          nome: arquivo.name,
          dados: dataURL,
          adicionadoEm: CanalUtil.hojeISO()
        });
        CanalDados.atualizar('patrocinios', patrocinioId, { contratos: contratos });
        CanalUtil.toast('Contrato anexado ao patrocínio.');
        abrirMarca(CanalDados.obter('marcas', marcaId));
      }, function () {
        CanalUtil.toast('Não foi possível ler o PDF.', 'erro');
      });
    });
  }

  function abrirContrato(patrocinioId, contratoId) {
    var p = CanalDados.obter('patrocinios', patrocinioId);
    var contrato = p && (p.contratos || []).filter(function (c) { return c.id === contratoId; })[0];
    if (!contrato) return;
    var binario = atob(String(contrato.dados).split(',')[1] || '');
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var janela = window.open(url, '_blank');
    if (!janela) CanalUtil.baixarArquivo(contrato.nome, bytes, 'application/pdf');
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /* ---------- detalhe da marca ---------- */

  function linhaPatrocinio(p) {
    var video = p.videoId ? CanalDados.nomeDoVideo(p.videoId) : '';
    var detalhe = [];
    if (p.dataPrazo) detalhe.push('prazo ' + CanalUtil.formatarData(p.dataPrazo));
    if (video) detalhe.push(CanalUtil.escapar(video));
    if (p.alcance > 0) detalhe.push(CanalUtil.formatarNumero(p.alcance) + ' views');

    return '' +
      '<div class="ficha-linha">' +
        '<span class="ficha-linha__principal">' + CanalUtil.escapar(p.descricao || 'Entrega') +
          '<br><span class="campo__ajuda">' + detalhe.join(' · ') + '</span></span>' +
        '<span class="ficha-linha__etiquetas">' + etiquetasDoPatrocinio(p) +
          (p.entregue ? '' : '<button type="button" class="botao botao--secundario botao--pequeno" data-p-acao="entregar" data-id="' + p.id + '">Marcar entregue</button>') +
          (p.pago ? '' : '<button type="button" class="botao botao--secundario botao--pequeno" data-p-acao="receber" data-id="' + p.id + '">Marcar recebido</button>') +
        '</span>' +
        '<span class="numero">' + CanalUtil.formatarMoeda(p.valor) + '</span>' +
      '</div>' +
      contratosHtml(p);
  }

  function abrirMarca(marca) {
    var m = marca || {};
    var historico = m.id ? CanalDados.historicoDaMarca(m.id) : null;
    var patrocinios = m.id
      ? CanalDados.listar('patrocinios').filter(function (p) { return p.marcaId === m.id; })
        .sort(function (a, b) { return (a.dataPrazo || '9999') < (b.dataPrazo || '9999') ? -1 : 1; })
      : [];

    var html = '' +
      '<div class="grade-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="m-nome">Nome da marca</label>' +
          '<input type="text" id="m-nome" value="' + CanalUtil.escapar(m.nome || '') + '" placeholder="Ex.: Suplementos Vale">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="m-contato">Contato</label>' +
          '<input type="text" id="m-contato" value="' + CanalUtil.escapar(m.contato || '') + '" placeholder="WhatsApp, e-mail...">' +
        '</div>' +
        '<div class="campo campo--largo">' +
          '<label class="campo__rotulo" for="m-obs">Observação</label>' +
          '<textarea id="m-obs" rows="2">' + CanalUtil.escapar(m.observacao || '') + '</textarea>' +
        '</div>' +
      '</div>';

    if (historico) {
      html += '<div class="ficha-secao">' +
        '<h3 class="ficha-secao__titulo">Seu histórico de valores</h3>' +
        (historico.porMilViews !== null
          ? '<div class="previa-calculo">Média praticada por você: ' + CanalUtil.formatarMoeda(historico.porMilViews) +
            ' por mil views, em ' + historico.fechamentos + (historico.fechamentos === 1 ? ' patrocínio' : ' patrocínios') + '.</div>'
          : '<p class="dica">Quando os patrocínios tiverem valor e alcance (views), a média por mil views aparece aqui.</p>') +
        (historico.itens.length ? tabelaHistorico(historico.itens) : '') +
      '</div>';

      html += '<div class="ficha-secao">' +
        '<div class="linha linha--separada"><h3 class="ficha-secao__titulo">Patrocínios desta marca</h3>' +
          '<button type="button" class="botao botao--secundario botao--pequeno" data-p-acao="nova-entrega">+ Nova entrega</button></div>' +
        (patrocinios.length ? patrocinios.map(linhaPatrocinio).join('') : '<p class="dica">Nenhum patrocínio registrado.</p>') +
      '</div>';
    }

    var acoes = [
      { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
      { rotulo: 'Salvar', classe: 'botao--primario', aoClicar: salvar }
    ];
    if (m.id) {
      acoes.unshift({ rotulo: 'Excluir marca', classe: 'botao--perigo', aoClicar: excluir });
    }

    CanalUtil.abrirModal({
      titulo: m.id ? 'Marca — ' + m.nome : 'Nova marca',
      largura: 'larga',
      conteudo: html,
      acoes: acoes
    });

    CanalUtil.$$('#modal-fundo [data-p-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-p-acao');
        var id = botao.getAttribute('data-id');
        if (acao === 'entregar') {
          CanalDados.atualizar('patrocinios', id, { entregue: true, dataEntrega: CanalUtil.hojeISO() });
          CanalUtil.toast('Entrega marcada como feita.');
          abrirMarca(CanalDados.obter('marcas', m.id));
        } else if (acao === 'receber') {
          CanalDados.atualizar('patrocinios', id, { pago: true, dataPagamento: CanalUtil.hojeISO(), entregue: true });
          CanalUtil.toast('Pagamento registrado.');
          abrirMarca(CanalDados.obter('marcas', m.id));
        } else if (acao === 'contrato') {
          anexarContrato(id, m.id);
        } else if (acao === 'abrir-contrato') {
          abrirContrato(id, botao.getAttribute('data-cid'));
        } else if (acao === 'nova-entrega') {
          CanalTelaHoje.abrirEntrega({ marcaId: m.id });
        }
      });
    });

    function salvar() {
      var nome = $('#m-nome').value.trim();
      if (!nome) {
        CanalUtil.toast('Dê um nome à marca.', 'erro');
        $('#m-nome').focus();
        return;
      }
      var dados = {
        nome: nome,
        contato: $('#m-contato').value.trim(),
        observacao: $('#m-obs').value.trim()
      };
      if (m.id) CanalDados.atualizar('marcas', m.id, dados);
      else CanalDados.inserir('marcas', dados);
      CanalUtil.fecharModal();
      CanalUtil.toast('Marca salva.');
      CanalApp.recarregar();
    }

    function excluir() {
      if (!window.confirm('Excluir a marca "' + m.nome + '"? Os patrocínios dela ficam sem marca vinculada. Não dá para desfazer.')) return;
      CanalDados.remover('marcas', m.id);
      CanalUtil.fecharModal();
      CanalUtil.toast('Marca excluída.');
      CanalApp.recarregar();
    }
  }

  return { render: render };
})();
