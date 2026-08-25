"""AI report assessment for the admin review screen.

Runs the analyst over everything the platform holds about a venture and
stores the result on the report. It deliberately does NOT touch
report.score, report.decision or report.status — the mark it returns is a
recommendation, and the admin's submitted score is still what publishes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from errors import ApiError
from integrations.report_ai import generate_report_assessment
from models import BrandEquityModel, ClientModel, DocumentModel, ModuleResultModel, ReportModel
from strength import data_band, score_band

router = APIRouter(prefix="/api", tags=["assessment"])


def _report_payload(db: Session, report: ReportModel):
    client = (
        db.query(ClientModel).filter(ClientModel.id == report.client_id).first()
        if report.client_id else None
    )
    payload = report.to_json(client=client)
    payload["dataBand"] = data_band(payload)
    payload["scoreBand"] = score_band(payload.get("adminScore") or payload.get("score") or 0)
    return payload


@router.post("/reports/{report_id}/ai-assessment")
def run_ai_assessment(report_id: str, db: Session = Depends(get_db),
                      user=Depends(require_admin)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise ApiError.not_found(f"Report {report_id}")

    module_results = (
        db.query(ModuleResultModel).filter(ModuleResultModel.report_id == report_id).all()
    )
    if not module_results:
        raise ApiError.conflict(
            "No modules have run for this report yet. Process it first, then request the "
            "AI assessment so the analyst has scores to review."
        )

    documents = [
        {
            "filename": d.filename,
            "category": d.category,
            "sizeBytes": d.size_bytes,
            "note": d.note,
        }
        for d in db.query(DocumentModel).filter(DocumentModel.report_id == report_id).all()
    ]

    brand = (
        db.query(BrandEquityModel).filter(BrandEquityModel.report_id == report_id).first()
    )

    assessment = generate_report_assessment(
        _report_payload(db, report),
        module_results,
        documents=documents,
        brand_equity=brand.to_json() if brand else None,
    )

    # Stored for the audit trail and so reopening the review shows the same
    # recommendation. Reassign — SQLAlchemy JSON columns are not
    # mutation-tracked. Nothing about the report's own score or status changes.
    report.orbita_analysis = {**(assessment or {}), "kind": "ai-assessment"}
    db.commit()

    return {"assessment": assessment}
