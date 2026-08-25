"""Client document upload — files supporting a venture submission.

Bytes are written to server_python/uploads/ under a collision-free name;
the database keeps only metadata. Uploads are additive to the report
pipeline: nothing here touches report state or the admin review flow.
"""
import os
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from auth import is_admin, owner_email, require_user
from database import get_db
from errors import ApiError
from models import DocumentModel

router = APIRouter(prefix="/api", tags=["documents"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_BYTES = 15 * 1024 * 1024  # 15 MB per file
ALLOWED_SUFFIXES = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".csv", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp", ".zip",
}
CATEGORIES = {"PITCH_DECK", "FINANCIALS", "REGISTRATION", "MARKET_RESEARCH", "SUPPORTING"}

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_name(name: str) -> str:
    """Strip anything that could escape the upload directory."""
    cleaned = _SAFE.sub("_", Path(name or "file").name).strip("._") or "file"
    return cleaned[:120]


@router.post("/documents", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    reportId: Optional[str] = Form(None),
    clientId: Optional[str] = Form(None),
    category: str = Form("SUPPORTING"),
    note: Optional[str] = Form(None),
    uploadedBy: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    # The uploader is whoever is signed in. The form field is ignored for
    # clients so a file cannot be attributed to somebody else.
    if not is_admin(user):
        uploadedBy = owner_email(user)
    original = _safe_name(file.filename or "file")
    suffix = Path(original).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ApiError.bad_request(
            f'File type "{suffix or "unknown"}" is not accepted. '
            f'Allowed: {", ".join(sorted(ALLOWED_SUFFIXES))}'
        )

    payload = await file.read()
    if len(payload) > MAX_BYTES:
        raise ApiError.bad_request(
            f"File is {round(len(payload) / 1024 / 1024, 1)} MB — the limit is 15 MB."
        )
    if not payload:
        raise ApiError.bad_request("The uploaded file is empty.")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    (UPLOAD_DIR / stored_name).write_bytes(payload)

    doc = DocumentModel(
        id=f"doc_{uuid.uuid4().hex[:12]}",
        report_id=reportId or None,
        client_id=clientId or None,
        filename=original,
        stored_name=stored_name,
        content_type=file.content_type,
        size_bytes=len(payload),
        category=category if category in CATEGORIES else "SUPPORTING",
        note=(note or "").strip() or None,
        uploaded_by=(uploadedBy or "").strip().lower() or None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"document": doc.to_json()}


@router.get("/documents")
def list_documents(
    reportId: Optional[str] = None,
    uploadedBy: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    query = db.query(DocumentModel)
    # Clients see only their own uploads, whatever they ask for.
    if not is_admin(user):
        uploadedBy = owner_email(user)
        if not uploadedBy:
            return {"documents": [], "total": 0}
    if reportId:
        query = query.filter(DocumentModel.report_id == reportId)
    if uploadedBy:
        query = query.filter(DocumentModel.uploaded_by == uploadedBy.strip().lower())
    rows = query.order_by(DocumentModel.created_at.desc()).all()
    return {"documents": [d.to_json() for d in rows], "total": len(rows)}


@router.get("/documents/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db),
                      user=Depends(require_user)):
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise ApiError.not_found("Document")
    if not is_admin(user) and (doc.uploaded_by or "") != owner_email(user):
        raise ApiError(403, "This document belongs to another account.")
    path = UPLOAD_DIR / doc.stored_name
    if not path.exists():
        raise ApiError.not_found("Stored file")
    return FileResponse(
        path,
        media_type=doc.content_type or "application/octet-stream",
        filename=doc.filename,
    )


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db),
                    user=Depends(require_user)):
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise ApiError.not_found("Document")
    if not is_admin(user) and (doc.uploaded_by or "") != owner_email(user):
        raise ApiError(403, "This document belongs to another account.")
    try:
        os.remove(UPLOAD_DIR / doc.stored_name)
    except OSError:
        pass  # metadata still goes, the orphaned blob is harmless
    db.delete(doc)
    db.commit()
    return Response(status_code=204)
