"""
POS Notifications — Bildirishnomalar
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosNotification
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-notifications"])


@router.get("/pos/notifications")
def list_notifications(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    notifs = db.query(PosNotification).filter(PosNotification.business_id == bid).order_by(desc(PosNotification.created_at)).limit(50).all()
    return {"success": True, "data": [{
        "id": str(n.id), "type": n.type, "title": n.title, "message": n.message,
        "isRead": n.is_read, "createdAt": n.created_at.isoformat() if n.created_at else None,
    } for n in notifs]}

@router.get("/pos/notifications/unread-count")
def unread_count(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    count = db.query(PosNotification).filter(PosNotification.business_id == bid, PosNotification.is_read == False).count()
    return {"success": True, "data": {"count": count}}

@router.patch("/pos/notifications/{nid}/read")
def mark_read(nid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    n = db.query(PosNotification).filter(PosNotification.id == nid, PosNotification.business_id == bid).first()
    if not n: raise HTTPException(status_code=404, detail="Topilmadi")
    n.is_read = True
    db.commit()
    return {"success": True}

@router.patch("/pos/notifications/read-all")
def mark_all_read(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    db.query(PosNotification).filter(PosNotification.business_id == bid, PosNotification.is_read == False).update({"is_read": True})
    db.commit()
    return {"success": True}

@router.delete("/pos/notifications/old")
def delete_old(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(days=30)
    db.query(PosNotification).filter(PosNotification.business_id == bid, PosNotification.created_at < cutoff).delete()
    db.commit()
    return {"success": True}
