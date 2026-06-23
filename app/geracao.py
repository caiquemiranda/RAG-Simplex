"""Geração: conecta a API do Claude para produzir a resposta em dupla camada.

Recebe os blocos recuperados pelo RAG e gera uma resposta **ancorada** (sem
alucinação) e estruturada em duas camadas (PRD §5.2): linguagem simples para
não-técnicos e resolução técnica para campo/engenharia. Quando o contexto
envolve risco elétrico, gera um bloco de aviso de segurança no topo (PRD §5.2).

Latência: o PRD §2.2 exige resposta fim-a-fim < 3s, então o *extended thinking*
fica desligado e o modelo é instruído a responder direto (sem rascunho visível).
"""

from __future__ import annotations

from dataclasses import dataclass

import anthropic

from app.config import settings
from app.recuperacao import Recuperacao, Resultado, buscar

# --------------------------------------------------------------------------- #
# Prompts                                                                      #
# --------------------------------------------------------------------------- #
SYSTEM_PROMPT = """\
Você é o assistente técnico do RAG-Simplex, especializado em painéis de detecção \
e alarme de incêndio da marca Simplex (séries 4100, F3200, QE90 e redes IMS/TrueSite).

REGRAS DE ANCORAGEM (obrigatórias):
- Responda EXCLUSIVAMENTE com base nos BLOCOS DE CONTEXTO fornecidos. Não invente \
passos, tensões, endereços, dipswitches ou procedimentos que não estejam no contexto.
- Se o contexto não cobrir a pergunta, diga isso claramente e oriente contatar o \
suporte Simplex. Nunca misture procedimentos de outras marcas (Notifier, Bosch etc.).
- Preserve os termos de diagnóstico exibidos no display em inglês (ex.: "HEAD MISSING").

FORMATO OBRIGATÓRIO DA RESPOSTA (duas camadas, nesta ordem):

⚠️ **AVISO DE SEGURANÇA** — inclua este bloco NO TOPO somente quando o contexto \
envolver risco elétrico real, bypass de zonas de supressão, ou manipulação de \
fontes de alimentação primária (AC/DC, carregador 4100-0157A). Diga explicitamente \
quando interromper o procedimento e acionar a engenharia de segurança/suporte de fábrica.

## 🟢 Em linguagem simples
Explicação de alto nível do que a falha significa para a edificação, o impacto no \
funcionamento e ações imediatas seguras (incluindo o que NÃO tocar). Para operadores \
não-técnicos.

## 🔧 Resolução técnica
Procedimento passo a passo para técnicos/engenharia: testes elétricos com a escala \
do multímetro indicada, mapas de dipswitches (em formato legível para montagem em \
campo), checagem de aterramento e endereçamento. Cite os termos exatos do display.

ESTILO: responda direto, em português (PT-BR), sem exibir raciocínio intermediário \
nem rascunhos. Seja objetivo — o técnico está em campo.\
"""

# Mensagem de fallback gracioso (PRD §6.1) — determinística, sem chamada ao LLM.
FALLBACK_MSG = (
    "Não encontrei na base de conhecimento oficial uma falha que corresponda com "
    "segurança à sua consulta (nenhum bloco atingiu o limiar mínimo de similaridade "
    f"de {settings.similarity_threshold:.2f}).\n\n"
    "Para evitar orientação incorreta em um sistema de segurança de vida, **não vou "
    "improvisar um procedimento**. Recomendações:\n"
    "- Confira a mensagem **exata** exibida no display LCD do painel e tente novamente.\n"
    "- Verifique se selecionou o sistema correto (4100 / F3200 / QE90 / REDE).\n"
    "- Acione o suporte de engenharia Simplex (contatos na Seção 6 do guia).\n"
)


@dataclass
class Resposta:
    """Resposta final do pipeline RAG."""

    texto: str
    fontes: list[dict]
    fallback: bool  # True quando nenhum bloco atingiu o limiar


# --------------------------------------------------------------------------- #
# Montagem do contexto                                                         #
# --------------------------------------------------------------------------- #
def _formatar_contexto(blocos: list[Resultado]) -> str:
    partes = []
    for i, b in enumerate(blocos, 1):
        meta = b.metadados
        partes.append(
            f"--- BLOCO {i} "
            f"(sistema={meta.get('sistema')}, severidade={meta.get('severidade')}, "
            f"similaridade={b.similaridade:.3f}) ---\n{b.texto}"
        )
    return "\n\n".join(partes)


def _fontes(blocos: list[Resultado]) -> list[dict]:
    return [
        {
            "id": b.id,
            "header": b.metadados.get("header"),
            "sistema": b.metadados.get("sistema"),
            "severidade": b.metadados.get("severidade"),
            "similaridade": round(b.similaridade, 3),
        }
        for b in blocos
    ]


def _client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY não configurada. Defina-a no arquivo .env."
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _montar_mensagem(consulta: str, blocos: list[Resultado], persona: str | None) -> str:
    persona_txt = f"\nPERFIL DO USUÁRIO: {persona}." if persona else ""
    return (
        f"PERGUNTA DO USUÁRIO: {consulta}{persona_txt}\n\n"
        f"BLOCOS DE CONTEXTO RECUPERADOS:\n{_formatar_contexto(blocos)}"
    )


# --------------------------------------------------------------------------- #
# Geração                                                                      #
# --------------------------------------------------------------------------- #
def gerar_resposta(
    consulta: str,
    recuperacao: Recuperacao | None = None,
    persona: str | None = None,
) -> Resposta:
    """Gera a resposta final ancorada nos blocos recuperados.

    Se ``recuperacao`` não for passada, a busca é feita aqui. Quando nenhum bloco
    atinge o limiar, retorna o fallback gracioso sem chamar o modelo.
    """
    rec = recuperacao or buscar(consulta)

    if not rec.acima_do_limiar:
        return Resposta(texto=FALLBACK_MSG, fontes=[], fallback=True)

    blocos = rec.relevantes
    client = _client()
    resposta = client.messages.create(
        model=settings.claude_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _montar_mensagem(consulta, blocos, persona)}],
    )
    texto = "".join(b.text for b in resposta.content if b.type == "text")
    return Resposta(texto=texto, fontes=_fontes(blocos), fallback=False)


def gerar_resposta_stream(
    consulta: str,
    recuperacao: Recuperacao | None = None,
    persona: str | None = None,
):
    """Versão streaming: gera os tokens da resposta conforme são produzidos.

    Para o fallback, emite a mensagem fixa de uma vez. Útil para a interface
    responsiva exigida pelo PRD (campo, conexão móvel).
    """
    rec = recuperacao or buscar(consulta)
    if not rec.acima_do_limiar:
        yield FALLBACK_MSG
        return

    blocos = rec.relevantes
    client = _client()
    with client.messages.stream(
        model=settings.claude_model,
        max_tokens=settings.max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _montar_mensagem(consulta, blocos, persona)}],
    ) as stream:
        for texto in stream.text_stream:
            yield texto


def _main() -> None:
    import sys

    consulta = " ".join(sys.argv[1:]) or "HEAD MISSING no loop do 4100"
    resp = gerar_resposta(consulta)
    print(f"Fallback: {resp.fallback}\n")
    print(resp.texto)
    if resp.fontes:
        print("\nFontes:")
        for f in resp.fontes:
            print(f"  - [{f['similaridade']}] {f['header']} ({f['sistema']})")


if __name__ == "__main__":
    _main()
