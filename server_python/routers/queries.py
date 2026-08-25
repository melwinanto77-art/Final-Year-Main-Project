"""Client queries and admin responses.

A client raises a question; an admin answers it; the client reads the
answer back on their dashboard. Independent of the report pipeline, so
nothing here can affect report tracking or review.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import is_admin, owner_email, require_admin, require_user
from database import get_db
from errors import ApiError
from models import QueryModel

router = APIRouter(prefix="/api", tags=["queries"])

STATUSES = ("OPEN", "IN_REVIEW", "ANSWERED")


class QueryCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10)
    category: str = "General"
    reportId: Optional[str] = None
    clientEmail: Optional[str] = None
    clientName: Optional[str] = None


class QueryRespond(BaseModel):
    response: str = Field(min_length=1)
    respondedBy: Optional[str] = "admin"
    status: str = "ANSWERED"


@router.post("/queries", status_code=201)
def create_query(body: QueryCreate, db: Session = Depends(get_db),
                 user=Depends(require_user)):
    # A client can only raise a query as themselves.
    if not is_admin(user):
        body.clientEmail = owner_email(user)
    q = QueryModel(
        id=f"q_{uuid.uuid4().hex[:12]}",
        report_id=body.reportId or None,
        client_email=(body.clientEmail or "").strip().lower() or None,
        client_name=(body.clientName or "").strip() or None,
        subject=body.subject.strip(),
        category=(body.category or "General").strip(),
        message=body.message.strip(),
        status="OPEN",
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"query": q.to_json()}


@router.get("/queries")
def list_queries(
    clientEmail: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    query = db.query(QueryModel)
    # Clients only ever receive their own thread — previously any email could
    # be passed to read somebody else's.
    if not is_admin(user):
        clientEmail = owner_email(user)
        if not clientEmail:
            return {"queries": [], "total": 0}
    if clientEmail:
        query = query.filter(QueryModel.client_email == clientEmail.strip().lower())
    if status:
        if status not in STATUSES:
            raise ApiError.bad_request(
                f'Unknown status "{status}". Expected one of: {", ".join(STATUSES)}'
            )
        query = query.filter(QueryModel.status == status)
    rows = query.order_by(QueryModel.created_at.desc()).all()
    return {"queries": [q.to_json() for q in rows], "total": len(rows)}


@router.post("/queries/{query_id}/respond")
def respond_to_query(query_id: str, body: QueryRespond, db: Session = Depends(get_db),
                     user=Depends(require_admin)):
    q = db.query(QueryModel).filter(QueryModel.id == query_id).first()
    if not q:
        raise ApiError.not_found("Query")
    if body.status not in STATUSES:
        raise ApiError.bad_request(
            f'Unknown status "{body.status}". Expected one of: {", ".join(STATUSES)}'
        )

    q.response = body.response.strip()
    q.responded_by = (body.respondedBy or "admin").strip()
    q.responded_at = datetime.now(timezone.utc)
    q.status = body.status
    db.commit()
    db.refresh(q)
    return {"query": q.to_json()}


@router.delete("/queries/{query_id}", status_code=204)
def delete_query(query_id: str, db: Session = Depends(get_db),
                 user=Depends(require_admin)):
    from fastapi.responses import Response

    q = db.query(QueryModel).filter(QueryModel.id == query_id).first()
    if not q:
        raise ApiError.not_found("Query")
    db.delete(q)
    db.commit()
    return Response(status_code=204)
