from __future__ import annotations

import json
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Any

from ..config import settings
from ..dependencies import get_current_user

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class IssueAnalysisRequest(BaseModel):
    issueId: str
    title: str
    description: str
    context: str | None = None


class IssueAnalysisResponse(BaseModel):
    summary: str
    suggestedPriority: str  # low | medium | high | critical
    estimatedEffort: str  # e.g. "2-3 days"
    relatedIssues: list[str]
    actionItems: list[str]


class IncidentAnalysisRequest(BaseModel):
    incidentId: str
    errorMessage: str
    deploymentInfo: dict[str, Any] | None = None
    affectedOrders: list[str] | None = None


class IncidentAnalysisResponse(BaseModel):
    rootCause: str
    impactAnalysis: str
    revenueAtRisk: float
    recommendation: str


# ---------------------------------------------------------------------------
# Bedrock helper
# ---------------------------------------------------------------------------


def _invoke_claude(prompt: str) -> str:
    """
    Call Anthropic Claude via AWS Bedrock.  Falls back to a stub in dev when
    Bedrock is not reachable.
    """
    try:
        import boto3  # noqa: PLC0415
        import botocore  # noqa: PLC0415

        client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(response["body"].read())
        return result["content"][0]["text"]
    except Exception as exc:  # noqa: BLE001
        log.warning("bedrock_unavailable", error=str(exc), mode="dev_fallback")
        return ""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/issue", response_model=IssueAnalysisResponse)
async def analyze_issue(
    body: IssueAnalysisRequest,
    _user: dict = Depends(get_current_user),
) -> IssueAnalysisResponse:
    """
    Analyze an issue with Claude via Bedrock.
    Returns a dev mock when Bedrock is unavailable.
    """
    prompt = (
        f"You are an engineering project manager AI.\n\n"
        f"Analyze the following issue and respond with a JSON object matching "
        f"exactly this schema (no extra keys):\n"
        f'{{"summary":"...","suggestedPriority":"low|medium|high|critical",'
        f'"estimatedEffort":"...","relatedIssues":[],"actionItems":[]}}\n\n'
        f"Issue ID: {body.issueId}\n"
        f"Title: {body.title}\n"
        f"Description: {body.description}\n"
        f"Context: {body.context or 'None'}"
    )

    raw = _invoke_claude(prompt)

    if raw:
        try:
            # Claude may wrap JSON in markdown code fences
            raw_clean = raw.strip()
            if raw_clean.startswith("```"):
                raw_clean = raw_clean.split("```")[1]
                if raw_clean.startswith("json"):
                    raw_clean = raw_clean[4:]
            data = json.loads(raw_clean)
            return IssueAnalysisResponse(**data)
        except Exception as exc:  # noqa: BLE001
            log.warning("claude_parse_error", error=str(exc), raw=raw[:200])

    # Dev / fallback mock
    return IssueAnalysisResponse(
        summary=(
            f"This issue ('{body.title}') appears to be a moderate complexity task. "
            "Further investigation is recommended to scope the full impact."
        ),
        suggestedPriority="medium",
        estimatedEffort="2-3 days",
        relatedIssues=[],
        actionItems=[
            "Reproduce the issue in a local environment",
            "Review recent commits that may have introduced the regression",
            "Add unit tests to cover the edge case",
            "Update documentation if behaviour changes",
        ],
    )


@router.post("/incident", response_model=IncidentAnalysisResponse)
async def analyze_incident(
    body: IncidentAnalysisRequest,
    _user: dict = Depends(get_current_user),
) -> IncidentAnalysisResponse:
    """
    Correlate business + infra events and return an incident analysis.
    Returns a dev mock when Bedrock is unavailable.
    """
    affected_count = len(body.affectedOrders or [])
    deployment_summary = json.dumps(body.deploymentInfo or {}, indent=2)

    prompt = (
        "You are a senior SRE AI assistant.\n\n"
        "Analyze the following incident and respond with a JSON object matching "
        "exactly this schema (no extra keys):\n"
        '{"rootCause":"...","impactAnalysis":"...","revenueAtRisk":0.0,"recommendation":"..."}\n\n'
        f"Incident ID: {body.incidentId}\n"
        f"Error message: {body.errorMessage}\n"
        f"Deployment info: {deployment_summary}\n"
        f"Affected orders: {affected_count}"
    )

    raw = _invoke_claude(prompt)

    if raw:
        try:
            raw_clean = raw.strip()
            if raw_clean.startswith("```"):
                raw_clean = raw_clean.split("```")[1]
                if raw_clean.startswith("json"):
                    raw_clean = raw_clean[4:]
            data = json.loads(raw_clean)
            return IncidentAnalysisResponse(**data)
        except Exception as exc:  # noqa: BLE001
            log.warning("claude_parse_error", error=str(exc), raw=raw[:200])

    # Estimate rough revenue risk at $150 per affected order (placeholder)
    revenue_at_risk = round(affected_count * 150.0, 2)

    return IncidentAnalysisResponse(
        rootCause=(
            f"Likely caused by the most recent deployment. "
            f"Error signature: '{body.errorMessage[:120]}'"
        ),
        impactAnalysis=(
            f"{affected_count} order(s) are potentially affected. "
            "Service degradation observed across dependent downstream services."
        ),
        revenueAtRisk=revenue_at_risk,
        recommendation=(
            "1. Roll back the latest deployment immediately.\n"
            "2. Restore service from last known-good snapshot.\n"
            "3. Conduct a full post-mortem within 48 hours.\n"
            "4. Add integration test coverage for the failing path."
        ),
    )
