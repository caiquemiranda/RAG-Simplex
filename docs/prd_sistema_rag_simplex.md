# DOCUMENTO DE REQUISITOS DO PRODUTO (PRD)
## Sistema RAG de Auxílio Técnico para Sistemas de Incêndio Simplex

**Autor:** Engenharia de Sistemas / IA  
**Status:** Em Definição  
**Versão:** 1.0  
**Data:** Junho de 2026  

---

## 1. Visão Geral do Produto
Este Documento de Requisitos do Produto (PRD) define as diretrizes funcionais, arquiteturais e de dados para o desenvolvimento de um sistema de Geração Aumentada de Recuperação (**RAG - Retrieval-Augmented Generation**). O objetivo principal é fornecer um assistente inteligente capaz de guiar em tempo real técnicos de campo, analistas de engenharia e operadores não técnicos na triagem, diagnóstico e correção de falhas críticas em painéis de detecção e alarme de incêndio da marca **Simplex**.

O ecossistema abrange os sistemas legados e modernos de grande porte, especificamente os modelos **Simplex 4100, F3200, QE90, códigos de crash de sistema e redes de comunicação/IMS**. O assistente atuará diretamente no ponto de fricção operacional, mitigando o tempo de inatividade do sistema de segurança contra incêndio e garantindo conformidade técnica rígida.

## 2. Objetivos e Critérios de Sucesso

### 2.1. Objetivos do Negócio
* **Redução do MTTR (Mean Time to Repair):** Minimizar o tempo médio gasto por técnicos em campo na identificação de códigos de erro complexos e execução de fluxos de correção.
* **Democratização do Conhecimento Técnico:** Permitir que profissionais com diferentes níveis de senioridade (inclusive operadores não técnicos e equipas de facilidades) façam um primeiro atendimento seguro e resolutivo.
* **Redução de Escalonamento:** Diminuir a sobrecarga sobre o suporte de Nível 3 e engenheiros seniores para falhas corriqueiras ou de interpretação documental.

### 2.2. Critérios de Sucesso Tecnológico
* **Precisão de Recuperação (Context Recall & Precision):** O RAG deve recuperar o bloco exato da falha consultada em mais de 95% das requisições.
* **Alinhamento de Resposta (Faithfulness):** Zero alucinação em instruções técnicas de fiação ou endereçamento, validadas via frameworks de avaliação automatizada (ex: RAGAS).
* **Adoção de Campo:** Interface responsiva com tempo de resposta fim-a-fim inferior a 3 segundos sob conexões de dados móveis padrão.

## 3. Personas e Público-Alvo
O design da interface e a densidade das respostas geradas pelo LLM devem se adaptar dinamicamente aos seguintes perfis de utilizadores:

| Persona | Nível Técnico & Contexto | Necessidade Principal no Sistema |
| :--- | :--- | :--- |
| **Técnico de Automação / Eletrônica** | Alto conhecimento elétrico, familiarizado com hardware, multímetros, testes de continuidade e parametrização. | Instruções precisas de pinagem, níveis de tensão aceitáveis na fiação, localização de jumpers e configuração de Dipswitches. |
| **Analista de Engenharia** | Conhecimento sistémico pleno, responsável por planear modificações, expansões e validar topologias de rede. | Diagnóstico cruzado de falhas de comunicação de rede, códigos de crash de CPU e análise de integridade de loops de fiação. |
| **Operador de Painel / Não-Técnico** | Nenhum conhecimento prévio de hardware Simplex. Atua na guarita ou sala de controlo recebendo o aviso sonoro do painel. | Explicações em linguagem natural e direta sobre o que significa o erro visualizado e ações imediatas de segurança (o que NÃO tocar). |

## 4. Arquitetura de Dados e Estratégia de Ingestão (RAG-Driven)
Para garantir a máxima performance do motor de busca vetorial, a documentação original de engenharia (composta por manuais de manutenção, tabelas de crash e diagramas elétricos) foi consolidada num **arquivo único estruturado em Markdown (.md)**, traduzido para o português (PT-BR/PT-PT) com preservação de termos de diagnóstico nativos em inglês.

> **🚨 Diretriz Crítica de Ingestão: Blocos Autocontidos**
> A fragmentação documental é o principal fator de falha em RAGs industriais. Portanto, o arquivo de ingestão adota o conceito de **unidades de falha autocontidas**. Cada bloco sob uma tag de terceiro nível (`###`) agrupa obrigatoriamente: o termo exato exibido no display, a tradução/explicação conceitual, as causas prováveis e a solução passo a passo.

### 4.1. Processamento de Elementos Complexos do Manual
1. **Conversão de Fluxogramas:** Fluxos gráficos de decisão (ex: caminhos de árvore lógica para falhas de *"No Answer"* ou *"Wrong Device"*) foram completamente reescritos em formato de prosa estruturada com condicionais inline explícitas (ex: "Passo 2: Verifique se o LED de sinalização do módulo está a piscar. Se SIM, prossiga para a validação do laço no Passo 3; se NÃO, meça a tensão nos terminais T1 e T2..."). Essa técnica garante que o chunk mantenha coerência semântica completa mesmo quando isolado pelo fatiador.
2. **Textualização de Imagens Técnicas:** Diagramas complexos de fiação (barramentos de áudio QE90, módulos STRM9502, placas de interface FIB8910 e fiação de rede WTRM2000) foram convertidos em descrições textuais exaustivas, detalhando a localização exata de jumpers, chaves rotativas, trimpots de ajuste de ganho e numeração de bornes de conexão.

### 4.2. Configuração de Fragmentação (Chunking Strategy)
O pipeline de processamento de texto não utilizará fatiamento por tamanho fixo de caracteres ou tokens (Fixed-size Window Chunking), pois isso fragmentaria as instruções lógicas de correção de pane.
* **Método:** Markdown Header-Based Chunking direcionado para o nível 3 de cabeçalho (`###`).
* **Meta-dados Injetados:** Cada chunk gerado conterá metadados estáticos anexados na sua origem para permitir filtragem híbrida pré-retrieval (Vetor + Filtro de Metadados):
  `{ "sistema": "4100|QE90|F3200|REDE", "severidade": "Alta|Média|Crítica", "idioma_erro": "EN-US" }`

## 5. Requisitos Funcionais

### 5.1. Mecanismo de Busca Híbrida e Bilíngue
O sistema deve aceitar termos de pesquisa em português técnico, linguagem coloquial de campo ("painel a apitar", "luz vermelha a piscar") ou o código bruto exibido na tela de cristal líquido do painel (geralmente em inglês). O modelo de embeddings deve mapear a proximidade semântica entre termos como *"HEAD MISSING"* e *"CABEÇOTE AUSENTE"* para o mesmo vetor de destino.

### 5.2. Interface de Resposta Adaptativa em Dupla Camada
O LLM, ao receber os contextos recuperados pelo RAG, deverá estruturar a resposta obrigatoriamente em duas secções bem delimitadas visualmente:
* **Camada de Linguagem Simples (Foco em Não-Técnicos):** Explicação em alto nível sobre o que a falha representa para a edificação, impacto no funcionamento geral e ações de mitigação preliminares seguras.
* **Camada de Resolução Técnica (Foco em Engenharia/Campo):** Procedimentos avançados passo a passo, testes elétricos necessários com indicação de escala do multímetro, mapas de dipswitches para substituição física de dispositivos endereçáveis e checagem de aterramento.

> **⚠️ Requisito Mandatório: Protocolo de Segurança (Safety Triggers)**
> Por se tratar de sistemas de segurança de vida, sempre que o contexto recuperar falhas que envolvam risco elétrico real, bypass de zonas inteiras de supressão, ou manipulação de fontes de alimentação primária (AC/DC do carregador 4100-0157A), o sistema DEVERÁ gerar no topo da resposta um aviso destacado de segurança com instruções explícitas de quando interromper o procedimento e acionar a engenharia de segurança ou o suporte de fábrica.

## 6. Requisitos Não Funcionais

### 6.1. Confiabilidade e Métricas de Similaridade
A recuperação de vetores utilizará o cálculo de distância de cosseno para ranqueamento de relevância dos pedaços de texto:
`Simp(A, B) = (A · B) / (||A|| ||B||)`
O limiar mínimo (threshold) de aceitação para o score de similaridade deve ser de `0.78`. Caso nenhuma correspondência documental atinja este valor, o assistente deverá acionar um fallback gracioso, informando que a falha específica não consta na base de conhecimento oficial e direcionando para os contatos de suporte de engenharia.

### 6.2. Segurança e Infraestrutura
* **Privacidade:** O tráfego de dados deve ser criptografado via TLS 1.3. Nenhuma informação de logs de falha de plantas reais de clientes deve ser exposta para treinamento de modelos de terceiros (públicos).
* **Disponibilidade Mobile:** O front-end do assistente (Chatbot) deve ser otimizado para navegadores móveis e aplicações de mensageria corporativa, dado que o principal ambiente de uso é o campo de instalação industrial.

## 7. Plano de Validação e Testes do RAG
Antes do deploy em ambiente de produção, o sistema passará por uma bateria de validação dividida em três fases:
1. **Teste de Grounding (Ancoragem):** Submissão de 100 perguntas geradas por engenheiros especialistas baseadas em falhas reais de manuais Simplex. Avaliação manual e automatizada para garantir que o LLM não adicionou passos de calibração que pertençam a outras marcas (ex: Notifier ou Bosch).
2. **Teste de Usabilidade Não-Técnica:** Simulação de uso com operadores de monitoramento predial de nível básico inserindo strings brutas de erro de display (ex: "Earth Fault Search Active") para medir a eficácia da Camada de Linguagem Simples.
3. **Validação de Dipswitch / Binário:** Checagem rigorosa se as tabelas de conversão de endereçamento de Dipswitches de 8 posições descritas textualmente no Markdown estão sendo convertidas corretamente nas respostas em formato visual legível para montagem rápida em campo.
