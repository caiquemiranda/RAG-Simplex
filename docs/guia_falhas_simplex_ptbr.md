# Guia de Correção de Falhas — Painéis de Detecção de Incêndio Simplex

> **Sobre este documento**
> Material de referência para auxílio à correção de falhas em painéis Simplex (séries 4100, F3200, QE90 e sistemas em rede IMS/TrueSite). Traduzido e reorganizado a partir do *Simplex Fire Products — Fault & Assistance Guide (Rev A, 29 abril 2009)*.
> Cada falha é apresentada como um bloco independente contendo: nome exato exibido no painel, explicação simples, causas possíveis e passo a passo de solução.

---

## ⚠️ Avisos de segurança — leia antes de qualquer intervenção

Estes painéis controlam sistemas de detecção e alarme de incêndio. Uma intervenção incorreta pode deixar um prédio sem proteção contra incêndio.

- **Painéis em alarme ou com brigada acionada:** não tente "consertar" antes de confirmar se há um incêndio real. Trate toda condição de alarme como real até ter certeza do contrário.
- **Nível de acesso:** muitas operações exigem login com senha de nível técnico. Não force operações que o painel bloqueia.
- **Isolar zonas:** isolar uma zona impede que o alarme daquela área acione o sistema. Só isole quando souber exatamente o que está fazendo e reabilite assim que a condição for resolvida.
- **Quando parar e chamar suporte:** se a falha persistir após os passos descritos, se envolver placas internas com dúvida, ou se você não tiver o nível de acesso necessário, **pare e contate o suporte Simplex** (contatos no final do documento). É preferível pedir ajuda a deixar um sistema de incêndio inoperante.
- **Falhas intermitentes** só podem ser diagnosticadas enquanto a falha está ativa.

---

## Como usar este guia

1. Leia a mensagem **exata** que aparece no display LCD do painel ou na tela do sistema gráfico (IMS/TrueSite).
2. Procure o bloco de falha com esse nome.
3. **Regra de ouro do 4100:** antes de diagnosticar qualquer dispositivo endereçável, confirme que o cartão de loop (Loop Card) está em estado NORMAL. Se o cartão de loop estiver em falha, **todos** os dispositivos daquele loop aparecem como NORMAL (falsamente), o que esconde o problema real.
4. Siga o passo a passo. Em cada falha há uma explicação em linguagem simples (para qualquer nível) e os passos técnicos.

---

# SEÇÃO 1 — PAINÉIS SÉRIE 4100 (4100U, 4100+, 4100A, 4020, 4100 Classic)

## 1.1 Operação básica do painel 4100U

**O que é o painel.** O display do painel tem duas partes: a **Interface do Operador** (parte superior) e os **botões e indicadores de Isolamento de Zona** (parte inferior). Os detectores de incêndio são agrupados em **zonas** (áreas agrupadas e pesquisáveis).

**Isolamento de zona.** Pressionar o botão de isolamento de uma zona impede que um alarme daquele grupo acione as saídas do painel. Quando um detector **não isolado** detecta um alarme, o painel: toca a campainha, chama a brigada de incêndio e aciona o Sistema de Aviso/Evacuação, junto com outras funções programadas (específicas do local).

**Indicações.** A Interface do Operador mostra o status comum de Alarme, Falha e Isolamento em LEDs, e o status de pontos (detectores) no LCD. Quando ocorre um Alarme, Falha ou Isolamento, a cigarra (buzzer) soa até que a tecla "Acknowledge" correspondente (ex.: "Fire Alarm Ack") seja pressionada.

**Reset do painel.** O painel é reiniciado pressionando "System Reset". Se o alarme não resetar, o ponto pode ainda estar ativado (ou seja, o detector continua em alarme). Nesse caso:
1. Pressione "Fire Alarm Ack" quando o alarme do ponto estiver exibido.
2. Pressione "Disable" e depois "Enter".
3. Pressione "Fault Ack" (para reconhecer a falha causada por desabilitar um ponto).
4. Pressione "System Reset" novamente.
5. **Importante:** o detector desabilitado deve ser reabilitado assim que a condição for resolvida.

---

## 1.2 Comandos básicos da interface (navegação no painel)

Comandos do painel frontal para navegar pelos componentes do sistema. Saídas (output points) podem ser controladas seguindo estes passos e depois comandando o ponto pelas teclas On/Off/Auto.

> **Atenção:** controlar saídas manualmente cria uma falha no display LCD. Para limpar essas falhas, cada saída alterada manualmente precisa voltar ao estado AUTO, ou então pressione o CPU Reset (Warm Start).

| Pressione estas teclas para selecionar pontos | Dados do ponto a inserir |
|---|---|
| **ZONE** + Número + **Enter** (apenas 4100A) | Número de uma zona. Após Enter, use Previous/Next para rolar pelos pontos da zona. |
| **SIG** + Número + **Enter** | Número de um circuito de sinal |
| **AUX** + Número + **Enter** | Número de um ponto de relé auxiliar |
| **FB** + Número + **Enter** | Número de um ponto de feedback |
| **IO** + Número + **Enter** | Número de um ponto de E/S de 24 pontos |
| **IDNet** (4100U) / **Mapnet** (4100 antigo) + Canal-Dispositivo + **Enter** | Para o Canal (loop): número do canal IDNet, MAPNET ou VESDA. Insira um traço com a tecla NET. Depois o número do dispositivo endereçável. |
| **P** + Número + **Enter** | Número de um ponto pseudo digital |
| **A** + Número + **Enter** | Número de um ponto pseudo analógico |
| **L** + Número + **Enter** | Número de um ponto pseudo de lista |
| **NET** + Número + **Enter** | Número do nó de rede. Quando a tela pedir o tipo de ponto (Zone, Signal, etc.), pressione a tecla correspondente, insira o número do ponto e Enter. |
| **ADDR** + Cartão-Ponto-Subponto + **Enter** | Número do cartão, traço (tecla NET), número do subponto. |

---

## 1.3 Reset de falhas travadas (latched) — Warm Start / reinício de CPU

**O que significa.** Algumas falhas "travam" (latch) e **não** são limpas pelo botão "System Reset". Para limpar falhas travadas ou alguns problemas de rede, é necessário um **Warm-Start** (reinício da CPU / CPU Reboot).

**Como fazer um Warm-Start:**
1. Ganhe acesso ao cartão de CPU. O cartão de CPU geralmente é o único cartão legado (montado verticalmente) com o lado dos componentes virado em direção diferente dos demais — ou então será o único cartão do painel com uma bateria de RAM pequena, plana e redonda.
2. Localize o pequeno botão (push-button switch) na borda inferior do cartão (chamado WARM START SWITCH / SW1).
3. Pressione esse botão. O painel reinicializa.
4. Aguarde de 2 a 5 minutos para o painel ficar totalmente ativo e restabelecer comunicação com todos os dispositivos.

> **Nota:** iniciar o painel a partir de um estado desligado é chamado de *cold-start*.

**Descrição da placa de CPU (4100U) — localização de componentes:**
- **MODEM:** conector no topo da placa.
- **CPU BOOTLOADER LEDs (LED1 a LED4):** lado direito superior.
- **TROUBLE LED (LED5):** lado direito, abaixo dos LEDs do bootloader. Comportamento do LED5: **Apagado** = sem falha; **Piscando** = a CPU tem energia mas o software está falhando em alcançar o watchdog; **Aceso fixo** = a tensão de 5V está fora da faixa aceitável.
- **CONNECTOR TO CPU MOTHERBOARD (P9):** lado esquerdo central.
- **SERVICE PORT (P5):** lado direito central.
- **WARM START SWITCH (SW1):** borda inferior central da placa — é o botão usado para o reinício.

---

## 1.4 Falhas do Cartão de Loop (Loop Card — MAPNET ou IDNET)

> **REGRA CRÍTICA:** É vital que o cartão de loop esteja em estado NORMAL antes de iniciar o diagnóstico de dispositivos endereçáveis. Se o cartão de loop (MAPNET ou IDNET) está em estado ANORMAL (FALHA), **todos os dispositivos daquele loop são exibidos como NORMAL** (falsamente). Essa indicação NORMAL é usada para reduzir o número de falhas exibidas — sem ela, todos os dispositivos apareceriam como NO ANSWER.

**Como confirmar que um cartão de loop está NORMAL:**
1. Pressione o botão MENU.
2. Role as opções até chegar em CARD STATUS.
3. Pressione ENTER.
4. Role pelos cartões do painel e confirme que cada cartão de loop está NORMAL.
5. Se aparecer **CARD MISSING FAILED ABNORMAL**, pressione ENTER e role pelas falhas do cartão.
6. Consulte a seção da falha específica.
7. Tensão de loop esperada = aproximadamente **30V DC**.

---

### Falha: Card Missing/Failed (Cartão Ausente/Falhou)

**Explicação simples.** O cartão de circuito não está se comunicando corretamente com o controlador do painel.

**Causas possíveis:**
- Cartão não foi instalado.
- Cartão não está bem encaixado no conector → desligue o painel, limpe os conectores e reinsira.
- Cartão não foi endereçado corretamente.
- Baud rate do cartão configurado errado (a Dipswitch 1 deve estar sempre na posição ON).
- Outro cartão foi endereçado com o mesmo endereço deste cartão.
- Cartão falhou (defeito).

---

### Falha: Correct Card Abnormal (Cartão Correto Anormal)

**Explicação simples.** O tipo errado de cartão foi endereçado nesta localização.

**Causas possíveis:**
- Cartão incorreto instalado no painel.
- Dois cartões têm o mesmo endereço.

---

### Falha: Short Circuit Abnormal (Curto-Circuito Anormal)

**Explicação simples.** O loop endereçável tem um curto-circuito.

**Passos de solução:**
1. Se não houver isoladores instalados, ou se o curto estiver entre o painel e o isolador, o loop para de operar. Isso também pode exibir uma falha de canal (channel fail).
2. Encontre e corrija o curto: desconecte o loop totalmente e verifique cada par com um multímetro procurando curto. Se a falha persistir, continue verificando em pontos intermediários ao redor do loop até estreitar a localização do curto.
3. Se o curto não puder ser detectado com multímetro: desconecte apenas um lado do loop e vá desconectando dispositivos em pontos intermediários até a falha de curto-circuito desaparecer, estreitando a localização.

> **Nota:** o painel precisa ser resetado entre cada desconexão, pois esta falha trava (latch).

---

### Falha: Class 'A' Abnormal (Classe 'A' Anormal)

**Explicação simples.** O loop endereçável ou o barramento RUI tem um circuito aberto.

**Causas possíveis:**
- Circuito aberto na fiação do loop.
- Conexão ruim em um ponto endereçável (falhas de loop endereçável).
- Conexão ruim em transponder remoto ou Anunciador LCD (falhas do barramento RUI).
- Loop endereçável ou cartão RUI defeituoso → teste fazendo um "loop out" (curto entre) os terminais A e B no cartão RUI/Mapnet/IDNet para limpar a falha. Se a falha não limpar, o cartão pode estar defeituoso.

---

### Falha: Channel Failure Abnormal (Falha de Canal Anormal)

**Explicação simples.** O cartão de loop não consegue se comunicar com nenhum dispositivo do loop. Atenção: todos os dispositivos desse loop indicarão estado NORMAL (para evitar múltiplas falhas no display).

**Causas possíveis:**
- O loop tem curto-circuito.
- O loop tem falha de terra (earth fault).
- O loop não está conectado ou está conectado incorretamente.

---

### Falha: Channel Initialization Abnormal (Inicialização de Canal Anormal)

**Explicação simples.** Tipicamente ocorre na inicialização (startup) com loops IDNet e normalmente se resolve após alguns minutos se houver muitos isoladores instalados.

**Causas possíveis e solução:**
- Se a falha reaparece continuamente, o comprimento do loop pode ser longo demais ou o loop pode estar ruidoso → contate sua filial Simplex local.
- Possível dispositivo defeituoso causando erros de comunicação → desconecte dispositivos em pontos intermediários até a falha desaparecer, localizando o dispositivo defeituoso.

---

### Falha: Extra Device (Dispositivo Extra) — nível de cartão

**Explicação simples.** Um dispositivo está no loop endereçável em um endereço que não está programado.

**Causas e ação:**
- O painel identificou um dispositivo/cartão em um endereço que não está na programação do painel.
- Consulte a falha **Extra Device** na seção de Dispositivos Endereçáveis (mais adiante).
- Um cartão/dispositivo pode estar endereçado incorretamente gerando uma falha de Dispositivo Extra; nesse caso, o endereço do dispositivo programado exibirá "Points defined but not inserted" (pontos definidos mas não inseridos).

---

## 1.5 Configuração de Dipswitches do IDNet (endereçamento de dispositivos)

> **Atenção:** o método do IDNet é o **inverso** do método dos dispositivos endereçáveis padrão (ver seção 1.7).

1. Dispositivos são fornecidos com TODAS as chaves DIPSWITCH em ON (endereço 0).
2. As DIPSWITCHES são numeradas de 1 a 8:
   - Chave 1 = DEVE ESTAR EM ON (Baud Rate)
   - Chave 2 = 64
   - Chave 3 = 32
   - Chave 4 = 16
   - Chave 5 = 8
   - Chave 6 = 4
   - Chave 7 = 2
   - Chave 8 = 1
3. Coloque a chave em **OFF** para somar o número correspondente ao endereço.

**Exemplos:**
- Endereço 5 = Chaves 6 e 8 em OFF, todas as outras em ON.
- Endereço 23 = Chaves 4, 6, 7 e 8 em OFF, as outras em ON.

---

## 1.6 Falhas de Dispositivos Endereçáveis

> **Lembrete:** confirme que o cartão de loop está em estado NORMAL antes de diagnosticar dispositivos (ver seção 1.4). Use MENU → CARD STATUS → ENTER → role pelos cartões.

---

### Falha: No Answer (Sem Resposta)

**Explicação simples.** O painel tem um dispositivo programado no endereço exibido que não está respondendo.

**Causas possíveis:**
1. Dispositivo não está instalado.
2. Loop endereçável não está funcionando corretamente (loop rompido).
3. Base ou dispositivo defeituoso.

**Passos de solução (lógica de decisão):**
1. Verifique: o LED do dispositivo está piscando?
   - **Se SIM** (LED piscando) → vá direto para o passo 3 (verificar o dispositivo).
   - **Se NÃO** (LED apagado) → vá para o passo 2.
2. Verifique se o loop está energizado no dispositivo (deve haver aproximadamente **30V**). Depois prossiga para verificar o dispositivo (passo 3).
3. Verifique o dispositivo (base/cabeçote/conexões).

---

### Falha: Head Missing (Cabeçote Ausente)

**Explicação simples.** O painel está enxergando a base no endereço exibido, mas não está enxergando o cabeçote (sensor).

**Causas possíveis:**
- Cabeçote não está instalado.
- Cabeçote não está totalmente rosqueado na base.
- Terminais do detector na base estão soltos.
- Cabeçote defeituoso.
- Base defeituosa.

**Passos de solução (lógica de decisão):**
1. Verifique: o LED da base está piscando?
   - **Se SIM** → substitua o cabeçote (Replace Head). Fim.
   - **Se NÃO** → vá para o passo 2.
2. Ajuste os terminais para fazer melhor contato com o cabeçote. Em seguida verifique novamente:
   - Se o problema persistir após o ajuste → substitua a base (Replace Base).
   - Se ainda assim não resolver, o caminho indicado também leva a substituir o cabeçote (Replace Head).

---

### Falha: Wrong Device (Dispositivo Errado)

**Explicação simples.** O painel está recebendo uma resposta do endereço exibido que não corresponde ao dispositivo programado para aquele endereço.

**Causas possíveis:**
- Dispositivo incorreto instalado (ex.: Relé com T-Sense instalado no lugar de um Relé padrão).
- Cabeçote incorreto instalado (ex.: Fotoelétrico no lugar de Térmico).
- Cabeçote do detector não fazendo bom contato com a base.

**Passos de solução (lógica de decisão):**
1. Obtenha o número de peça (part number) gravado no dispositivo (formato 409x-xxxx).
2. Contate o Programador para confirmar se o dispositivo corresponde ao programa:
   - **Se SIM** (o dispositivo deveria corresponder) → substitua o Dispositivo/Sensor. Se não resolver, substitua a Base.
   - **Se NÃO** (não corresponde) → será necessária uma mudança de dispositivo OU de programa.

---

### Falha: Bad Answer (Resposta Ruim)

**Explicação simples.** O painel está recebendo uma resposta do endereço exibido que **às vezes** não corresponde ao dispositivo programado para aquele endereço.

**Causas possíveis:**
- Dois dispositivos programados com o mesmo endereço.
- Esses dispositivos provavelmente são de dois tipos diferentes.
- Dispositivo ou fiação com dano por água.

**Passos de solução (lógica de decisão):**
1. Remova o dispositivo/base do endereço conhecido.
2. Observe o resultado:
   - **Se a falha "Bad Answer" sumiu e não há falha no endereço do dispositivo** → procure outro dispositivo no loop com o mesmo endereço.
   - **Se a falha mudou para "WRONG DEVICE"** → procure outro dispositivo no loop com o mesmo endereço (esse outro dispositivo provavelmente estará em falha "NO ANSWER").
   - **Se a falha mudou para "NO ANSWER"** → substitua o dispositivo ou sensor.

> **Nota:** se o loop MAPNET estiver próximo do comprimento máximo, pode ser viável alterar a tensão do loop MAPNET (não se aplica ao IDNet — ver seção 1.9).

---

### Falha: Extra Device (Dispositivo Extra)

**Explicação simples.** O painel identificou um dispositivo em um endereço que não está na programação do painel.

> **Notas importantes:**
> - Apenas um dispositivo extra por loop é exibido por vez. Corrigir um dispositivo extra pode revelar uma nova falha de dispositivo extra (se houver).
> - Falhas de Dispositivo Extra demoram mais para aparecer e para limpar do que outras falhas.

**Causas possíveis:**
- Dispositivo não adicionado ao programa.
- Dispositivo endereçado incorretamente.
- Dispositivo não programado de forma alguma (endereço 255).

**Passos de solução (lógica de decisão):**
1. Role pelo Histórico de Falhas (Historical Fault Log) procurando a mensagem "MAPNET EXTRA DEVICE".
2. Role para o próximo evento (NEXT). Nele: Channel = Número do Loop; DEVICE = Endereço.
3. Avalie o valor de DEVICE:
   - **Se DEVICE = 255** → o dispositivo não foi endereçado. Vá para o passo 4.
   - **Se DEVICE estiver entre 1 e 255** → verifique se o programa tem um dispositivo naquele endereço. Vá para o passo 4.
4. Verifique e corrija falhas de dispositivo "NO ANSWER", pois isso pode limpar as falhas de dispositivo extra.

---

### Falha: Output Abnormal (Saída Anormal)

**Explicação simples.** Observada quando a saída de um Relé, Sirene (Sounder) ou base Isoladora não está respondendo corretamente.

**Causas possíveis:**
- **Base ISOLADORA:** ocorreu um curto-circuito no loop endereçável e a base isoladora não conseguiu resetar corretamente.
- **Base de SIRENE (Sounder) ou RELÉ:** a alimentação de 24V para a base de sirene não está presente.

**Passos de solução:**
- **Base ISOLADORA** → se a falha de curto-circuito já foi corrigida, pressione "CPU RESET" (Warm Start) para reinicializar a base isoladora.
- **Base de SIRENE ou RELÉ** → verifique a fiação e a placa de distribuição fusível de 24V no painel.

---

### Falha: Alarm Verification Tally Exceeded (Contador de Verificação de Alarme Excedido)

> **Nota:** esta falha pode indicar um detector defeituoso no campo. Verifique falhas anteriores e anote no livro de registro (Log book) a data e hora em que esta falha ocorreu.

**Passos de solução:**
1. Faça login no Nível 4.
2. Selecione P214.
3. Force o ponto em ON (Force Point ON).
4. Resete a CPU (use o botão na CPU — ver seção 1.3) para limpar a falha de Serviço Simplex.

---

## 1.6.1 Operação do LED do Detector (diagnóstico visual no dispositivo)

**LED Apagado (Off):**
- Detector não está se comunicando com o painel.
- Dois detectores no mesmo endereço.
- O cabeçote não está instalado corretamente.

**LED Piscando (Flash):**
- Detector está se comunicando com o painel.
- A velocidade do piscar não fornece nenhuma informação.

**LED Aceso fixo (On):**
- Detector está em ALARME ou FALHA.
- Se nenhum cabeçote estiver instalado, indica falha de EXTRA DEVICE.
- O LED do detector pode ficar travado aceso se múltiplas falhas ocorrerem no mesmo detector. Para resetar o LED, faça um warm boot (Warm Start) do painel.

---

## 1.7 Configuração de Dipswitches dos Dispositivos Endereçáveis (Bases e Dispositivos)

> Este é o método **padrão** dos dispositivos endereçáveis (inverso do IDNet — ver seção 1.5).

- Dispositivos são fornecidos com DIPSWITCH em 255.
- DIPSWITCHES numeradas de 1 a 8 (da esquerda para a direita):
  - Chave 1 = 1
  - Chave 2 = 2
  - Chave 3 = 4
  - Chave 5 = 8
  - Chave 6 = 16
  - Chave 7 = 32
  - Chave 8 = 128
- Coloque a chave em **ON** para somar o número correspondente ao endereço.

**Exemplos:**
- Endereço 10 = Chaves 2 e 5 em ON, todas as outras em OFF.
- Endereço 105 = Chaves 1, 4, 6 e 7 em ON, as outras em OFF.

**Convenção geral da tabela de endereçamento:** UP = 1 (ON), DOWN = 0 (OFF). Detectores vêm pré-ajustados no endereço 255. As DIP Switches 1 a 4 formam o byte menos significativo e as DIP Switches 5 a 8 o mais significativo, permitindo endereços de 0 a 255.

---

## 1.8 Resistores de Fim de Linha (End of Line Resistors)

> Para um guia de bolso completo, contate sua filial Simplex local.

| Código / Cartão | Tipo de dispositivo | Valor(es) de resistor |
|---|---|---|
| 4090-9001 | Supervised IAM / Current Limited | 6.8kΩ / 4.7kΩ e 1.8kΩ |
| 4090-9101 | Monitor ZAM | 3.3kΩ |
| 4090-9118 | Relay IAM com T-Sense / Current Limited | 6.8kΩ / 4.7kΩ e 1.8kΩ |
| 4090-9120AU | Módulo de E/S 6 pontos / Current Limited | 6.8kΩ / 4.7kΩ e 1.8kΩ |
| 2190-9156 | Mapnet Monitor ZAM | 3.3kΩ |
| 2190-9164 | Mapnet Signal ZAM | 10kΩ |
| 4100 EWIS | WIPs | 10kΩ |
| 4100 Cartão Monitor 8pt | (Zone Card) | 3.3kΩ |
| 4100 Cartão de Sinal 6 | — | 10kΩ |
| 4100 Cartão IO 24 pontos | (Resistores plugáveis) | 2.2kΩ Entrada / 20Ω Saída |

---

## 1.9 Calibração da Fonte de Alimentação do Loop Mapnet

> **Não se aplica ao IDNet.** Esta calibração NÃO deve ser tentada normalmente, exceto quando há problemas no local que não são facilmente diagnosticados/corrigidos.

**Considere a calibração se:**
- Há Bad Answers e No Answers numerosos ou intermitentes em um loop que está 100% corretamente endereçado e cabeado/terminado.
- A tensão do loop MAPNET **não** está flutuando entre 36-38 Volts.
  > **Nota:** a tensão do loop MAPNET flutua normalmente, pois transmite dados digitais o tempo todo quando energizado.
- As diretrizes e restrições de comprimento do loop MAPNET não foram respeitadas e não há outra solução disponível (ex.: comprimento excede o máximo recomendado de 1000m).

**Procedimento:**
- Para alterar a tensão de operação da Fonte do cartão MAPNET, localize o potenciômetro **'R2'**.
- Ajuste R2 até que a tensão DC ao longo do loop seja aproximadamente **36.5V ± 100mV** (ou seja, aproximadamente 36-38 Volts).

---

## 1.10 Falhas do Carregador de Bateria 4100-0157A

Falhas possíveis exibidas:
- Charger 2% out of range (Carregador 2% fora da faixa)
- Battery Charger Supply incorrect (Alimentação do carregador de bateria incorreta)

**Procedimento para medir corretamente a tensão de saída:**
1. Para evitar dano ao sistema, desconecte as baterias e desligue o sistema; desconecte os chicotes de energia e de comunicação (comms) da Fonte de Alimentação.
2. Conecte o multímetro aos cabos da bateria (com as baterias desconectadas), ligue o sistema e meça a tensão. Calcule a diferença entre a tensão medida e 27.6V.
   > **Nota:** após 90 segundos, a tensão cai para menos de 24V. Se isso acontecer, desligue e comece de novo.
3. Conecte o multímetro ao tap A ou B no TB2. Meça a tensão. Ajuste o trim-pot (potenciômetro de ajuste) para que a tensão aumente (ou diminua) pela diferença calculada no passo anterior.
4. Meça a tensão nos cabos da bateria. Pode ser necessário desligar e ligar novamente para resetar a fonte. Se a tensão estiver correta, desligue, reconecte os chicotes de energia e comunicação e retorne o sistema ao normal.
5. Se a tensão não estiver correta, repita os passos 1 e 2.

**Sobre localização do Trim-pot / orientação da fonte:** dependendo da instalação (a orientação vertical é comum), pode ser difícil localizar ou enxergar o trim-pot. Nesse caso, recomenda-se desligar o painel, desmontar a fonte do painel e reconectá-la (energizada) sobre uma superfície não condutora, pois será necessário monitorar a tensão nas conexões do Terminal Strip B.

**Descrição da placa do carregador 4100-0157A (localização de componentes):**
- **POWER HARNESS:** chicote de energia no topo.
- **TB2:** bloco de terminais no topo, próximo aos taps. Os taps "A", "B" e "C" e seus retornos (RTN) ficam distribuídos entre o topo (P14 "A" TAP, P15 "B" TAP, P17 "C" TAP) e a base (P1 "A" TAP RTN, P2 "B" TAP RTN, P3 "C" TAP RTN).
- **PROM:** lado direito central (identificada como 740-801).
- **SW1 e SW2:** chaves no lado direito.
- **LED 1 e LED 2:** no canto inferior direito.
- **Conectores P5 a P12:** distribuídos pela placa.

**Descrição da localização do trim-pot na fonte 4100:**
- Na **Orientação Vertical**, a conexão da bateria fica no topo.
- Na **Vista de Topo (Top Plane View)**: o Trimpot fica dentro de um furo (in hole) no lado direito do bracket de montagem; a conexão da bateria fica no canto direito.

---

## 1.11 Falhas de Terra Positivo/Negativo (Earth Ground Faults)

**Explicação simples.** Painéis 4100 detectam falhas de terra positiva ou negativa. Uma falha de terra ocorre quando um circuito elétrico fica em curto com o terra. É **imperativo** localizar e reparar falhas de terra, pois múltiplas falhas de terra podem desabilitar comunicações, fazendo com que partes pequenas ou grandes do sistema de detecção parem de funcionar (ex.: múltiplas falhas de terra em um loop Mapnet podem desabilitar todo o canal de comunicação do loop, deixando-o inoperante).

**Causas possíveis (exemplos):**
- Dano por água — cria caminhos elétricos.
- Terminações tocando contatos metálicos ou estruturas metálicas.
- Isolamento se deteriorando.
- Parafusos de fixação perfurando cabos.
- Cartão danificado no painel.
- Fiação incorreta nos módulos.

> **Nota importante:** uma falha de terra pode alternar de Positiva para Negativa (ou vice-versa). Por isso, ao desconectar circuitos, é altamente recomendado remover **AMBAS** as conexões (positiva e negativa) para um diagnóstico eficiente.

> **Nota:** falhas de terra intermitentes só podem ser diagnosticadas enquanto a falha está ativa.

### Detecção e localização — Painel 4100U (diagnóstico automático)

O 4100U tem o monitoramento de falha de terra mais avançado da linha Simplex. Ele pode autodiagnosticar e localizar a região geral de uma falha de terra. Há duas opções principais no menu (acessadas pela fascia do 4100U): **'Location Search'** e **'IDNet channel Search'**.

**Passos:**
1. Faça login com nível de acesso suficiente:
   - Nível de Acesso: **3**
   - Senha (Passcode): **333** (ou contate sua filial Simplex local).
2. Isso habilita a opção de menu 'Diagnostics'.
3. Escolha 'Location Search' ou 'IDNet channel Search'. O painel começa a buscar automaticamente em diferentes circuitos para localizar a falha.
4. Ao final da busca, você terá uma área finita para focar os reparos. A busca por canal IDNet pode até informar em qual seção do loop (ou seja, entre quais isoladores) a falha está localizada.
5. Se todos os bays foram verificados e a falha parece estar no Bay principal de CPU, ela provavelmente está no cartão de Loop IDNet integrado da fonte OU na placa de distribuição de fusíveis auxiliar. O cartão de loop pode ser testado como qualquer outro. A placa de fusíveis auxiliar deve ser totalmente desconectada da PSU (fonte): se a falha desaparecer, ela está na PSU; senão, desconecte individualmente cada alimentação de 24V da placa de distribuição reconectada, estreitando o circuito com a falha.

> Para detalhes específicos do diagnóstico de falha de terra do 4100U, consulte o Manual de Instalação 4100U (LT0350) fornecido com o painel.

### Detecção e localização — Painéis pré-4100U (4100+, 4100A)

Estes painéis mais antigos detectam falhas de terra positiva/negativa, mas suas fontes **não** têm a opção de diagnosticar automaticamente em qual circuito a falha está. Há métodos manuais para estreitar os circuitos:

**Passos (com a falha de terra ativa no painel):**
1. Desconecte a energia dos diferentes bays (sequencialmente, um de cada vez) até a falha de terra desaparecer do sistema.
   > A falha de terra pode travar (latch) no painel e exigir reset para testar efetivamente o circuito.
2. Após localizar qual bay de cartões contém o problema, desconecte cartões individuais usando a mesma metodologia.
3. Localizado o cartão em questão, teste os circuitos — mas tenha em mente que a falha pode estar no cartão, embora seja mais provável que esteja no campo.
4. Quando a falha de terra estiver em um loop Mapnet ou IDNet, desconecte uma ponta do loop do cartão (ambos os terminais + e -) e rompa o loop em diferentes áreas (ex.: isoladores de linha) até a falha desaparecer.
5. Se todos os bays foram verificados e a falha parece estar no Bay principal de CPU, ela provavelmente está na Placa de Distribuição de Fusíveis Auxiliar. Desconecte totalmente a placa de fusíveis da PSU: se a falha desaparecer, está na PSU; senão, desconecte individualmente cada alimentação de 24V da placa reconectada.


---

# SEÇÃO 2 — CÓDIGOS DE CRASH DA FAMÍLIA 4100

Aplica-se a: 4100 Classic, 4100+, 4020, 4100U.

## 2.1 Classes de crash (entenda primeiro)

Os códigos de crash são classificados por uma designação de classe:

- **CLASS E Crash (Hardware):** indica um possível defeito no hardware do sistema.
- **CLASS S Crash (Software executivo):** indica um possível erro/bug no software executivo. Verifique a revisão do sistema (via MENU → Software Revision Level) e contate sua filial Simplex local.
- **CLASS P Crash (Programação do job):** indica um possível problema na programação do software do job. Hardware e software de job incompatíveis podem ser corrigidos reprogramando as informações do job. Contate sua filial Simplex local.

## 2.2 Tabela de códigos de crash

| Código | Display LCD | Classe | Erro | Informação / Ação |
|---|---|---|---|---|
| 00 | CRASH_UNEXPECTED / `<CRASH UNEXPECTED>` | S | Crash inesperado por possível bug no software executivo (System PROM) | Ligue imediatamente para o Suporte Técnico da matriz. |
| 14 | CRASH_INTERNAL_RAM_BAD / `<INTERNAL RAM ERROR>` | S | Erro de RAM interna | — |
| 15 | CRASH_EXTERNAL_RAM_BAD / `<EXTERNAL RAM ERROR>` | S | RAM externa defeituosa | — |
| 30 | CRASH_BAD_RAM / `<Bad or missing RAM chip>` | E | Chip de RAM do sistema defeituoso | Chip de RAM defeituoso, mal inserido ou ausente; memória insuficiente para o job ou chip de RAM ruim; chip CFIG em branco. |
| 31 | CRASH_BAD_CODE / `<CODE Checksum Error>` | E | Erro de checksum de código; System PROM defeituosa, não programada ou inserida incorretamente | Ocorre com Rev 4.02 e anteriores quando usadas com microprocessador 8096BH (indicador 'E'). Verifique o 9º caractere do número FPO em U9. Se for 'E', é necessário executivo de sistema Rev 4.03 ou superior. O formato CFIG (Panel Programmer) pode ser incompatível com o EXEC do painel instalado. |
| 32 | CRASH_BAD_CONST / `<K_SEG checksum error>` | E | Erro de checksum de código (K_SEG) | System PROM U34 defeituosa, não programada, mal inserida ou ausente. O erro 32 pode ser causado por chip flash defeituoso, não programado ou mal inserido. |
| 33 | CRASH_BAD_CFIG / `<CFIG checksum error>` | E | Erro de checksum CFIG; CFIG PROM defeituosa, não programada ou mal inserida | Pode ser causado por CFIG RAM selecionada pela dipswitch SW1-2, mas com CFIG RAM não instalada no soquete U45. Houve grande número de falhas de chips flash AMD AM28F010 e AM28F020. |
| 34 | CRASH_CFIG_FMT / `<Invalid CFIG Format>` | E | Formato CFIG inválido | O número de formato CFIG é incompatível com a versão do software executivo (System PROM). Verifique o número de Rev do disco do programador contra o número de Rev no rótulo da System PROM. Atualize a System PROM para a Rev do software atual gravando uma nova PROM executiva do sistema. |
| 39 | CRASH_SMPL_CODE_OPCODE / `<Invalid CODE Operation>` | P | Código de operação inválido existe no programa | Código de operação inválido no programa. |
| 62 | CRASH_RAM_OVERLAP / `<Overlapping CFIG RAM>` | E | Sobreposição de CFIG RAM | A RAM do sistema e a CFIG RAM têm endereços sobrepostos. Pode ser causado por versão incorreta do arquivo GEN_INFO.DAT no CC/Build e/ou no Runtime Disk. |
| 66 | CRASH_MSGLIB_FMT / `<MSGLIB Format Error>` | E | Erro de formato MSGLIB | Número de formato da biblioteca de mensagens incorreto para a revisão do software; MSGLIB errada no disco do programador. Use a mesma versão do programador para gravar os chips EXEC superior e inferior. |
| 67 | CRASH_SMALL_RAM / `<System RAM chip too small>` | E | Chip de RAM do sistema muito pequeno | A quantidade de RAM instalada no Controlador Mestre é pequena demais para a configuração do job. Substitua a RAM de 256K por chip de RAM de 1MEG no 4100 e 4020, ou adicione um banco de RAM adicional no 4100+ e UT. Pode ser que o painel não tenha chip de RAM no U35: remova o chip que foi colocado no soquete CFIG RAM U45 e instale no soquete de RAM do sistema U35. |
| 73 | CRASH_INVALID_MSGLIB_NUMBER / `<INVALID Msglib Number>` | S | Número de Biblioteca de Mensagens inválido | Número de Biblioteca de Mensagens inválido. |

---

# SEÇÃO 3 — FALHAS NA REDE E NO IMS / TrueSite Workstation

## 3.1 Procedimento geral no IMS

**Sequência ao soar a cigarra de falha no IMS:**
1. A cigarra (fault buzzer) soa no IMS.
2. Reconheça (acknowledge) a condição de falha clicando no botão amarelo no canto superior direito, destaque a falha que está piscando e confirme.
3. Verifique a descrição da falha e compare com a folha de lista de falhas. Siga as instruções específicas daquela falha.

**Central Gráfica de Controle (IMS & TrueSite Workstation):** todas as falhas atuais de uma rede podem ser vistas na Central Gráfica de Controle (configuração específica do local). É possível acessar um painel diretamente pela Central Gráfica usando a função "Set Host" em um sistema IMS, ou abrindo uma sessão em Modo Terminal na aba "Network" de uma TrueSite Workstation. Para detalhes, consulte o Manual do Usuário fornecido com cada sistema.

## 3.2 Formato da falha exibida

As falhas aparecem neste formato:
- **Número da entrada** (ex.: 23) — número da entrada da falha.
- **Data e hora** (ex.: 10:59:47 Wed 13-Dec-06) — data e hora mais recentes em que a falha ocorreu.
- **Descrição da falha** (ex.: Common Trouble Point).
- **Tipo de entrada** (ex.: Trouble).

Quando uma falha ativa é exibida no LCD, mais informações sobre a localização de uma falha de rede podem ser obtidas pressionando a tecla **'MORE INFO'** (no 4100U) ou **'FUNCTION'** (nos painéis 4100 mais antigos). No IMS, dê um duplo-clique na falha atual para abrir uma janela de informações detalhadas.

**Exemplo de leitura de uma falha de dispositivo em rede:** `2:M1-45  Office Detector 1  Head Missing`
- `2:` → Nó em falha (Nó 2).
- `M1-45` → Cartão de loop e endereço do dispositivo.
- `Office Detector 1` → Nome do dispositivo.
- `Head Missing` → Descrição da falha.

**Identificar qual nó corresponde a qual painel:** no IMS (terminal gráfico), acesse "Set Host" e clique em "About Node". Pelo display do 4100, clique em "MENU" e depois em "Display Network Node Identification".

## 3.3 Tipos de falha e causa mais provável

| Falha | Causa mais provável | Seção de referência |
|---|---|---|
| Head missing | Cabeçote do detector foi removido da base | 1.6 (Head Missing) |
| Output Abnormal | Saída do detector (ex.: sirene) com defeito | 1.6 (Output Abnormal) |
| Bad Answer (Static) | Cabeçote ou base do detector com defeito | 1.6 (Bad Answer) |
| Bad Answer (Intermittent) | Dois detectores respondendo no mesmo endereço | 1.6 (Bad Answer) |
| No Answer | Detector/dispositivo ausente (cabeçote/base completos) | 1.6 (No Answer) |
| Open Circuit | Circuito monitorado rompido | 1.4 (Class A) |
| Short Circuit | Circuito monitorado ou alimentação de 24V em curto | 1.4 (Short Circuit) |
| Node Missing | Comunicação perdida com o painel especificado | 3.4 |
| Degraded Style 7 | O loop de rede especificado está rompido | 3.4 |
| Earth Fault | O painel especificado tem falha de terra | 1.11 |
| Battery Fault | O painel especificado tem falha de bateria | 1.10 |
| Card Fault | O painel especificado tem um cartão em falha | 1.4 |
| Pseudo status fault | O painel especificado precisa ser verificado | 3.4 |
| Miscellaneous fault | O painel tem uma falha não incluída acima | — |

## 3.4 Falhas comuns de rede

### Common Trouble Point for Node (Ponto Comum de Falha do Nó)
Uma falha ocorreu dentro de um dispositivo ou cartão (etc.) que está sinalizando o Ponto Comum de Falha daquele Nó pela rede. Apenas acessando o Nó que contém a falha (ou a Central Gráfica de Controle) é que mais informações específicas estarão disponíveis.

### Card Trouble for Node (Falha de Cartão do Nó)
Indica que há uma ou mais falhas associadas a um cartão no Nó de Rede listado. Para diagnóstico adicional, é preciso acessar o Nó que contém a falha.

### Network Operating in Degraded Style 7 (Rede operando em Style 7 degradado)
Redes Style 7 são de topologia em anel contínuo. Se o anel da rede tem uma quebra ou um par de cabos incorretamente terminado, os cartões de rede enxergam isso como um circuito aberto e exibem a falha 'Degraded Style-7'.

### Network Initialization Incomplete (Inicialização de Rede Incompleta)
Durante a sequência de boot da rede, há painéis que não inicializaram com sucesso. Pode exigir um reboot completo da rede (global warm restart), que em alguns sistemas em rede pode ser feito remotamente acessando o MFIP.

### Node Missing/Failed (Nó Ausente/Falhou)
O nó a partir do qual você está vendo a falha não consegue se comunicar com sucesso com o(s) nó(s) listado(s).

### System Pseudo Status for Node (Status Pseudo de Sistema do Nó)
Similar ao Common Trouble Point for Node — há um Pseudo de Sistema (ponto virtual) em estado anormal no Nó listado. Acessar o Nó que contém a falha pode fornecer informações mais específicas.

### Version Mismatch (Incompatibilidade de Versão)
As configurações não correspondem entre pelo menos dois nós. Contate seu Provedor de Serviço Simplex local para assistência.

---

# SEÇÃO 4 — PAINÉIS F3200

## 4.1 Recall de falhas do sistema (Recall System Faults)

**Função.** Permite visualizar no LCD as causas atuais de uma indicação "SYSTEM FAULT". Também exibe o status de qualquer RZDU (Remote Zone Display Unit) com condição off-normal, incluindo as que não causam System Fault.

**Sequência de operação (sistemas em rede e não-em-rede):**
1. A partir do display base, pressione **RECALL** seguido de **SYSTEM** (ou **SYSTEM** seguido de **RECALL**).
2. Se não há falhas de sistema, uma breve mensagem informa isso e o LCD volta ao display base.
3. Se existe falha de sistema, o LCD a exibe.
4. Para ver a próxima falha, pressione **NEXT**. Para ver a falha anterior, pressione **PREV**.

## 4.2 Lista de falhas do sistema F3200 (não-em-rede)

1. **Mains fail (Falha de rede elétrica).** Indica que a rede elétrica está atualmente em falha. Quando a rede falha continuamente por 8 horas, uma falha de sistema pode ser gerada (dependendo da programação).
2. **EEPROM database checksum error.** O painel fica inoperante se esta falha está presente.
3. **EEPROM database version error.** O checksum do banco EEPROM está correto, mas o banco é de versão antiga com formato inutilizável. Todo processamento de circuito é desabilitado e o painel fica inoperante.
4. **Module configuration mismatch (Incompatibilidade de configuração de módulos).** Ocorre quando o número de Módulos de Zona ou Relé instalados não corresponde ao número programado. A linha inferior informa se o processamento está habilitado ou desabilitado. Ao detectar a incompatibilidade, o processamento é desabilitado e o painel fica inoperante. Um técnico pode atribuir temporariamente uma nova configuração para reabilitar o processamento usando apenas os módulos presentes. Esta falha permanece até que o número correto de módulos seja instalado e verificado.
5. **Keypad disconnected (Teclado desconectado).** O processamento de entradas de circuito e alarmes continua.
6. **LED display board fault.** Há falha em uma placa de display LED de zona ou relé. Pode ocorrer se o número errado de placas de display estiver instalado.
7. **LCD display fault.** Falha no LCD de 80 caracteres. Pode ocorrer na inicialização ou durante um teste de LCD.
8. **EPROM CRC error.** Falha no cálculo de checksum da memória EPROM. Pode ocorrer durante System e Auto Test.
9. **RAM write read fault.** Falha em um teste de escrita/leitura da RAM principal. Pode ocorrer durante System e Auto Test.
10. **Charger high/low/normal.** Indica que a tensão do carregador de bateria está alta ou baixa. No recall, o display mostra o estado atual do carregador (high, low ou normal), útil para ajustar o potenciômetro do carregador. Uma condição de carregador baixo não gera falha de sistema até 30 minutos após qualquer teste de bateria, mas ainda aparece no recall durante esse tempo. Durante um teste de bateria, uma condição de carregador baixo (valor bruto) aparece no recall, pois o carregador está inibido — mas isso não é falha de sistema.
11. **Fuse blown (Fusível queimado).** Verifique se há fusível queimado e substitua por um de **mesma** amperagem.
12. **Clock chip RAM fault.** A RAM do chip de relógio armazena todos os dados de isolamento (status de isolamento de zona e relé, etc.) mais atribuições temporárias de "board present". Esses dados são lidos da RAM do chip de relógio na inicialização; esta falha significa que a RAM não salvou os dados corretamente. Tente isolar e desisolar algo (ex.: sinos/bells) para fazer o controlador tentar reescrever/reler essa RAM.
13. **EEPROM write fail.** Ocorre se houver falha ao escrever na memória do banco EEPROM durante o modo de programação.
14. **All MAF zones isolated (Todas as zonas MAF isoladas).** Ocorre se todas as zonas (mapeadas para MAF) estiverem isoladas. Pode ser inibido por opção de programação, mas isso contraria a norma AS1603.4.
15. **Supply failed (Alimentação falhou).** Ambas as redes falharam e a tensão da bateria caiu para 21V ou abaixo. O relé de standby é desenergizado e todo o processamento de entradas de circuito para.
16. **Output logic exec error nn (Erro de execução de lógica de saída).** Erro na execução da lógica de saída. O software produz estas mensagens a partir de verificações internas durante a operação das saídas do FIP. É altamente improvável que ocorram; se ocorrerem, o operador deve informar a empresa de serviço. Significados do número nn:
    - "No equations have been found but some were expected" — conflito na informação armazenada no banco EEPROM.
    - Invalid Opcode — token inválido encontrado em uma equação.
    - Range error — valor fora de faixa, como número de timer maior que 64 ou número de relé ancilar maior que 3.
    - Stack error — a pilha de execução na RAM transbordou (overflow) ou esvaziou demais (underflow).
    - Link error — valor inválido em um campo de link de uma equação.
    - Invalid MAF output — conflito de informação no banco EEPROM; equação encontrada controlando relé ancilar ou MAF que não era esperado.
    - NA (New Alarm) function RAM limit exceeded — muitas funções NA usadas na programação de funções de Lógica de Saída.
    - Netvar SID not present — variável de rede na lógica de saída especifica um SID que não está na lista de SID deste painel. Todo SID cujos Netvars serão acessados deve ser inserido na lista de SID do painel.
    - Zone command range error — equação para isolar/desisolar ou resetar zona(s) tinha número de zona inválido.
17. **System/Auto Test circuit test fail.** Um teste de circuito falhou durante System ou Auto Test, ou uma falha/alarme inesperado ocorreu durante o teste. O relé de falha da Brigada é acionado. A falha é limpa por um System/Auto Test bem-sucedido. Isolar o circuito defeituoso e executar um system test deve permitir que o teste passe e limpe a falha.
18. **Shift register bus fault.** Falha no barramento que conecta o Controlador ao MAF/PSU, módulos de zona e módulos de relé. Pode ser causada por quebra ou curto no cabo flat ribbon (ex.: placa desconectada), por ruído temporário ou por falha de placa. **Nota:** quando ocorre, todo o processamento de entradas para até a falha limpar; se limpar, o processamento retoma automaticamente.
19. **RZDU x.** Exibe o status atual de qualquer RZDU com condição off-normal.
20. **Net msg discard.** Ocorre apenas em sistemas de rede. O sistema local descartou uma mensagem repetidamente enviada a outro dispositivo na rede que não a reconheceu. Para permitir outras mensagens, a mensagem não reconhecida foi descartada. Deve ocorrer só em casos de carga de rede extrema, se o sistema endereçado não existe/está offline, ou se cabos de rede estão rompidos.
21. **Net port hw fault.** Falha de hardware na porta serial que faz interface com a rede. Chame a empresa de serviço.
22. **Clock crystal Timebase check fail.** Ocorre apenas na inicialização; indica que a frequência do chip de relógio do Controlador está fora de tolerância em relação ao microprocessador. O Controlador reinicia e tenta o teste novamente.
23. **Clock register write read fail.** Falha em teste dos registradores de relógio data/hora do Controlador. O Controlador reinicia e tenta o teste novamente.
24. **Clock chip RAM write read fail.** Falha em teste da RAM de relógio do Controlador. O Controlador reinicia e tenta o teste novamente.
25. **Shift reg clocking fault.** Mesma falha do "Shift register bus fault", mas ocorre apenas na inicialização ou ao sair do modo de programação, quando o painel tenta determinar quais módulos estão presentes.
26. **Battery is low (Bateria baixa).** Tensão da bateria está baixa. Quando falhas de PSU estão inibidas por 24h, esta mensagem ainda aparece no recall se a tensão estiver baixa, mesmo sem criar falha de sistema.
27. **Battery connection fail.** A bateria não está conectada — mas pode aparecer com a bateria conectada se ela estiver defeituosa ou com carga baixa. Com falhas de PSU inibidas por 24h, a mensagem ainda aparece no recall se a bateria parecer não conectada.
28. **Battery capacity low (Capacidade da bateria baixa).** Um teste automático de bateria falhou, ou seja, a bateria tem carga baixa.

## 4.3 Glossário de abreviações (F3200 e geral)

| Sigla | Significado |
|---|---|
| A/C | Ar Condicionado |
| ac | Corrente Alternada |
| AEOL | Fim de Linha Ativo (Active End of Line) |
| AHr | Ampère-hora |
| ANC 1 | Relé Ancilar 1 |
| ASE | Equipamento de Sinalização de Alarme |
| AZC | Circuito de Zona de Alarme, ou Zona de Detecção |
| AZF | Facilidade de Zona de Alarme, ou Grupo (terminologia AS1603.4) |
| AVF | Facilidade de Verificação de Alarme, ou Check Alarm |
| Bd | Placa (Board) |
| CIE | Equipamento de Controle e Indicação |
| Cct | Circuito |
| COM | Contato comum de relé |
| dc | Corrente contínua |
| EB | Sino externo (External Bell) |
| EEPROM / E2 | Memória somente leitura programável e apagável eletricamente |
| ELV | Tensão Extra Baixa |
| EOL | Fim de Linha (dispositivo) |
| EOLR | Resistor de Fim de Linha |
| FF | Firefighter Facility (parte do Display/Teclado) |
| FIP | Painel Indicador de Incêndio (Fire Indicator Panel) |
| FRC | Cabo Flat Ribbon |
| I/O | Entrada/Saída |
| LCD | Display de Cristal Líquido |
| LED | Diodo Emissor de Luz |
| MAF | Facilidade de Alarme Mestre (Master Alarm Facility) |
| MCP | Ponto de Chamada Manual (Break Glass Switch) |
| MOV | Varistor de Óxido Metálico (proteção contra surto) |
| NC | Normalmente Fechado |
| NDU | Unidade de Display de Rede |
| NO | Normalmente Aberto |
| PCB | Placa de Circuito Impresso |
| PSU | Unidade de Fonte de Alimentação |
| PTC | Coeficiente de Temperatura Positivo (Termistor) |
| R1 / RL1 | Relé de Módulo Número 1 (abreviação de programa / texto) |
| RAD | Duto de Ar de Retorno (planta de A/C) |
| RDU | Unidade de Display Remoto |
| RMS | Valor Eficaz (Root Mean Square) |
| RTC | Relógio de Tempo Real |
| SAD | Duto de Ar de Suprimento (planta de A/C) |
| SID | Número de Identificação de Sistema (dispositivo de rede) |
| T1 | Timer Programável Número 1 (abreviação de programa) |
| V1 | Variável Programável Número 1 |
| VA | Volt-Ampère |
| VB | Tensão com backup de bateria |
| VNB | Tensão sem backup de bateria |
| +VBF | Tensão fusível com backup de bateria |
| +VNBF | Tensão fusível sem backup de bateria |
| WS | Sistema de Aviso (Warning System) |
| Z1 / Zn1 | Zona Número 1 (abreviação de programa / texto) |
| 8RM | Módulo de 8 Relés |
| 8ZM | Módulo de 8 Zonas |


---

# SEÇÃO 5 — PAINÉIS QE90 (Sistema de Evacuação / EVAC)

## 5.1 Modo de Isolamento de Serviço do QE90 — Exibição de falhas

**Para acessar a memória de falhas e o recurso de erros de comunicação de um painel QE90:**
1. Coloque o painel em 'Isolate' (mova a chave key-switch para a posição Isolate).
2. Pressione e segure a tecla **BGM/PAGING** por 2 segundos até que o LED PROGRAM (apenas ele) acenda.
3. Pressione a tecla BGM/PAGING sucessivamente até que **LAMP TEST** esteja piscando.
   - A memória de falhas será exibida.
   - Os LEDs ALERT exibirão o equivalente binário do CONTADOR DE ERROS DE COMUNICAÇÃO (COMMS ERROR COUNT): Zone 3 = 1, Zone 4 = 2, Zone 5 = 4, etc.
4. Quando o botão LAMP TEST estiver piscando, consulte as descrições de falhas a seguir.

## 5.2 Display de falhas do sistema — ECP versões 2.xx / 4.xx / 6.xx

> Para identificar as falhas, **pressione e segure a tecla BGM/Paging em MANUAL**.

**Convenção dos LEDs:**
- LED de tempo integral (Full Time): pisca para falha não reconhecida (unacked), fica fixo para falha travada (latched) ou reconhecida (acknowledged).
- LED que só exibe a falha descrita quando BGM/PAGING é segurado: depois pisca para falha atual ou travada.

**Mapeamento dos indicadores (lado EVAC do ECP):**
- Spkr Line Fault, Strobe Line Fault, Amp Fault, EMUX ou STRM Failure (zonas afetadas) — coluna ALERT/EVAC/PA.
- BGA ou FIP Line Fault, BGA ou FIP Module Failure (zonas afetadas).
- Spare Speech Cable Fault.
- Indicadores por zona: Zone 2, Zone 1, All, Group.
- EVAC SYSTEM FAULT (qualquer falha relativa a mais de uma zona).
- Comms Cable Fault, Spare Comms Cable Fault, PA Speech Cable Fault, BGA Module Failure, FIP Module Failure.
- Paging Console 1,2 Failure; SECP 1,2 Failure.

**Mapeamento dos indicadores (lado WIP do ECP):**
- WIP Line Fault, WIPS Module Failure (zonas afetadas).
- WIP SECP 1 Failure, WIP SECP 2 Failure.
- Indicadores: CALL WIP, ZONE MANNED, ZONE CLEARED, FAULT.
- WIP SYSTEM FAULT.
- WIP Speech Cable Fault, Charger Fault, Battery Low, WIP MECP Failure.
- Any Fault/Alarm (não travado, em versões ECP9702 e V4.xx).
- WIPS Module Failure ou WIP Speech cable fault.

---

## 5.3 Falha de Linha de Áudio (Audio Line Fault)

### Falha: Speaker Line Fault / Amp Fault (Falha de linha de alto-falante / amplificador)

**Passos de solução:**
1. Verifique o resistor EOL (fim de linha) — deve ser **56k**.
2. Se estiver OK, troque as linhas de alto-falante para uma Zona diferente (no amplificador).
3. Teste para ver se a falha "seguiu" a troca:
   - **Se SIM** (a falha seguiu) → a falha provavelmente está no campo (fiação, dispositivos).
   - **Se NÃO** (a falha não seguiu) → a falha provavelmente está nos transformadores/amplificadores.

> **Nota (técnica de diagnóstico):** uma boa forma de testar onde uma falha está localizada dentro do painel é trocar componentes idênticos e testar se a falha segue o dispositivo. Isso permite eliminar se a falha está em um dispositivo/cartão dentro do painel ou no campo (fiação/dispositivos).

### Configurações de LED dos amplificadores

**EAMP9001 LEDs:**
- D5 (Vermelho, Topo): Energia disponível para amplificadores 1 e 2 quando aceso.
- D6 (Vermelho, Base): Energia disponível para amplificadores 3 e 4 quando aceso.

**HAMP9308 LEDs:**
- LD1 (Verde, Topo): Energia disponível para amplificador 1.
- LD2 (Vermelho, Topo): Amplificador 1 desligado por sobrecarga.
- LD3 (Vermelho, Base): Amplificador 2 desligado por sobrecarga.
- LD4 (Verde, Base): Energia disponível para amplificador 2.

**AMP200 LEDs:**
- LD1 (Verde, Topo): Energia disponível.
- LD2 (Vermelho, Topo): Amplificador desligado por sobrecarga.

> Os LEDs vermelhos do HAMP9308 e AMP200 indicam que a carga de alto-falante é maior que a capacidade do amplificador, ou que a saída está em curto, e o amplificador desligou brevemente para evitar dano. Ambos os LEDs do HAMP9308 operam em uníssono no modo 1×100W; os LEDs de ambos os módulos amplificadores operam em uníssono no AMP200.

### Ajustes de tap dos alto-falantes (Speaker Tapping Adjustments)

Ambos os tipos de amplificador têm controles para ajustar a potência de saída.

> **Nota:** em termos de eficiência e capacidade de bateria, é preferível reduzir o volume ajustando os taps dos alto-falantes para um valor menor e deixando os controles totalmente abertos (totalmente no sentido horário), em vez de usar os controles de volume.

**EAMP9002 Controles:**
- VR1 (Topo): Amps afetados 4×10W = 1; modo 2×25W = 1 e 2.
- VR2 (Segundo Topo): Amp afetado = 2.
- VR3 (Segundo Base): Amps = 3; modo 2×25W = 3 e 4.
- VR4 (Base): Amp afetado = 4.

**HAMP9308 Controles:**
- VR1 (Topo): modo 2×50W = 1; modo 1×100W = 1.
- VR2 (Base): modo 2×50W = 2.

**AMP200 Controle:**
- VR1 (Topo do Master): Amp afetado = 1.

---

## 5.4 Falha de Linha de Strobe (Strobe Line Fault)

**Passos iniciais (iguais ao áudio):**
1. Verifique o resistor EOL (56k).
2. Se OK, troque as linhas para uma Zona diferente (no amplificador) e teste se a falha seguiu.
   - Se SIM → falha no campo (fiação, dispositivos).
   - Se NÃO → falha nos transformadores/amplificadores.

**LEDs do cartão de strobe (diagnóstico):**
- LD1 (Verde, Normal ON): Microprocessador rodando quando aceso fixo.
- LD2 (Amarelo, Normal Flicking): Respondendo a comunicações quando piscando.
- LD3 (Verde, Normal ON): Alimentação +5V OK.
- LD4 (Vermelho, Normal OFF): **Piscando = falha de linha atual; Aceso fixo = falha de linha travada.**

> Se uma falha estava presente mas todas as saídas de strobe estão normais agora, o LED Vermelho fica fixo. Esse recurso ajuda a determinar se uma indicação de "Audio fault" no ECP foi falha de amplificador/linha de alto-falante ou falha de linha de strobe. Para apagar o LED vermelho fixo: comute o ECP para Isolate e de volta para Manual ou Auto (todas as versões de software), OU pressione e segure SILENCE por 2 segundos (ECP versão 2.0 e posterior).

### Considerações de saída de strobe (Strobe Output Deliberations)

- Os strobes devem ser cabeados aos terminais **A e B** conforme o diagrama do Módulo Driver de Relé de Strobe (descrito abaixo).
- O resistor de **2k7** conectado a cada par de terminais no envio do sistema deve ser **removido** e conectado ao **final da linha de strobe**.
- A carga máxima em cada saída é de **2 Amps**. Cargas maiores podem queimar fusíveis.

**Descrição do diagrama "Strobe Relay Driver Module and Strobe Light Connection" (módulo STRM9502):**
- À esquerda há strobes (Red/Amber) em pares. Os quatro strobes superiores **devem ter diodos internos**; os dois strobes inferiores **não têm diodos internos** (mostram diodos externos no desenho).
- À direita estão os terminais do módulo STRM9502, numerados em grupos: 1A/1C/1B, 2A/2C/2B, 3A/3C/3B, 4A/4C/4B, depois +24V/+24V/0V/0V, depois 5A/5C/5B, 6A/6C/6B, 7A/7C/7B, 8A/8C/8B.
- BUS1 (+/-) e BUS2 (+/-) ficam no canto superior direito.
- Um resistor 2k7 aparece no fim da linha (canto inferior esquerdo). A fiação deve ser repetida para cada zona.

### Bitolamento de cabo (Cable Gauging)

- **Não** use bitola apreciavelmente mais pesada que a tabela — pode haver problemas com correntes de inrush altas (necessárias para carregar os grandes capacitores eletrolíticos de alguns strobes) que podem soldar os contatos do relé.
- Recomenda-se **não** usar cabos mais curtos que 100m; se usar, adicione resistor(es) para criar resistência total suficiente para dar cerca de 10% de queda de tensão na corrente de carga pretendida.
- Recomenda-se que cabos **não** sejam mais longos que 1000m.

> **Nota:** o parágrafo acima não se aplica se todos os strobes conectados a um par de cabos forem strobes Multi-Candela — pois eles não sofrem do problema de corrente de inrush.

**Tabela 1: Bitolas de cabo (mm²) por comprimento e carga:**

| Comprimento | 100mA | 250mA | 500mA | 1A | 2A |
|---|---|---|---|---|---|
| 100m | 0.75 | 0.75 | 1.5 | 2.5 | 6 |
| 200m | 0.75 | 1.5 | 2.5 | 4 | 10 |
| 300m | 1 | 2.5 | 4 | 6 | 16 |
| 500m | 1.5 | 4 | 6 | 10 | 25 |
| 700m | 2.5 | 4 | 6 | 16 | 25 |
| 1000m | 2.5 | 6 | 10 | 25 | 40 |

### Links e DIP Switches (módulo STBM9008)

Cada módulo STBM9008 contém uma DIP switch que deve ser ajustada ao endereço correto para definir a função do módulo:
- **Switches SW5-8** definem a função do módulo (ver Tabela 4).
- **Switches SW1-4** determinam o endereço (0 a 15) do módulo e, portanto, os números de linha de saída (ver Tabela 3).
- O mapeamento das zonas de evacuação para os números de linha de saída de strobe é controlado pelo software no módulo ECP.

**Tabela 2: Configurações de Link por saída:**

| Saída de Strobe ou Par GP | Links instalados se saída de strobe | Links se par de saída GP |
|---|---|---|
| 1 | 1,9,17=2-3 | 1 removido, 9 removido, 17=1-2 |
| 2 | 2,10,18=2-3 | 2 removido, 10 removido, 18=1-2 |
| 3 | 3,11,19=2-3 | 3 removido, 11 removido, 19=1-2 |
| 4 | 4,12,20=2-3 | 4 removido, 12 removido, 20=1-2 |
| 5 | 5,13,21=2-3 | 5 removido, 13 removido, 21=1-2 |
| 6 | 6,14,22=2-3 | 6 removido, 14 removido, 22=1-2 |
| 7 | 7,15,23=2-3 | 7 removido, 15 removido, 23=1-2 |
| 8 | 8,16,24=2-3 | 8 removido, 16 removido, 24=1-2 |

**Tabela 3: DIP Switches 1-4 — Selecionar endereço do cartão:**

| Endereço | SW4 | SW3 | SW2 | SW1 |
|---|---|---|---|---|
| 0 | OFF | OFF | OFF | OFF |
| 1 | OFF | OFF | OFF | ON |
| 2 | OFF | OFF | ON | OFF |
| 3 | OFF | OFF | ON | ON |
| 4 | OFF | ON | OFF | OFF |
| 5 | OFF | ON | OFF | ON |
| 6 | OFF | ON | ON | OFF |
| 7 | OFF | ON | ON | ON |
| 8 | ON | OFF | OFF | OFF |
| 9 | ON | OFF | OFF | ON |
| 10 | ON | OFF | ON | OFF |
| 11 | ON | OFF | ON | ON |
| 12 | ON | ON | OFF | OFF |
| 13 | ON | ON | OFF | ON |
| 14 | ON | ON | ON | OFF |
| 15 | ON | ON | ON | ON |

**Tabela 4: DIP Switches 5-8 — Selecionar MODO das saídas energizadas:**

| SW5 | SW6 | SW7 | SW8 | Padrão de saída | Uso | Versão mín. STRM |
|---|---|---|---|---|---|---|
| OFF | ON | ON | OFF | Dupla polaridade, tensão fixa para sinais de evacuação e alerta | Strobes auto-piscantes padrão | 1.00 |
| OFF | ON | ON | ON | Dupla polaridade, padrão ISO 8201 T3 para sinal de evacuação, tensão fixa para alerta | Strobes Multi-Candela para evacuação, strobes auto-piscantes padrão para alerta | 1.70 |
| ON | ON | ON | ON | Dupla polaridade, flash contínuo (não T3) para evacuação e alerta. 450mS ligado, 450ms desligado | Luzes incandescentes ou LED para evacuação e alerta | 1.49 |
| Outras combinações | | | | Não usar | | |

> **Notas:** contatos de relé de Propósito Geral (GP) sem tensão não são afetados por essas DIP switches. Saídas do Módulo de Strobe (Não-GP) usam o terminal C como REFERÊNCIA. Terminais 'A' são +ve (sinal positivo ativo) para ALERTA. Terminais 'B' são +ve (sinal positivo ativo) para EVACUAÇÃO.

### Instalação da placa STBM9008

1. **PASSO 1:** Instale a placa STBM9008 no housing de trilho DIN e instale a unidade no trilho DIN.
2. **PASSO 2:** Isole a energia do SISTEMA desligando TODOS os disjuntores DC na unidade de fonte de alimentação.
3. **PASSO 3:** Instale todas as conexões de cabo ao módulo STBM9008 e garanta que a DIP switch esteja nas configurações corretas.
4. **PASSO 4:** Ligue os disjuntores DC e verifique se o sistema funciona corretamente.

---

## 5.5 Falha de BGA ou FIP

**Requisitos de fim de linha:**
- Um diodo Zener de 10V tipo **BZT03-C10** (apenas para tipo de entrada normalmente aberta) é necessário como Fim de Linha de Entrada. O diodo Zener mantém o Monitoramento de Linha.
- O diodo deve ser conectado com o **cátodo** (a ponta marcada com uma faixa/band) na entrada **positiva**.
- Entradas programadas como Propósito Geral (GP) **não** precisam do diodo Zener de fim de linha.
- Cabos devem ter bitola de pelo menos **0.75mm²** e não devem ser mais longos que **1000m**.

**Tabela 5: Configurações de DIP Switch (FIB8910):**

| Cartão | SW1 | SW2 | SW3 | SW4 | SW5 | SW6 | SW7 | SW8 | Zonas (1 WIP/Zona) | Zonas (3 WIPS/Zona) |
|---|---|---|---|---|---|---|---|---|---|---|
| CARD #1 | OFF | OFF | OFF | OFF | OFF | OFF | ON | ON | 1-30 | 1-10 |
| CARD #2 | ON | OFF | OFF | OFF | OFF | OFF | ON | ON | 31-60 | 11-20 |
| CARD #3 | OFF | ON | OFF | OFF | OFF | OFF | ON | ON | 61-90 | 21-30 |
| CARD #4 | ON | ON | OFF | OFF | OFF | OFF | ON | ON | 91-120 | 31-40 |
| CARD #5 | OFF | OFF | ON | OFF | OFF | OFF | ON | ON | 121-150 | 41-50 |
| CARD #6 | ON | OFF | ON | OFF | OFF | OFF | ON | ON | 151-180 | 51-60 |

> O Módulo Mestre FIB8910 (Fire Indicator Panel / Break Glass Alarm) tem apenas um único LED Indicador de Status, que indica alimentação de 24V ao cartão.

**Descrição do diagrama "FIB8910 Termination Points and Example Wiring":**
- À esquerda do módulo FIB8910 há terminais: 0V, +24V, BUS-, BUS+, BUS2-, BUS2+ (BUS2 não instalado na Issue E e superiores), Relay 2 (Com/N/C/N/O), Relay 1 (Com/N/C/N/O). Conexões alternativas em modo RFIB: DAT, +5V, 0V, CLK, +24V.
- À direita há terminais numerados de 1 a 10 (cada um com + e -).
- O exemplo de fiação mostra contatos N/O (normalmente abertos) conectados a um diodo Zener EOL **BZT03-C10** no terminal 1.

---

## 5.6 Falha de Linha de WIP (WIP Line Fault)

> O WIPS2000 deve conectar a um módulo de terminação WTRM2000. O WIPS9004 deve conectar a um módulo WTRM9007. **Não troque os dois.**

> **Nota:** os LEDs de WIP Line fault piscam (enquanto não reconhecidos) quando uma falha de linha WIP é detectada na sua Zona correspondente. Por exemplo, um LED de WIP Line Fault piscando na Zona 2 indica uma falha de linha WIP associada àquela Zona.

**Diagnóstico:**
- Uma WIPS Module Fault pode estar presente se um ou mais LEDs de WIP Line Fault estão ativos. As zonas em falha indicam qual Módulo WIP pode estar com problemas, pois as linhas em falha estarão conectadas a esse módulo.
- Se uma WIP Line Fault é detectada, verifique a configuração de fiação e garanta que o resistor EOL (fim de linha) correto foi instalado. Um LED indicador de WIP Line fault estará na sua Zona correspondente no ECP, indicando em qual conexão WIP focar.

**Descrição do diagrama de fiação WTRM2000:**
- Terminais numerados de 16 a 30 (lado esquerdo) e 15 a 1 (lado direito), mais 0V em cada lado.
- Exemplos de fiação incluem: duas entradas de Propósito Geral em um circuito (600 ohms 1% e 1k2 1%); telefone (PHONE) com EOL 10k 1% e BGA com 1k2 1% (estilo 2 fios novo); estilo 3 fios antigo WIP/BGA com FIP (EOL 10k 1%), PHONE (EOL 10k 1%) e BGA (EOL 10k 1%); chave opcional N/O "Zone Manned" com 4k7 1%.

---

## 5.7 Falhas de cabo: PA Speech, Spare Speech, WIP Speech, Comms e Spare Comms

PA Speech Cable Faults, Spare Speech Cable Faults e WIP Speech Cable Faults referem-se às conexões entre cartões SPIF e ECPs Secundários e racks de equipamento (unidades remotas). Os terminais PA Speech, Speech Backup e WIP Speech correspondem à respectiva falha no Display de Falhas do Sistema do ECP.

> **Nota:** qualquer WIPS Module Failure ou WIP Speech cable fault ativa o LED 'WIP SYSTEM FAULT' no Display de Falhas do Sistema do ECP. O LED pisca enquanto não reconhecido e fica fixo para falha travada ou reconhecida.

Comms Cable Faults e Spare Comms Cable Faults no Display de Falhas do Sistema do ECP relacionam-se à perda de comunicação entre interfaces SPIF. Os terminais COMMS BUS e COMMS BACKUP em um cartão SPIF relacionam-se a Comms Cable Faults e Spare Comms Cable Faults, respectivamente.

**Descrição do diagrama "SPIF9506/SPIF9709 Wiring Diagrams" (terminais do cartão SPIF):**
- FIP BUS; COMMS BUS (+/-) → Para Comms Bus em outros painéis; COMMS BACKUP (+/-) → Para Comms Backup em outros painéis; EXT ALARM; PA SPEECH → Para PA Speech em outros painéis; SPEECH BACKUP → Para Speech Backup em outros painéis (opcional); PABX; MUSIC; AUX; WIP SPEECH → Para WIP Speech em outros painéis; SHIELDS GND.
- As blindagens (shields) devem ser conectadas juntas em todos os módulos e ao terminal SHIELDS em um módulo. O terminal GND deve ser conectado ao Chassi o mais diretamente possível.

---

## 5.8 Falhas de ECP (Painel de Controle de Evacuação)

### MECP and SECP Failure
Uma falha de MECP estará presente em qualquer SECP quando a comunicação for perdida e/ou o painel falhar ao ativar corretamente. De forma similar, uma falha de SECP estará presente quando a comunicação for perdida e/ou o painel falhar ao ativar corretamente.

### WIP MECP and SECP Failure
Uma falha de WIP MECP estará presente em qualquer SECP quando uma WIP Line fault ou WIPS Module failure for detectada no MECP. De forma similar, qualquer falha de WIP SECP estará presente em qualquer SECP quando uma WIP Line fault ou WIPS Module failure estiver presente no(s) SECP(s).

### Paging Console Failure
Uma falha de console de paging será observada quando uma perda de comunicação com o(s) console(s) de paging for descoberta.

## 5.9 Display de falhas — ECM Networked System

> Igual ao display ECP padrão: pressione e segure a tecla BGM/Paging em MANUAL para identificar as falhas.

Indicadores adicionais específicos de rede ECM:
- Local ECP latched Failure.
- Link Integ error Channel A (1º, 2º nó).
- Link Integ error Channel B (1º, 2º nó).
- Remote Sys fault (1º, 2º nó).
- Comms Cable A Fault e Comms Cable B Fault (em vez de um único Comms Cable Fault).

**Se houver problemas com uma Rede ECM e não for possível diagnosticar a falha:** contate seu pessoal Simplex local para assistência.

---

## 5.10 Registro de Falhas do QE90 (perguntas e soluções de campo)

### Programação — não há fase de alerta em modo Auto, mas funciona em Manual
**Solução:** várias possibilidades — o alerta foi desligado; o cascade foi desligado; os delays de cascade não estão configurados corretamente; o sistema foi especificamente programado dessa forma. **Referência:** LT0088 seções 24.3 (programação pelo painel frontal) e 24.4 (programação por porta serial) ou 20.7 (sistemas de rede ECM).

### Tons — meu alerta (ou outro tom/sinal) está muito alto comparado aos outros
**Solução:** os níveis dos seguintes sinais podem ser ajustados separadamente para cada rack de amplificador no cartão EMUX daquele rack: barramento PABX, PA Speech, Background Music, barramento AUX, Digitised Speech, Alert Tone. **Referência:** LT0088 seção 15.8.

### Servicing — QE90 indica Audio Fault em algumas zonas; desconectei a fiação dos alto-falantes e movi os resistores EOL para diretamente nos terminais do módulo transformador, mas as falhas persistem e não resetam. O que mais pode causar isso?
**Solução:**
- (a) **Falhas de supervisão de amplificador.** Para verificar: desligue a energia e remova o cartão amplificador que está gerando a falha. Remova os links 10 e 11 (em qualquer tipo de amplificador) para desabilitar o monitoramento de amplificador. Se as falhas podem ser resetadas quando o amplificador é recolocado, então a origem é a supervisão de amplificador. Substitua o cartão amplificador.
- (b) **Falha de circuito do módulo de strobe** também pode causar essa indicação. Para verificar se a origem é o Módulo de Strobe (se presente), olhe o LED vermelho LD4. Piscando = falha de linha atual; Aceso fixo = falha de linha travada.
- (c) Os LEDs de Audio Fault também estarão acesos para zonas afetadas se o cartão EMUX que controla aqueles amplificadores estiver defeituoso. Nesse caso, o LED de Evacuation System Fault no lado esquerdo do Módulo ECP também estará aceso.
**Referência:** LT0088 Seções 5.2.4, 8.6.

### Messages — as mensagens de voz estão muito baixas e abafadas pela reverberação do tom de evacuação
**Solução:** pode ser melhorado com modificações manuais na placa EMUX. Aumente o nível das palavras-chave de fala digitalizada "emergency" e "evacuate now" diminuindo o valor do R125 (sobre a posição XT1) — sugere-se conectar um resistor de 56k em paralelo. Também diminua o nível do tom de evacuação aumentando o valor de R45 (atualmente 22K) para 47K ou até 56k. O potenciômetro do tom de alerta precisará ser reduzido.

### Design — se uma zona é grande e requer dois circuitos de amplificador em racks separados com EMUX próprio, o sinal na zona ficará fora de sincronia?
**Solução:** sim, ficará fora de sincronia. Cartões EMUX não podem ser sincronizados. Tente reorganizar os amplificadores para que o mesmo amplificador da zona fique no mesmo rack. Se não for possível, use um amplificador de rack como "master" para a zona e alimente sua saída de 100V através de um divisor de tensão na entrada local dos amplificadores do outro rack (esses amplificadores programados para sempre selecionar a entrada local), mas reportando falhas à zona. **Referência:** Bulletin LM0372, PA0646, ALIM9706 Audio Isolator User Instructions.

### Paging Console — onde encontro um master para o rótulo de nomeação dos botões de zona?
**Solução:** no Fireplace, em downloads/QE90. É o LB0367, disponível como PDF ou planilha Excel.

### Front Panel — onde encontro um master para o rótulo de nomeação de zona da fascia do QE90?
**Solução:** no Fireplace, em downloads/QE90. É o LT0216, um documento MS Word.

### Installation — sistema ECP com rack AMP, MECP remoto e SECP; de vez em quando aparece um LED de "All Amp fault" que limpa logo depois. Qual o problema e como corrigir?
**Solução:** o sistema baseado em ECP requer que os circuitos de comunicação sejam aterrados em todas as pontas. Se houver ruído de terra elétrico entre esses pontos, as comunicações podem falhar temporariamente. A falha "All Amp" indica uma falha de comunicação. A solução mais bem-sucedida é fazer upgrade do sistema para uma configuração base ECM. A falta de aterramento que deveria existir pode contribuir — ver PBQ0080. **Referência:** LT0088 Fig 16.4, PBQ0080.

### Servicing — ao energizar, os indicadores Alert, Evac e PA da Zona 2 estavam piscando juntos. O que significa?
**Solução:** a Zona 2 foi isolada com a facilidade de isolamento de serviço acessível pela facilidade de Programação On-Site. Isso normalmente não acontece sozinho, mas foi notado ocasionalmente, presumivelmente porque o software ECP não limpou a localização de memória aplicável. Para limpar: entre no display da tabela de falhas de serviço conforme LT0088 Cap 24.3 Passo 6 e pressione a tecla oculta sob o texto "LINE FAULT". **Referência:** LT0088 seção 24.3.

### Programming — QE90 não-ECM precisa ser programado, mas ao conectar o terminal PC ao SPIF e pressionar enter, retornam caracteres irreconhecíveis. O QE90 conecta a uma porta FIP RZDU. Como entrar em modo de programação?
**Solução:** o ECP tem apenas uma porta serial para conectar via SPIF ou SE9004 issue C. Quando configurado para interface RZDU 1200 baud para o FIP, a porta não pode ser usada para programação (normalmente 9600 baud). Nesse caso, programe pelo painel frontal. **Referência:** LT0088 seção 24.3.

### Servicing — ocupantes reclamam de um chiado nos alto-falantes quando a sala está quieta
**Solução:** garanta que os Links de Entrada Local no Amplificador estejam na posição "Silence", a menos que estejam terminados em uma saída de equipamento de baixa impedância. Se as entradas do amplificador estão programadas para BGM ou PABX, garanta que essas entradas estejam ou curto-circuitadas (se não usadas) ou terminadas em saídas de baixa impedância do equipamento BGM ou PABX. **Referência:** LT0088 Seção 5.2.3.

### Messages — em zona grande com múltiplos amplificadores em vários card cages, como conseguir sincronização de tom e mensagem?
**Solução:** use um amplificador da zona como "master" e configure todos os amplificadores da mesma zona nos outros card racks como "slaves" — use um ALIM modificado conforme fig 3 do LT0372 para monitorar a linha de 100V do amplificador "master" e alimente-a na entrada de áudio local dos "slaves". Os "slaves" supervisionam sua própria linha de alto-falante, mas nunca selecionam nada além da entrada local. **Referência:** LT0372 (também PBQ0072).

### Installation — strobes Simplex T3 não funcionam
**Solução:** strobes Simplex T3 só funcionam em EVAC.
1. O Positivo deve ser cabeado ao Terminal B e o Negativo ao Terminal A.
2. A configuração de dip switch (5, 6, 7, 8) deve ser (OFF, ON, ON, ON). **Referência:** PBQ0095.

### Servicing — luz Comms (amarela) não pisca; um LED (verde) pisca; 8-10V entre comms; painel exibe zonas 3, 4 e 5 em Audio Fault
**Solução:** o painel tem um Cartão de Strobe defeituoso. Após trocar dois cartões de strobe, a falha limpou do painel e seguiu o cartão de strobe defeituoso (quando testado em outro painel).

### Servicing — falha de linha de áudio observada nas Zonas 2 e 3
**Solução:** após substituir os amplificadores e transformadores, a falha não limpou. O cabo flat ribbon pode estar com defeito ou danificado. A faixa vermelha do cabo deve apontar para o pino número 1.

---

# SEÇÃO 6 — CONTATO DE SUPORTE

**Número Nacional de Suporte (Austrália):** 1300 552 559

| Filial | Endereço | Telefone |
|---|---|---|
| Sydney | Unit 2, 2-8 South Street, Rydalmere NSW 2116 | (02) 9638 8280 / Fax (02) 9638 8285 |
| Melbourne | 47 Gilby Road, Notting Hill VIC 3149 | (03) 9538 7250 / Fax (03) 9538 7200 / Freecall 1300 552 559 |
| Brisbane | 34 Corporate Drive, Cannon Hill QLD 4170 | (07) 3318 6900 / Fax (07) 3318 6992 |
| Perth | 1 Eyre St., Rivervale WA 6103 | (08) 9479 2999 / Fax (08) 9479 2883 |

> **Nota:** estes contatos são da Austrália, conforme o manual original (Rev A, 2009). Para suporte no Brasil/local, substitua pelos contatos da sua organização.

---

*Fim do documento. Fonte original: Simplex Fire Products — Fault & Assistance Guide, Rev A, 29 abril 2009. Tradução e reorganização para uso em sistema RAG.*
