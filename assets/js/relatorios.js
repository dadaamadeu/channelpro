/* ChannelPro — relatórios imprimíveis
   Geração local: monta o HTML na área de impressão e chama window.print().
   O navegador oferece "Salvar como PDF" — nenhum serviço externo é usado. */

'use strict';

var CanalRelatorios = (function () {

  function area() { return document.getElementById('area-impressao'); }

  function limpar() {
    var alvo = area();
    if (alvo) alvo.innerHTML = '';
  }

  function cabecalho(titulo, subtitulo) {
    var config = CanalDados.config();
    var nome = config.nomeCanal || 'Meu canal';
    return '' +
      '<header class="folha__cabecalho">' +
        '<div>' +
          '<div class="folha__marca">ChannelPro</div>' +
          '<h1 class="folha__titulo">' + CanalUtil.escapar(titulo) + '</h1>' +
          '<div class="folha__subtitulo">' + CanalUtil.escapar(subtitulo) + '</div>' +
        '</div>' +
        '<div class="folha__canal">' +
          '<strong>' + CanalUtil.escapar(nome) + '</strong><br>' +
          'gerado em ' + CanalUtil.formatarData(CanalUtil.hojeISO()) +
        '</div>' +
      '</header>';
  }

  function imprimir() {
    CanalUtil.fecharModal();
    document.body.classList.add('imprimindo');
    window.setTimeout(function () {
      window.print();
      window.setTimeout(function () {
        document.body.classList.remove('imprimindo');
        limpar();
      }, 400);
    }, 60);
  }

  /* ---------- Minha semana ---------- */

  function minhaSemana() {
    var inicio = CanalUtil.inicioDaSemana(CanalUtil.hojeISO());
    var fim = CanalUtil.fimDaSemana(CanalUtil.hojeISO());
    var patrocinios = CanalDados.listar('patrocinios');
    var marcas = CanalDados.listar('marcas');
    var videos = CanalDados.listar('videos');

    function nomeMarca(id) {
      var m = marcas.filter(function (x) { return x.id === id; })[0];
      return m ? m.nome : 'Marca não informada';
    }
    function nomeVideo(id) {
      var v = videos.filter(function (x) { return x.id === id; })[0];
      return v ? v.titulo : '';
    }

    var daSemana = patrocinios.filter(function (p) {
      return p.dataPrazo && p.dataPrazo >= inicio && p.dataPrazo <= fim && !p.entregue;
    }).sort(function (a, b) { return a.dataPrazo < b.dataPrazo ? -1 : 1; });

    var atrasadas = patrocinios.filter(function (p) {
      return !p.entregue && p.dataPrazo && p.dataPrazo < CanalUtil.hojeISO();
    }).sort(function (a, b) { return a.dataPrazo < b.dataPrazo ? -1 : 1; });

    function item(p, classe) {
      var video = nomeVideo(p.videoId);
      return '' +
        '<tr class="' + classe + '">' +
          '<td class="folha__data">' + CanalUtil.formatarData(p.dataPrazo) + '</td>' +
          '<td>' +
            '<strong>' + CanalUtil.escapar(p.descricao || 'Entrega sem descrição') + '</strong>' +
            (video ? '<br><span class="folha__fraco">' + CanalUtil.escapar(video) + '</span>' : '') +
          '</td>' +
          '<td>' + CanalUtil.escapar(nomeMarca(p.marcaId)) + '</td>' +
          '<td class="folha__valor">' + CanalUtil.formatarMoeda(p.valor) + '</td>' +
        '</tr>';
    }

    var linhas = '';
    atrasadas.forEach(function (p) { linhas += item(p, 'folha__linha--atrasada'); });
    daSemana.forEach(function (p) { linhas += item(p, ''); });

    var html = '' +
      cabecalho('Minha semana', 'De ' + CanalUtil.formatarData(inicio) + ' a ' + CanalUtil.formatarData(fim)) +
      '<div class="folha__corpo">' +
        (linhas
          ? '<table class="folha__tabela">' +
              '<thead><tr><th>Prazo</th><th>O que entregar</th><th>Marca</th><th>Valor</th></tr></thead>' +
              '<tbody>' + linhas + '</tbody>' +
            '</table>'
          : '<p class="folha__vazio">Nenhuma entrega pendente nesta semana e nada atrasado. Semana limpa.</p>') +
        (atrasadas.length
          ? '<p class="folha__nota">As linhas marcadas com "ATRASADO" passaram do prazo e continuam pendentes.</p>'
          : '') +
      '</div>' +
      '<footer class="folha__rodape">Documento gerado localmente pelo ChannelPro. Nenhum dado saiu deste computador.</footer>';

    area().innerHTML = html;
    imprimir();
  }

  /* ---------- Relatório do contador ---------- */

  function relatorioDoMes(competencia) {
    var mes = competencia || CanalUtil.hojeISO().slice(0, 7);
    var receitas = CanalDados.listar('receitas').filter(function (r) {
      return r.data && r.data.slice(0, 7) === mes;
    });
    var custos = CanalDados.listar('custos').filter(function (c) {
      return c.data && c.data.slice(0, 7) === mes;
    });
    var patrociniosRecebidos = CanalDados.listar('patrocinios').filter(function (p) {
      return p.pago && p.dataPagamento && p.dataPagamento.slice(0, 7) === mes;
    });

    var totalReceitas = receitas.reduce(function (t, r) { return t + r.valor; }, 0)
      + patrociniosRecebidos.reduce(function (t, p) { return t + p.valor; }, 0);
    var totalCustos = custos.reduce(function (t, c) { return t + c.valor; }, 0);
    var resultado = totalReceitas - totalCustos;

    var linhasReceita = '';
    receitas.forEach(function (r) {
      linhasReceita += '<tr><td>' + CanalUtil.formatarData(r.data) + '</td>' +
        '<td>' + CanalUtil.escapar(r.descricao) + '</td>' +
        '<td>' + CanalUtil.escapar(CanalDados.ROTULO_ORIGEM[r.origem] || 'Outro') + '</td>' +
        '<td class="folha__valor">' + CanalUtil.formatarMoeda(r.valor) + '</td></tr>';
    });
    patrociniosRecebidos.forEach(function (p) {
      linhasReceita += '<tr><td>' + CanalUtil.formatarData(p.dataPagamento) + '</td>' +
        '<td>' + CanalUtil.escapar('Patrocínio — ' + (p.descricao || 'entrega')) + '</td>' +
        '<td>Patrocínio</td>' +
        '<td class="folha__valor">' + CanalUtil.formatarMoeda(p.valor) + '</td></tr>';
    });

    var linhasCusto = '';
    custos.forEach(function (c) {
      var detalhe = c.modo === 'rateio'
        ? 'dividido entre ' + (c.videoIds || []).length + ' vídeos'
        : (c.videoId ? CanalDados.nomeDoVideo(c.videoId) : 'custo geral');
      linhasCusto += '<tr><td>' + CanalUtil.formatarData(c.data) + '</td>' +
        '<td>' + CanalUtil.escapar(c.descricao) + '<br><span class="folha__fraco">' + CanalUtil.escapar(detalhe) + '</span></td>' +
        '<td>' + CanalUtil.escapar(CanalDados.ROTULO_CATEGORIA[c.categoria] || 'Outro') + '</td>' +
        '<td class="folha__valor">' + CanalUtil.formatarMoeda(c.valor) + '</td></tr>';
    });

    var html = '' +
      cabecalho('Relatório financeiro do mês', 'Competência ' + mes.split('-').reverse().join('/')) +
      '<div class="folha__corpo">' +
        '<div class="folha__totais">' +
          '<div><span>Entrou</span><strong>' + CanalUtil.formatarMoeda(totalReceitas) + '</strong></div>' +
          '<div><span>Saiu</span><strong>' + CanalUtil.formatarMoeda(totalCustos) + '</strong></div>' +
          '<div><span>Sobrou</span><strong>' + CanalUtil.formatarMoeda(resultado) + '</strong></div>' +
        '</div>' +
        '<h2>Receitas</h2>' +
        (linhasReceita
          ? '<table class="folha__tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Valor</th></tr></thead><tbody>' + linhasReceita + '</tbody></table>'
          : '<p class="folha__vazio">Nenhuma receita lançada neste mês.</p>') +
        '<h2>Despesas</h2>' +
        (linhasCusto
          ? '<table class="folha__tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>' + linhasCusto + '</tbody></table>'
          : '<p class="folha__vazio">Nenhuma despesa lançada neste mês.</p>') +
      '</div>' +
      '<footer class="folha__rodape">Relatório produzido pelo ChannelPro para conferência contábil. Não substitui documento fiscal.</footer>';

    area().innerHTML = html;
    imprimir();
  }

  /* ---------- Ficha de vídeo ---------- */

  function fichaDoVideo(videoId) {
    var video = CanalDados.obter('videos', videoId);
    if (!video) return;
    var linhas = CanalDados.linhasDeMargem().filter(function (l) { return l.video.id === videoId; })[0];
    var receitas = CanalDados.listar('receitas').filter(function (r) { return r.videoId === videoId; });
    var custos = CanalDados.listar('custos').filter(function (c) {
      return c.videoId === videoId || (c.modo === 'rateio' && (c.videoIds || []).indexOf(videoId) !== -1);
    });

    var html = '' +
      cabecalho('Ficha do vídeo', video.titulo) +
      '<div class="folha__corpo">' +
        '<div class="folha__totais">' +
          '<div><span>Entrou</span><strong>' + CanalUtil.formatarMoeda(linhas.receita) + '</strong></div>' +
          '<div><span>Saiu</span><strong>' + CanalUtil.formatarMoeda(linhas.custo) + '</strong></div>' +
          '<div><span>Sobrou</span><strong>' + CanalUtil.formatarMoeda(linhas.resultado) + '</strong></div>' +
        '</div>' +
        '<p><strong>Situação:</strong> ' + CanalUtil.escapar(CanalDados.ROTULO_STATUS[video.status] || 'Ideia') +
        ' &nbsp;·&nbsp; <strong>Publicação:</strong> ' + CanalUtil.formatarData(video.dataPublicacao) +
        ' &nbsp;·&nbsp; <strong>Views:</strong> ' + CanalUtil.formatarNumero(video.views) + '</p>' +
        '<h2>Receitas</h2>' +
        (receitas.length
          ? '<table class="folha__tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>' +
            receitas.map(function (r) {
              return '<tr><td>' + CanalUtil.formatarData(r.data) + '</td><td>' + CanalUtil.escapar(r.descricao) + '</td><td class="folha__valor">' + CanalUtil.formatarMoeda(r.valor) + '</td></tr>';
            }).join('') + '</tbody></table>'
          : '<p class="folha__vazio">Nenhuma receita lançada.</p>') +
        '<h2>Custos</h2>' +
        (custos.length
          ? '<table class="folha__tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>' +
            custos.map(function (c) {
              return '<tr><td>' + CanalUtil.formatarData(c.data) + '</td><td>' + CanalUtil.escapar(c.descricao) +
                (c.modo === 'rateio' ? ' (dividido entre ' + (c.videoIds || []).length + ' vídeos)' : '') +
                '</td><td class="folha__valor">' + CanalUtil.formatarMoeda(c.valor) + '</td></tr>';
            }).join('') + '</tbody></table>'
          : '<p class="folha__vazio">Nenhum custo lançado.</p>') +
      '</div>' +
      '<footer class="folha__rodape">Documento gerado localmente pelo ChannelPro.</footer>';

    area().innerHTML = html;
    imprimir();
  }

  return {
    minhaSemana: minhaSemana,
    relatorioDoMes: relatorioDoMes,
    fichaDoVideo: fichaDoVideo
  };
})();
