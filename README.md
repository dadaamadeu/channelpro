# ChannelPro — o melhor amigo dos youtubers

Gestão local do canal como empresa: prazos de patrocínio, margem por vídeo, cobrança, custos de produção e histórico de preços.

## Como usar

1. Dê dois cliques em `index.html` — abre no navegador e funciona offline (RNF01).
2. Na primeira vez, o app pergunta se você quer importar uma planilha CSV e cadastrar marcas. Pode pular (RF15): abre vazio e funciona do mesmo jeito.
3. Os dados ficam no próprio navegador deste computador. Nada é enviado para a internet (RF16).

## Backup (RF13)

**Ajustes e backup → Exportar backup**: gera um arquivo `.json`. Guarde-o em pendrive ou pasta segura.
Para restaurar: **Restaurar backup** e escolher o arquivo (substitui tudo — confirmado antes).

## Telas

- **Hoje** — o que vence, o que atrasou e o que está a receber + PDF "Minha semana" (RF01, RF02, RF03).
- **Conteúdo** — pipeline de vídeos em 5 colunas (arraste ou use ◀ ▶) + ficha de cada vídeo com custos, receitas, patrocínios, pasta de arquivos e link do Studio (RF04, RF05, RF12, RF17).
- **Dinheiro** — margem por vídeo, custos com rateio (ex.: R$ 1.200 em 4 vídeos = R$ 300 cada) e relatório do contador (RF06, RF07, RF14).
- **Marcas** — histórico de valores e valor por mil views que você pratica, com anexo de contrato em PDF até 3 MB (RF08, RF09, RF11).

## Importar CSV (RF10)

**Ajustes → Importar CSV**. Funciona com arquivos do YouTube Studio e do AdSense: o app mostra as colunas do arquivo e você diz qual é a data, o valor, o título do vídeo etc. antes de importar.

Atenção: importar o mesmo arquivo duas vezes cria lançamentos duplicados.
