/* ChannelPro — aplicativo
   Navegação entre telas, contador do "Hoje", onboarding (RF15),
   ajustes e backup (RF13). Roda por último no index.html. */

'use strict';

var CanalApp = (function () {

  var TELAS = {};
  var atual = 'hoje';

  function registrarTelas() {
    TELAS.hoje = CanalTelaHoje;
    TELAS.conteudo = CanalTelaConteudo;
    TELAS.dinheiro = CanalTelaDinheiro;
    TELAS.marcas = CanalTelaMarcas;
  }

  function irPara(tela) {
    if (!TELAS[tela]) return;
    atual = tela;
    $$('.navegacao__item').forEach(function (botao) {
      if (botao.getAttribute('data-tela') === tela) botao.setAttribute('aria-current', 'page');
      else botao.removeAttribute('aria-current');
    });
    renderizar();
  }

  function renderizar() {
    var tela = TELAS[atual];
    if (!tela) return;
    tela.render($('#conteudo'));
    atualizarContador();
    atualizarRodape();
  }

  function recarregar() { renderizar(); }

  function atualizarContador() {
    var contador = $('#contador-hoje');
    if (!contador) return;
    var pendentes = CanalDados.entregas().filter(function (i) { return i.situacao !== 'entregue'; }).length;
    contador.textContent = String(pendentes);
    contador.hidden = pendentes === 0;
    contador.classList.toggle('oculto', pendentes === 0);
  }

  function formatarDataHora(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function atualizarRodape() {
    var config = CanalDados.config();
    var nome = $('#nome-canal-lateral');
    if (nome) nome.textContent = config.nomeCanal || 'Meu canal';
    var rodape = $('#rodape-backup');
    if (rodape) {
      rodape.textContent = 'Backup: ' + (formatarDataHora(config.ultimoBackup) || 'nunca feito');
    }
  }

  /* ---------- ajustes e backup (RF13) ---------- */

  function abrirAjustes() {
    var config = CanalDados.config();
    var html = '' +
      '<div class="grade-campos">' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="aj-nome">Nome do canal</label>' +
          '<input type="text" id="aj-nome" value="' + CanalUtil.escapar(config.nomeCanal || '') + '" placeholder="Ex.: Cozinha da Dadá">' +
        '</div>' +
        '<div class="campo">' +
          '<label class="campo__rotulo" for="aj-pasta">Pasta padrão dos arquivos</label>' +
          '<input type="text" id="aj-pasta" value="' + CanalUtil.escapar(config.pastaMidiaPadrao || '') + '" placeholder="Ex.: D:\\Videos\\brutos">' +
        '</div>' +
      '</div>' +

      '<div class="secao-ajustes">' +
        '<h3 class="secao-ajustes__titulo">Backup dos dados</h3>' +
        '<p class="dica">O backup é um arquivo JSON gerado no computador. Guarde-o em pendrive ou pasta de confiança.</p>' +
        '<div class="secao-ajustes__linha">' +
          '<button type="button" class="botao botao--primario" data-aj-acao="exportar">⬇ Exportar backup</button>' +
          '<button type="button" class="botao botao--secundario" data-aj-acao="importar">⬆ Restaurar backup</button>' +
        '</div>' +
        '<p class="campo__ajuda">Último backup: ' + (formatarDataHora(config.ultimoBackup) || 'nunca feito') + '</p>' +
      '</div>' +

      '<div class="secao-ajustes">' +
        '<h3 class="secao-ajustes__titulo">Importar planilha</h3>' +
        '<p class="dica">Traga os dados de arquivos CSV exportados do YouTube Studio ou do AdSense.</p>' +
        '<div class="secao-ajustes__linha"><button type="button" class="botao botao--secundario" data-aj-acao="importar-csv">Importar CSV</button></div>' +
      '</div>' +

      '<div class="secao-ajustes">' +
        '<h3 class="secao-ajustes__titulo">Zona de perigo</h3>' +
        '<p class="dica dica--alerta">Apagar tudo limpa vídeos, marcas, receitas e custos deste navegador. Exporte um backup antes.</p>' +
        '<div class="secao-ajustes__linha"><button type="button" class="botao botao--perigo" data-aj-acao="apagar-tudo">Apagar todos os dados</button></div>' +
      '</div>';

    CanalUtil.abrirModal({
      titulo: 'Ajustes e backup',
      largura: 'larga',
      conteudo: html,
      acoes: [
        { rotulo: 'Fechar', classe: 'botao--secundario', aoClicar: CanalUtil.fecharModal },
        { rotulo: 'Salvar ajustes', classe: 'botao--primario', aoClicar: salvarAjustes }
      ]
    });

    CanalUtil.$$('#modal-fundo [data-aj-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-aj-acao');
        if (acao === 'exportar') exportarBackup();
        else if (acao === 'importar') importarBackup();
        else if (acao === 'importar-csv') CanalImportar.iniciar();
        else if (acao === 'apagar-tudo') apagarTudo();
      });
    });
  }

  function salvarAjustes() {
    CanalDados.definirConfig('nomeCanal', $('#aj-nome').value.trim());
    CanalDados.definirConfig('pastaMidiaPadrao', $('#aj-pasta').value.trim());
    CanalUtil.fecharModal();
    CanalUtil.toast('Ajustes salvos.');
    CanalApp.recarregar();
  }

  function exportarBackup() {
    var agora = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var nome = 'ChannelPro-backup-' + agora.getFullYear() + pad(agora.getMonth() + 1) + pad(agora.getDate()) +
      '-' + pad(agora.getHours()) + pad(agora.getMinutes()) + '.json';
    CanalUtil.baixarArquivo(nome, CanalDados.exportarJSON(), 'application/json;charset=utf-8');
    CanalDados.definirConfig('ultimoBackup', agora.toISOString());
    atualizarRodape();
    CanalUtil.toast('Backup exportado. Guarde este arquivo em lugar seguro.');
  }

  function importarBackup() {
    CanalUtil.escolherArquivo('.json,application/json').then(function (arquivo) {
      if (!arquivo) return;
      CanalUtil.lerArquivoTexto(arquivo).then(function (texto) {
        if (!window.confirm('Restaurar este backup vai substituir TODOS os dados atuais. Continuar?')) return;
        try {
          CanalDados.importarJSON(texto);
          CanalUtil.fecharModal();
          CanalUtil.toast('Backup restaurado.');
          CanalApp.recarregar();
        } catch (erro) {
          CanalUtil.toast(erro.message, 'erro');
        }
      }, function () {
        CanalUtil.toast('Não foi possível ler o arquivo.', 'erro');
      });
    });
  }

  function apagarTudo() {
    if (!window.confirm('Isto apaga TODOS os dados do ChannelPro neste navegador. Continuar?')) return;
    if (!window.confirm('Tem certeza mesmo? Não dá para desfazer.')) return;
    CanalDados.apagarTudo();
    CanalUtil.fecharModal();
    CanalUtil.toast('Dados apagados. O aplicativo está vazio.');
    CanalApp.recarregar();
  }

  /* ---------- onboarding (RF15: dois passos, pular deixa o app vazio e funcional) ---------- */

  function onboarding() {
    var html = '' +
      '<div class="passos">' +
        '<span class="passo passo--atual">1 · Trazer seus dados</span>' +
        '<span class="passo">2 · Marcas ativas</span>' +
      '</div>' +
      '<p>Já tem uma planilha com vídeos ou ganhos? Importe um arquivo CSV exportado do YouTube Studio ou do AdSense — os dados nunca saem deste computador.</p>' +
      '<div class="linha">' +
        '<button type="button" class="botao botao--primario" data-ob-acao="importar">Importar CSV agora</button>' +
        '<button type="button" class="botao botao--sutil" data-ob-acao="pular">Não tenho planilha, pular</button>' +
      '</div>' +
      '<p class="campo__ajuda">Pode pular sem medo: o aplicativo abre vazio e funciona do mesmo jeito.</p>';

    CanalUtil.abrirModal({ titulo: 'Bem-vinda ao ChannelPro', conteudo: html });

    CanalUtil.$$('#modal-fundo [data-ob-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-ob-acao');
        if (acao === 'importar') {
          CanalImportar.iniciar(function () { onboardingPasso2(); });
        } else {
          concluirOnboarding();
        }
      });
    });
  }

  function onboardingPasso2() {
    var html = '' +
      '<div class="passos">' +
        '<span class="passo passo--feito">1 · Trazer seus dados ✓</span>' +
        '<span class="passo passo--atual">2 · Marcas ativas</span>' +
      '</div>' +
      '<p>Cadastre as marcas que te patrocinam (ou costumam patrocinar). Você também pode deixar para depois.</p>' +
      '<div class="linha">' +
        '<input type="text" id="ob-marca" placeholder="Nome da marca" style="flex:1">' +
        '<button type="button" class="botao botao--secundario" data-ob-acao="adicionar">+ Adicionar</button>' +
      '</div>' +
      '<div id="ob-lista" class="espaco-topo"></div>' +
      '<div class="linha espaco-topo">' +
        '<button type="button" class="botao botao--primario" data-ob-acao="concluir">Concluir</button>' +
        '<button type="button" class="botao botao--sutil" data-ob-acao="pular">Cadastrar depois</button>' +
      '</div>';

    CanalUtil.abrirModal({ titulo: 'Bem-vinda ao ChannelPro', conteudo: html });
    atualizarLista();

    function atualizarLista() {
      var marcas = CanalDados.listar('marcas');
      $('#ob-lista').innerHTML = marcas.length
        ? '<p class="dica">Marcas cadastradas: ' + marcas.map(function (m) { return CanalUtil.escapar(m.nome); }).join(', ') + '</p>'
        : '<p class="dica">Nenhuma marca adicionada ainda.</p>';
    }

    function adicionar() {
      var nome = $('#ob-marca').value.trim();
      if (!nome) {
        CanalUtil.toast('Escreva o nome da marca.', 'erro');
        return;
      }
      CanalDados.inserir('marcas', { nome: nome, contato: '', observacao: '' });
      $('#ob-marca').value = '';
      $('#ob-marca').focus();
      atualizarLista();
    }

    CanalUtil.$$('#modal-fundo [data-ob-acao]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var acao = botao.getAttribute('data-ob-acao');
        if (acao === 'adicionar') adicionar();
        else concluirOnboarding();
      });
    });

    $('#ob-marca').addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') adicionar();
    });
  }

  function concluirOnboarding() {
    CanalDados.definirConfig('onboardingConcluido', true);
    CanalUtil.fecharModal();
    CanalUtil.toast('Tudo pronto. Bem-vinda!');
    CanalApp.recarregar();
  }

  /* ---------- partida ---------- */

  function iniciar() {
    registrarTelas();
    CanalDados.carregar();
    atualizarRodape();

    $$('.navegacao__item').forEach(function (botao) {
      botao.addEventListener('click', function () {
        irPara(botao.getAttribute('data-tela'));
      });
    });

    var botaoAjustes = $('#botao-ajustes');
    if (botaoAjustes) botaoAjustes.addEventListener('click', abrirAjustes);

    CanalDados.aoMudar(function () {
      atualizarContador();
      atualizarRodape();
    });

    irPara('hoje');

    if (!CanalDados.config().onboardingConcluido) onboarding();
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  return { irPara: irPara, recarregar: recarregar, abrirAjustes: abrirAjustes };
})();
