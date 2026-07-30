# Tratamento de bases de clientes

## Objetivo

Transformar uma planilha de clientes com documentos e telefones duplicados em um
arquivo com exatamente uma linha válida por CPF/CNPJ, no layout:

| CPF / CNPJ | Cliente | Nome | Email | Whatsapp |
| ---------- | ------- | ---- | ----- | -------- |

## Regras aprovadas

### Documento

1. Remover qualquer caractere que não seja número.
2. Preservar zeros à esquerda.
3. Validar CPF com 11 dígitos e CNPJ com 14 dígitos, incluindo os dígitos
   verificadores.
4. Descartar documentos inválidos.
5. Gerar no máximo uma linha para cada CPF/CNPJ válido.

### Telefone

1. Remover espaços, sinais, parênteses, hífens e outros caracteres.
2. Remover o código do Brasil `55` quando ele vier antes de um número nacional
   completo.
3. O resultado deve conter 11 dígitos e nunca deve conter o código `55`.
4. Um celular antigo com dez dígitos recebe o nono dígito depois do DDD.
5. Um telefone fixo com dez dígitos não deve ser convertido em celular.
6. A prioridade global dentro de cada CPF/CNPJ é:
   1. Telefone 3;
   2. Telefone 1;
   3. Telefone 2.
7. Quando existirem dois celulares válidos na mesma prioridade, usar a primeira
   ocorrência da planilha.
8. Descartar do arquivo final o documento que não possuir celular válido.

### Contato

1. Cliente, nome e e-mail vêm da mesma linha que forneceu o WhatsApp escolhido.
2. Um e-mail inválido não impede a exportação.
3. A ordem final acompanha a primeira ocorrência de cada documento na planilha.

## Indicadores obrigatórios

- Linhas importadas;
- linhas com documento inválido;
- documentos válidos e únicos;
- documentos duplicados;
- excesso de linhas provocado por duplicidade;
- documentos sem WhatsApp;
- registros finais gerados;
- telefones fixos encontrados;
- telefones inválidos encontrados;
- celulares que receberam o nono dígito.

## Retenção e acesso para os próximos blocos

- Cada Analista de Processos acessa somente as próprias importações.
- Administradores podem acessar todas as importações.
- Analista de Processos e Administrador podem excluir importações.
- Ao concluir uma nova importação do mesmo analista, a importação anterior deve
  ser substituída.
- Decisões manuais poderão ser desfeitas.
- A integração corporativa com Google Sheets poderá ler e escrever, mas será
  implementada somente depois do fluxo de upload estar validado.
