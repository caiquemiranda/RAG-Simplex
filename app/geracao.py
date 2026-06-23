"""Geração: orquestra a estratégia de resposta selecionada.

Este módulo é o **ponto de entrada da geração**. Ele resolve qual estratégia usar
(ver :mod:`app.estrategias`) e delega. A API pública (`gerar_resposta`,
`gerar_resposta_stream`) é estável e consumida por :mod:`app.main`.

Estratégia padrão: ``local_extrativa`` (sem LLM, grátis). A estratégia de **nuvem**
``claude_nuvem`` é definida aqui e registrada, mas só funciona quando a
``ANTHROPIC_API_KEY`` está configurada (Fase 10 — ver `docs/CONFIGURAR_APIKEYS.md`).
"""

from __future__ import annotations

import time
from typing import Iterator

from app.config import settings
from app.estrategias import (
    AVISO_SEGURANCA,
    FALLBACK_MSG,
    EstrategiaGeracao,
    Resposta,
    _formatar_fontes,
    obter_estrategia,
    registrar_estrategia,
)
from app.recuperacao import Recuperacao, Resultado, buscar

__all__ = ["gerar_resposta", "gerar_resposta_stream", "Resposta", "FALLBACK_MSG"]


# --------------------------------------------------------------------------- #
# Orquestração (API pública)                                                   #
# --------------------------------------------------------------------------- #
def gerar_resposta(
    consulta: str,
    recuperacao: Recuperacao | None = None,
    persona: str | None = None,
    estrategia: str | None = None,
) -> Resposta:
    """Gera a resposta final usando a estratégia selecionada.

    Se ``recuperacao`` não for passada, a busca é feita aqui. Se ``estrategia`` não
    for passada, usa ``settings.estrategia_geracao``.
    """
    rec = recuperacao if recuperacao is not None else buscar(consulta)
    return obter_estrategia(estrategia).gerar(consulta, rec, persona)


def gerar_resposta_stream(
    consulta: str,
    recuperacao: Recuperacao | None = None,
    persona: str | None = None,
    estrategia: str | None = None,
) -> Iterator[str]:
    """Versão streaming da geração (delega à estratégia)."""
    rec = recuperacao if recuperacao is not None else buscar(consulta)
    yield from obter_estrategia(estrategia).gerar_stream(consulta, rec, persona)


# --------------------------------------------------------------------------- #
# Estratégia de NUVEM — Claude (Fase 10, requer API key)                       #
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


def _montar_mensagem(consulta: str, blocos: list[Resultado], persona: str | None) -> str:
    persona_txt = f"\nPERFIL DO USUÁRIO: {persona}." if persona else ""
    return (
        f"PERGUNTA DO USUÁRIO: {consulta}{persona_txt}\n\n"
        f"BLOCOS DE CONTEXTO RECUPERADOS:\n{_formatar_contexto(blocos)}"
    )


class ClaudeNuvem(EstrategiaGeracao):
    """Geração via API do Claude. **Requer** ``ANTHROPIC_API_KEY`` (Fase 10)."""

    nome = "claude_nuvem"

    def _client(self):
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "Estratégia 'claude_nuvem' selecionada, mas ANTHROPIC_API_KEY não "
                "está configurada. Configure a chave (veja docs/CONFIGURAR_APIKEYS.md) "
                "ou use a estratégia padrão 'local_extrativa'."
            )
        import anthropic  # import preguiçoso: app roda sem o SDK no modo local

        return anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def gerar(self, consulta: str, recuperacao: Recuperacao,
              persona: str | None = None) -> Resposta:
        inicio = time.perf_counter()
        if not recuperacao.acima_do_limiar:
            return Resposta(texto=FALLBACK_MSG, fontes=[], fallback=True,
                            estrategia=self.nome,
                            latencia_ms=(time.perf_counter() - inicio) * 1000)

        blocos = recuperacao.relevantes
        resp = self._client().messages.create(
            model=settings.claude_model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user",
                       "content": _montar_mensagem(consulta, blocos, persona)}],
        )
        texto = "".join(b.text for b in resp.content if b.type == "text")
        return Resposta(texto=texto, fontes=_formatar_fontes(blocos), fallback=False,
                        estrategia=self.nome,
                        latencia_ms=(time.perf_counter() - inicio) * 1000)

    def gerar_stream(self, consulta: str, recuperacao: Recuperacao,
                     persona: str | None = None) -> Iterator[str]:
        if not recuperacao.acima_do_limiar:
            yield FALLBACK_MSG
            return
        blocos = recuperacao.relevantes
        with self._client().messages.stream(
            model=settings.claude_model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user",
                       "content": _montar_mensagem(consulta, blocos, persona)}],
        ) as stream:
            yield from stream.text_stream


# Registra a estratégia de nuvem (inerte até haver API key + seleção explícita).
registrar_estrategia(ClaudeNuvem())


def _main() -> None:
    import sys

    consulta = " ".join(sys.argv[1:]) or "HEAD MISSING no loop do 4100"
    resp = gerar_resposta(consulta)
    print(f"Estratégia: {resp.estrategia} | fallback: {resp.fallback}\n")
    print(resp.texto)
    if resp.fontes:
        print("\nFontes:")
        for f in resp.fontes:
            print(f"  - [{f['similaridade']}] {f['header']} ({f['sistema']})")


if __name__ == "__main__":
    _main()
