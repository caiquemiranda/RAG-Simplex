"""Estratégias de geração de resposta (plugáveis).

A geração da resposta final é abstraída como uma **estratégia**: recebe a
recuperação do RAG e devolve uma :class:`Resposta`. Isso permite trocar/comparar
o modo de responder sem mexer no resto do pipeline.

Estratégias:
- :class:`LocalExtrativa` — **sem LLM**. Renderiza o bloco recuperado em template
  de dupla camada. Grátis, instantânea, roda em CPU fraca e tem ancoragem perfeita
  (não inventa nada — só reorganiza o texto oficial). É o padrão atual.
- Estratégias de **nuvem** (Claude/Gemini/Groq) entram na Fase 10 e são registradas
  por seus próprios módulos (ex.: ``app.geracao``). Ver `docs/CONFIGURAR_APIKEYS.md`.

A seleção da estratégia padrão vem de ``settings.estrategia_geracao``.
"""

from __future__ import annotations

import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterator

from app.config import settings
from app.recuperacao import Recuperacao, Resultado, buscar

# --------------------------------------------------------------------------- #
# Modelo de saída                                                             #
# --------------------------------------------------------------------------- #
@dataclass
class Resposta:
    """Resposta final do pipeline RAG, com métricas da estratégia usada."""

    texto: str
    fontes: list[dict]
    fallback: bool                      # True quando nenhum bloco atingiu o limiar
    estrategia: str = ""
    latencia_ms: float | None = None
    custo_estimado: float = 0.0         # em USD; 0 para estratégias locais


# Mensagem de fallback gracioso (PRD §6.1) — determinística, sem chamar LLM.
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

# Aviso de segurança fixo (PRD §5.2) — usado quando há risco elétrico/supressão.
AVISO_SEGURANCA = (
    "> ⚠️ **AVISO DE SEGURANÇA** — Esta falha pode envolver risco elétrico, bypass de "
    "zona de supressão ou manipulação da fonte de alimentação primária (AC/DC, "
    "carregador 4100-0157A). Trabalhe com o nível de acesso adequado. **Se houver "
    "qualquer dúvida sobre placas internas, tensões ou aterramento, interrompa o "
    "procedimento e acione a engenharia de segurança / suporte de fábrica Simplex.** "
    "Nunca deixe o sistema de incêndio inoperante."
)

# Termos que disparam o aviso de segurança (além da severidade nos metadados).
_RISCO_KW = (
    "terra", "earth", "tensão", "tensao", "fonte", "aliment", "bateria", "battery",
    "curto", "short", "supress", "evacua", "carregador", "aterr", "ac/dc",
    "4100-0157", "127v", "220v", "24v",
)


def _formatar_fontes(blocos: list[Resultado]) -> list[dict]:
    """Resumo das fontes para exibição/auditoria."""
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


# --------------------------------------------------------------------------- #
# Interface                                                                    #
# --------------------------------------------------------------------------- #
class EstrategiaGeracao(ABC):
    """Contrato comum a todas as estratégias de geração."""

    #: identificador estável usado no registro e na seleção.
    nome: str = "base"

    @abstractmethod
    def gerar(
        self,
        consulta: str,
        recuperacao: Recuperacao,
        persona: str | None = None,
    ) -> Resposta:
        """Produz a resposta final a partir da recuperação."""

    def gerar_stream(
        self,
        consulta: str,
        recuperacao: Recuperacao,
        persona: str | None = None,
    ) -> Iterator[str]:
        """Versão streaming. Padrão: emite a resposta completa de uma vez.

        Estratégias de nuvem podem sobrescrever para emitir token a token.
        """
        yield self.gerar(consulta, recuperacao, persona).texto


# --------------------------------------------------------------------------- #
# Estratégia LOCAL_EXTRATIVO (sem LLM)                                         #
# --------------------------------------------------------------------------- #
class LocalExtrativa(EstrategiaGeracao):
    """Renderiza o bloco recuperado em dupla camada, sem chamar nenhuma LLM."""

    nome = "local_extrativa"

    def gerar(
        self,
        consulta: str,
        recuperacao: Recuperacao,
        persona: str | None = None,
    ) -> Resposta:
        inicio = time.perf_counter()

        if not recuperacao.acima_do_limiar:
            return Resposta(
                texto=FALLBACK_MSG, fontes=[], fallback=True, estrategia=self.nome,
                latencia_ms=(time.perf_counter() - inicio) * 1000,
            )

        relevantes = recuperacao.relevantes  # já ordenados por similaridade desc.
        principal = relevantes[0]
        texto = self._renderizar(principal, relevantes[1:])

        return Resposta(
            texto=texto,
            fontes=_formatar_fontes(relevantes),
            fallback=False,
            estrategia=self.nome,
            latencia_ms=(time.perf_counter() - inicio) * 1000,
            custo_estimado=0.0,
        )

    # --- helpers de renderização ---
    def _renderizar(self, bloco: Resultado, relacionados: list[Resultado]) -> str:
        corpo = self._corpo_do_bloco(bloco)
        simples, tecnica = self._separar_camadas(corpo)
        header = bloco.metadados.get("header", "Falha")

        partes: list[str] = []
        if self._precisa_aviso(bloco):
            partes.append(AVISO_SEGURANCA)

        partes.append(f"**{header}**")
        partes.append("## 🟢 Em linguagem simples\n\n" + (simples or "_(sem explicação simples no bloco)_"))
        if tecnica:
            partes.append("## 🔧 Resolução técnica\n\n" + tecnica)

        partes.append(
            f"---\n*Trecho extraído diretamente do guia oficial "
            f"({bloco.metadados.get('fonte', 'guia')}, similaridade "
            f"{bloco.similaridade:.2f}) — sem geração por IA.*"
        )

        if relacionados:
            limite = settings.extrativo_max_relacionados
            itens = "\n".join(
                f"- {r.metadados.get('header')} "
                f"(sistema {r.metadados.get('sistema')}, sim. {r.similaridade:.2f})"
                for r in relacionados[:limite]
            )
            partes.append("## 📎 Blocos relacionados\n\n" + itens)

        return "\n\n".join(partes)

    @staticmethod
    def _corpo_do_bloco(bloco: Resultado) -> str:
        """Remove a linha ``[header_path]`` e o título, devolvendo só o corpo."""
        texto = bloco.texto
        # O texto começa com "[header_path]\n\n{titulo}\n{corpo}".
        if texto.startswith("["):
            _, _, resto = texto.partition("\n")
            texto = resto.lstrip("\n")
        header = bloco.metadados.get("header", "")
        if header and header in texto:
            texto = texto.split(header, 1)[1]
        return texto.strip()

    @staticmethod
    def _separar_camadas(corpo: str) -> tuple[str, str]:
        """Separa a explicação simples (🟢) do restante técnico (🔧)."""
        m = re.search(
            r"\*\*\s*Explica[cç][aã]o simples\.?\s*\*\*\s*(.+?)(?=\n\s*\n|\n\s*\*\*|\Z)",
            corpo, re.S | re.I,
        )
        if m:
            simples = m.group(1).strip()
            tecnica = (corpo[: m.start()] + corpo[m.end():]).strip()
        else:
            # Sem marcador: 1º parágrafo vira simples; o resto, técnico.
            partes = corpo.strip().split("\n\n", 1)
            simples = partes[0].strip()
            tecnica = partes[1].strip() if len(partes) > 1 else ""
        return simples, tecnica

    @staticmethod
    def _precisa_aviso(bloco: Resultado) -> bool:
        if bloco.metadados.get("severidade") in {"Alta", "Crítica"}:
            return True
        alvo = f"{bloco.metadados.get('header', '')} {bloco.texto}".lower()
        return any(kw in alvo for kw in _RISCO_KW)


# --------------------------------------------------------------------------- #
# Registro e seleção                                                           #
# --------------------------------------------------------------------------- #
#: Estratégias disponíveis. Estratégias de nuvem se auto-registram aqui ao serem
#: importadas (ex.: ``app.geracao`` registra ``claude_nuvem`` na Fase 10).
ESTRATEGIAS: dict[str, EstrategiaGeracao] = {
    LocalExtrativa.nome: LocalExtrativa(),
}


def registrar_estrategia(estrategia: EstrategiaGeracao) -> None:
    """Adiciona/atualiza uma estratégia no registro."""
    ESTRATEGIAS[estrategia.nome] = estrategia


def obter_estrategia(nome: str | None = None) -> EstrategiaGeracao:
    """Resolve a estratégia pelo nome (ou o padrão de ``settings``)."""
    nome = nome or settings.estrategia_geracao
    if nome not in ESTRATEGIAS:
        disponiveis = ", ".join(sorted(ESTRATEGIAS))
        raise ValueError(
            f"Estratégia de geração desconhecida: {nome!r}. "
            f"Disponíveis: {disponiveis}. "
            "Estratégias de nuvem exigem configurar a API key "
            "(ver docs/CONFIGURAR_APIKEYS.md) e só são ativadas na Fase 10."
        )
    return ESTRATEGIAS[nome]


def _main() -> None:
    import sys

    consulta = " ".join(sys.argv[1:]) or "HEAD MISSING no loop do 4100"
    estrategia = obter_estrategia()
    resp = estrategia.gerar(consulta, buscar(consulta))
    print(f"Estratégia: {resp.estrategia} | fallback: {resp.fallback} | "
          f"{resp.latencia_ms:.0f} ms\n")
    print(resp.texto)


if __name__ == "__main__":
    _main()
