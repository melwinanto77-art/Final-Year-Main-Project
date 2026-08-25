from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import ReportModel, ModuleResultModel
from integrations.orbita import generate_orbita_analysis
from errors import ApiError

router = APIRouter(prefix="/api", tags=["orbita"])


@router.post("/reports/{report_id}/orbita-analysis")
def run_orbita_analysis(report_id: str, db: Session = Depends(get_db),
                        user=Depends(require_admin)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise ApiError.not_found(f"Report {report_id}")

    module_results = db.query(ModuleResultModel).filter(
        ModuleResultModel.report_id == report_id
    ).all()

    if not module_results:
        raise ApiError.conflict(
            "No modules completed. Run at least one module before requesting Orbita analysis."
        )

    analysis = generate_orbita_analysis(report, module_results)

    # Store on report (reassign, don't mutate)
    report.orbita_analysis = analysis
    db.commit()
    db.refresh(report)

    return {"analysis": analysis}
