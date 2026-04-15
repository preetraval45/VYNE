"""Shared LLM factory for all VYNE LangGraph agents."""
from __future__ import annotations

import os
import structlog

log = structlog.get_logger(__name__)


def get_llm(streaming: bool = False):
    """Return the best available LLM:
      1. Claude via Anthropic SDK (ANTHROPIC_API_KEY set — Vercel deployment)
      2. Claude via AWS Bedrock (AWS credentials available — on-prem / ECS)
      3. MockLLM (dev / no credentials)
    """
    # ── 1. Anthropic direct ───────────────────────────────────────────────
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        try:
            from langchain_anthropic import ChatAnthropic  # noqa: PLC0415

            llm = ChatAnthropic(
                model="claude-opus-4-6",
                api_key=anthropic_key,
                max_tokens=4096,
                temperature=0.1,
                streaming=streaming,
            )
            log.debug("llm_factory", backend="anthropic", streaming=streaming)
            return llm
        except Exception as exc:  # noqa: BLE001
            log.warning("llm_factory_anthropic_failed", reason=str(exc))

    # ── 2. AWS Bedrock ────────────────────────────────────────────────────
    try:
        import boto3  # noqa: PLC0415
        from langchain_aws import ChatBedrock  # noqa: PLC0415

        boto3.client("sts").get_caller_identity()
        llm = ChatBedrock(
            model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
            streaming=streaming,
            model_kwargs={"max_tokens": 4096, "temperature": 0.1},
        )
        log.debug("llm_factory", backend="bedrock", streaming=streaming)
        return llm
    except Exception as exc:  # noqa: BLE001
        log.warning("llm_factory_bedrock_failed", reason=str(exc))

    # ── 3. Mock fallback ──────────────────────────────────────────────────
    log.warning("llm_factory_fallback", backend="mock")
    from src.agents.mock_llm import MockLLM  # noqa: PLC0415

    return MockLLM()
