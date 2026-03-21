"""Mock LLM for development when AWS Bedrock is not configured."""
from __future__ import annotations

from langchain_core.messages import AIMessage


class MockLLM:
    """Returns deterministic mock responses for development.

    Mirrors the async/sync interface of ChatBedrock so the rest of the
    agent graph does not need to branch on whether real Bedrock is
    available.
    """

    async def ainvoke(self, messages, **kwargs) -> AIMessage:  # noqa: ANN001
        last_msg = ""
        if messages:
            m = messages[-1]
            # Accept both dicts {"role": ..., "content": ...} and LangChain
            # message objects.
            last_msg = m.get("content", "") if isinstance(m, dict) else m.content
        preview = last_msg[:120]
        return AIMessage(
            content=(
                f"[Mock AI Response] I analyzed: '{preview}'. "
                "In production, Claude 3.5 Sonnet via Bedrock would provide "
                "a real analysis here."
            )
        )

    def invoke(self, messages, **kwargs) -> AIMessage:  # noqa: ANN001
        last_msg = ""
        if messages:
            m = messages[-1]
            last_msg = m.get("content", "") if isinstance(m, dict) else m.content
        return AIMessage(
            content=(
                f"[Mock AI Response] Analyzed: '{last_msg[:80]}'. "
                "Production: Bedrock Claude 3.5 Sonnet."
            )
        )

    def stream(self, messages, **kwargs):  # noqa: ANN001
        yield AIMessage(
            content="[Mock AI Stream] In production: real Bedrock streaming response."
        )
