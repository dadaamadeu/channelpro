/* ChannelPro — importação de CSV (RF10)
   YouTube Studio e AdSense exportam CSV com formatos diferentes.
   O mapeamento de colunas é configurável — é o ponto mais frágil do
   sistema, então tudo é conferido na tela antes de gravar. */

'use strict';

var CanalImportar = (function () {

  var CAMPOS = [
    { chave: 'data', rotulo: 'Data', pistas: ['data', 'date', 'dia'] },
    { chave: 'valor', rotulo: 'Valor (R$)', pistas: ['valor', 'receita', 'ganhos', 'earnings', 'estimated'] },
    { chave: 'descricao', rotulo: 'Descrição', pistas: ['descri', 'description', 'detalh'] },
    { chave: 'titulo', rotulo: 'Título do vídeo', pistas: ['títul', 'titul', 'title', 'vídeo', 'video'] },
    { chave: 'views', rotulo: 'Visualizações', pistas: ['visualiza', 'views', 'exibi', 'impress'] }
  ];

  function iniciar(aoConcluir) {
    CanalUtil.escolherArquivo('.csv,text/csv,text/plain').then(function (arquivo) {
      if (!arquivo) return;
      CanalUtil.lerArquivoTexto(arquivo).then(function (texto) {
        var linhas = CanalUtil.parseCSV(texto);
        if (linhas.length < 2) {
          CanalUtil.toast('O arquivo não tem linhas legíveis. Exporte o CSV de novo do YouTube Studio ou do AdSense.', 'erro');
          return;
        }
        abrirMapeamento(arquivo.name, linhas, aoConcluir);
      }, function () {
        CanalUtil.toast('Não foi possível ler o arquivo.', 'erro');
      });
    });
  }

  /* AdSense costuma antepor linhas de título do relatório antes do cabeçalho.
     A linha do cabeçalho verdadeira é a com mais colunas preenchidas. */
  function detectarCabecalho(linhas) {
    var pontuacao = function (linha) {
      return linha.filter(function (v) { return String(v).trim() !== ''; }).length;
    };
    var melhor = 0;
    var maior = pontuacao(linhas[0] || []);
    var limite = Math.min(linhas.length, 10);
    for (var i = 1; i < limite; i++) {
      var nota = pontuacao(linhas[i]);
      if (nota > maior) { maior = nota; melhor = i; }
    }
    return maior >= 3 ? melhor : 0;
  }

  function sugerirColuna(cabecalho, pistas) {
    for (var i = 0; i < cabecalho.length; i++) {
      var nome = String(cabecalho[i]).toLowerCase();
      for (var j = 0; j < pistas.length; j++) {
        if (nome.indexOf(pistas[j]) !== -1) return i;
      }
    }
    return -1;
  }

  function opcoesDeColunas(cabecalho, selecionado) {
    var html = '<option value="-1"' + (selecionado === -1 ? ' selected' : '') + '>(não usar)</option>';
    cabecalho.forEach(function (nome, i) {
      html += '<option value="' + i + '"' + (i === selecionado ? ' selected' : '') + '>' +
        CanalUtil.escapar(String(nome).slice(0, 40)) + '</option>';
    });
    return html;
  }

  function abrirMapeamento(nomeArquivo, linhas, aoConcluir) {
    var indiceInicial = detectarCabecalho(linhas);

    function render(intCab) {
      var cabecalho = linhas[intCab] || [];
      var dados = linhas.slice(intCab + 1);

      var camposHtml = CAMPOS.map(function (campo) {
        var sugerido = sugerirColuna(cabecalho, campo.pistas);
        return '<div class="campo">' +
          '<label class="campo__rotulo" for="imp-' + campo.chave + '">' + CanalUtil.escapar(campo.rotulo) + '</label>' +
          '<select id="imp-' + campo.chave + '">' + opcoesDeColunas(cabecalho, sugerido) + '</select>' +
        '</div>';
      }).join('');

      var opcoesLinha = '';
      var limite = Math.min(linhas.length, 10);
      for (var k = 0; k < limite; k++) {
        opcoesLinha += '<option value="' + k + '"' + (k === intCab ? ' selected' : '') + '>Linha ' + (k + 1) + '</option>';
      }

      var previa = dados.slice(0, 3).map(function (linha) {
        return '<tr>' + linha.slice(0, 8).map(function (celula) {
          return '<td>' + CanalUtil.escapar(String(celula).slice(0, 24)) + '</td>';
        }).join('') + '</tr>';
      }).join('');

      var html = '' +
        '<p class="dica">Arquivo: <strong>' + CanalUtil.escapar(nomeArquivo) + '</strong> — ' +
          dados.length + (dados.length === 1 ? ' linha de dados' : ' linhas de dados') + ' depois do cabeçalho.</p>' +
        '<div class="linha-campos">' +
          '<div class="campo">' +
            '<label class="campo__rotulo" for="imp-linha">Onde estão os nomes das colunas</label>' +
            '<select id="imp-linha">' + opcoesLinha + '</select>' +
          '</div>' +
          '<div class="campo">' +
            '<label class="campo__rotulo" for="imp-origem">De onde vieram os valores</label>' +
            '<select id="imp-origem"><option value="adsense">AdSense (YouTube)</option><option value="outro">Outro</option></select>' +
          '</div>' +
        '</div>' +
        '<div class="grade-campos">' + camposHtml + '</div>' +
        '<div class="contagem-importacao">' +
          '<span>Linhas de dados: <strong>' + dados.length + '</strong></span>' +
          '<span>Colunas no arquivo: <strong>' + cabecalho.length + '</strong></span>' +
        '</div>' +
        (previa
          ? '<div class="ficha-secao"><h3 class="ficha-secao__titulo">Prévia das primeiras linhas</h3>' +
            '<div style="overflow-x:auto"><table class="tabela-simples"><tbody>' + previa + '</tbody></table></div></div>'
          : '') +
        '<p class="campo__ajuda">A importação cria lançamentos novos. Importar o mesmo arquivo duas vezes duplica os números.</p>';

      CanalUtil.abrirModal({
        titulo: 'Importar CSV — conferir colunas',
        largura: 'larga',
        conteudo: html,
        acoes: [
          { rotulo: 'Cancelar', classe: 'botao--secundario', aoClicar: function () {
            CanalUtil.fecharModal();
            if (aoConcluir) aoConcluir();
          } },
          { rotulo: 'Importar', classe: 'botao--primario', aoClicar: function () { importar(nomeArquivo, intCab, dados, aoConcluir); } }
        ]
      });

      $('#imp-linha').addEventListener('change', function () {
        render(Number($('#imp-linha').value));
      });
    }

    render(indiceInicial);
  }

  /* ---------- gravação ---------- */

  function normalizarData(texto) {
    var t = String(texto || '').trim();
    if (!t) return null;
    var iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return iso[1] + '-' + dois(iso[2]) + '-' + dois(iso[3]);
    var barra = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (barra) {
      var a = Number(barra[1]);
      var b = Number(barra[2]);
      var dia = a, mes = b;
      if (b > 12) { dia = b; mes = a; } /* veio mês na frente (mm/dd) */
      var ano = Number(barra[3]);
      if (ano < 100) ano += 2000;
      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
      return ano + '-' + dois(mes) + '-' + dois(dia);
    }
    return null;
  }

  function dois(n) { return String(n).padStart(2, '0'); }

  /* views não têm decimal nem sinal: descarta tudo que não é dígito */
  function numeroDeViews(texto) {
    var digitos = String(texto || '').replace(/[^\d]/g, '');
    return digitos ? parseInt(digitos, 10) : 0;
  }

  function encontrarOuCriarVideo(titulo, data, views) {
    var chave = titulo.toLowerCase();
    var existente = CanalDados.listar('videos').filter(function (v) {
      return String(v.titulo || '').toLowerCase() === chave;
    })[0];
    if (existente) {
      if (views > 0 && views > (existente.views || 0)) {
        CanalDados.atualizar('videos', existente.id, { views: views });
      }
      return existente.id;
    }
    var novo = CanalDados.inserir('videos', {
      titulo: titulo,
      status: data ? 'publicado' : 'ideia',
      dataPrevista: null,
      dataPublicacao: data || null,
      link: '',
      pastaMidia: '',
      observacao: 'criado pela importação de CSV',
      views: views || 0
    });
    return novo.id;
  }

  function importar(nomeArquivo, intCab, dados, aoConcluir) {
    var mapa = {};
    CAMPOS.forEach(function (campo) {
      mapa[campo.chave] = Number($('#imp-' + campo.chave).value);
    });
    var origem = $('#imp-origem').value;

    if (mapa.valor === -1 && mapa.views === -1 && mapa.titulo === -1) {
      CanalUtil.toast('Escolha ao menos uma coluna para importar.', 'erro');
      return;
    }

    var celula = function (linha, indice) {
      return indice >= 0 && indice < linha.length ? String(linha[indice]).trim() : '';
    };

    var importados = 0;
    var ignorados = 0;
    var viewsPerdidas = 0;

    dados.forEach(function (linha) {
      var data = normalizarData(celula(linha, mapa.data));
      var valor = mapa.valor === -1 ? 0 : CanalUtil.numeroDoTexto(celula(linha, mapa.valor));
      var titulo = mapa.titulo === -1 ? '' : celula(linha, mapa.titulo);
      var views = mapa.views === -1 ? 0 : numeroDeViews(celula(linha, mapa.views));
      var descricao = mapa.descricao === -1 ? '' : celula(linha, mapa.descricao);

      if (!valor && !views && !titulo && !data) { ignorados++; return; }

      var videoId = null;
      if (titulo) {
        videoId = encontrarOuCriarVideo(titulo, data, views);
      } else if (views > 0) {
        /* visualizações sem vídeo para vincular são descartadas (com aviso) */
        viewsPerdidas += 1;
      }

      if (valor > 0) {
        CanalDados.inserir('receitas', {
          data: data || CanalUtil.hojeISO(),
          valor: valor,
          origem: origem,
          videoId: videoId,
          descricao: descricao || 'Importado de ' + nomeArquivo
        });
      }
      importados += 1;
    });

    CanalUtil.fecharModal();
    CanalUtil.toast(importados + (importados === 1 ? ' lançamento importado.' : ' lançamentos importados.') +
      (ignorados ? ' (' + ignorados + ' linhas vazias ignoradas)' : ''));
    if (viewsPerdidas) {
      CanalUtil.toast('Visualizações só entram quando você indica também a coluna de título do vídeo.', 'erro');
    }
    CanalApp.recarregar();
    if (aoConcluir) aoConcluir();
  }

  return { iniciar: iniciar };
})();
