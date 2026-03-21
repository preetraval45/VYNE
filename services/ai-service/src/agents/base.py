"""Shared LLM factory for all VYNE LangGraph agents."""
from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)


def get_llm(streaming: bool = False):
    """Return Claude 3.5 Sonnet via Bedrock, or a MockLLM in dev.

    The function is intentionally lightweight — it is called per-node so
    that the graph stays stateless and easy to test.
    """
    try:
        import boto3  # noqa: PLC0415
        from langchain_aws import ChatBedrock  # noqa: PLC0415

        # Probe the credentials / region by creating a low-cost client.
        # If this raises, we fall through to the mock.
        boto3.client("sts").get_caller_identity()

        llm = ChatBedrock(
            model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
            streaming=streaming,
            model_kwargs={"max_tokens": 4096, "temperature": 0.1},
        )
        log.debug("llm_factory", backend="bedrock", streaming=streaming)
        return llm
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "llm_factory_fallback",
            reason=str(exc),
            backend="mock",
        )
        from src.agents.mock_llm import MockLLM  # noqa: PLC0415

        return MockLLM()
