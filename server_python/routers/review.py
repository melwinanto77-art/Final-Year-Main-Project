from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from auth import require_admin
from database import get_db
from models import ReportModel, ClientModel
from state import assert_transition
from errors import ApiError
from integrations.email import send_report_email

router = APIRouter(prefix="/api", tags=["review"])


class ReviewRequest(BaseModel):
    adminScore: int = Field(ge=0, le=100)
    adminAnalysis: Optional[str] = None
    adminVerdict: Optional[str] = None
    adminStrengths: Optional[str] = None
    adminRisks: Optional[str] = None
    approvalNote: Optional[str] = None


@router.post("/reports/{report_id}/review")
def submit_review(report_id: str, body: ReviewRequest, db: Session = Depends(get_db),
                  user=Depends(require_admin)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise ApiError.not_found(f"Report {report_id}")

    if report.status != "REVIEWING":
        raise ApiError.conflict(
            f"Report is currently {report.status}. Can only review reports in REVIEWING status."
        )

    report.admin_score = body.adminScore
    report.admin_analysis = body.adminAnalysis
    report.admin_verdict = body.adminVerdict
    report.admin_strengths = body.adminStrengths
    report.admin_risks = body.adminRisks
    report.approval_note = body.approvalNote
    report.reviewed_by = "admin"
    report.reviewed_at = datetime.now(timezone.utc)
    report.score = body.adminScore

    # The client portal renders GO/PIVOT from `decision`, so the admin's
    # verdict has to be recorded there too — otherwise an approved report
    # shows as "CONDITIONAL" no matter what the reviewer decided. An explicit
    # verdict wins; without one, fall back to the 60-point threshold the
    # scoring engine uses.
    verdict = (body.adminVerdict or "").strip().upper()
    if verdict in ("GO", "PROCEED"):
        report.decision = 1
    elif verdict in ("PIVOT", "NO", "NO-GO", "NO GO"):
        report.decision = 0
    else:
        report.decision = 1 if body.adminScore >= 60 else 0

    assert_transition(report.status, "PUBLISHED")
    report.status = "PUBLISHED"
    report.action = "DELIVERED"

    db.commit()
    db.refresh(report)

    client = db.query(ClientModel).filter(ClientModel.id == report.client_id).first()

    email_result = send_report_email(report.to_json(), client.to_json() if client else None)

    return {"report": report.to_json(), "email": email_result}
