"""Indian Brand Equity assessment.

Collects the five equity pillars plus behavioural proof, scores them with
strength.brand_equity_score(), and bands the result WEAK / MEDIUM / STRONG.
Stored per venture so the admin sees it alongside the report.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import is_admin, owner_email, require_user
from database import get_db
from errors import ApiError
from models import BrandEquityModel
from strength import band_for, brand_equity_score

router = APIRouter(prefix="/api", tags=["brand-equity"])


class BrandEquityCreate(BaseModel):
    brandName: str = Field(min_length=1, max_length=200)
    reportId: Optional[str] = None
    clientEmail: Optional[str] = None
    category: Optional[str] = None
    homeState: Optional[str] = None
    yearsActive: Optional[float] = Field(default=0, ge=0)
    languages: List[str] = []

    # The five pillars, 0-100 each.
    awareness: int = Field(default=0, ge=0, le=100)
    perceivedQuality: int = Field(default=0, ge=0, le=100)
    associations: int = Field(default=0, ge=0, le=100)
    loyalty: int = Field(default=0, ge=0, le=100)
    distributionReach: int = Field(default=0, ge=0, le=100)

    monthlyCustomers: int = Field(default=0, ge=0)
    repeatRate: int = Field(default=0, ge=0, le=100)
    socialFollowing: int = Field(default=0, ge=0)
    certifications: Optional[str] = None
    differentiator: Optional[str] = None


@router.post("/brand-equity", status_code=201)
def submit_brand_equity(body: BrandEquityCreate, db: Session = Depends(get_db),
                        user=Depends(require_user)):
    # Assessments are filed under the signed-in account.
    if not is_admin(user):
        body.clientEmail = owner_email(user)
    pillars = {
        "awareness": body.awareness,
        "perceivedQuality": body.perceivedQuality,
        "associations": body.associations,
        "loyalty": body.loyalty,
        "distributionReach": body.distributionReach,
    }
    scored = brand_equity_score(
        pillars,
        repeat_rate=body.repeatRate,
        monthly_customers=body.monthlyCustomers,
        social_following=body.socialFollowing,
        years_active=body.yearsActive,
        certifications=body.certifications,
        return_detail=True,
    )
    score = scored['score']

    # Re-submitting for the same report updates the existing assessment
    # rather than stacking duplicates.
    existing = None
    if body.reportId:
        existing = (
            db.query(BrandEquityModel)
            .filter(BrandEquityModel.report_id == body.reportId)
            .first()
        )
    record = existing or BrandEquityModel(id=f"be_{uuid.uuid4().hex[:12]}")

    record.report_id = body.reportId or None
    record.client_email = (body.clientEmail or "").strip().lower() or None
    record.brand_name = body.brandName.strip()
    record.category = (body.category or "").strip() or None
    record.home_state = (body.homeState or "").strip() or None
    record.years_active = body.yearsActive or 0
    record.languages = body.languages or []
    record.awareness = body.awareness
    record.perceived_quality = body.perceivedQuality
    record.associations = body.associations
    record.loyalty = body.loyalty
    record.distribution_reach = body.distributionReach
    record.monthly_customers = body.monthlyCustomers
    record.repeat_rate = body.repeatRate
    record.social_following = body.socialFollowing
    record.certifications = (body.certifications or "").strip() or None
    record.differentiator = (body.differentiator or "").strip() or None
    record.equity_score = score
    record.evidence_caps = scored['caps']
    record.strength_band = band_for(score)

    if existing is None:
        db.add(record)
    db.commit()
    db.refresh(record)
    return {"brandEquity": record.to_json()}


@router.get("/brand-equity")
def list_brand_equity(
    reportId: Optional[str] = None,
    clientEmail: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    query = db.query(BrandEquityModel)
    if not is_admin(user):
        clientEmail = owner_email(user)
        if not clientEmail:
            return {"assessments": [], "total": 0}
    if reportId:
        query = query.filter(BrandEquityModel.report_id == reportId)
    if clientEmail:
        query = query.filter(BrandEquityModel.client_email == clientEmail.strip().lower())
    rows = query.order_by(BrandEquityModel.created_at.desc()).all()
    return {"assessments": [r.to_json() for r in rows], "total": len(rows)}


@router.delete("/brand-equity/{assessment_id}", status_code=204)
def delete_brand_equity(assessment_id: str, db: Session = Depends(get_db),
                        user=Depends(require_user)):
    record = db.query(BrandEquityModel).filter(BrandEquityModel.id == assessment_id).first()
    if not record:
        raise ApiError.not_found("Brand equity assessment")
    db.delete(record)
    db.commit()
    return Response(status_code=204)
