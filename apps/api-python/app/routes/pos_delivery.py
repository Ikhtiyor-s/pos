"""
POS Delivery — Yetkazib berish boshqaruvi
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosDelivery, PosOrder
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-delivery"])


class DriverCreate(BaseModel):
    name: str
    phone: str = ""

class DeliveryCreate(BaseModel):
    order_id: int
    address: str = ""
    driver_id: int | None = None


# ─── Drivers (PosUser role=DRIVER yoki alohida jadval) ───
# Hozircha oddiy dict sifatida — keyinchalik PosDriver modeldan

@router.get("/pos/delivery")
def list_deliveries(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    deliveries = db.query(PosDelivery).filter(PosDelivery.business_id == bid).order_by(desc(PosDelivery.created_at)).limit(50).all()
    return {"success": True, "data": [_del_dict(d) for d in deliveries]}

@router.get("/pos/delivery/active")
def active_deliveries(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    deliveries = db.query(PosDelivery).filter(
        PosDelivery.business_id == bid,
        PosDelivery.status.in_(["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"])
    ).order_by(PosDelivery.created_at).all()
    return {"success": True, "data": [_del_dict(d) for d in deliveries]}

@router.get("/pos/delivery/{did}")
def get_delivery(did: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    d = db.query(PosDelivery).filter(PosDelivery.id == did, PosDelivery.business_id == bid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Topilmadi")
    return {"success": True, "data": _del_dict(d)}

@router.post("/pos/delivery")
def create_delivery(data: DeliveryCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    d = PosDelivery(business_id=bid, order_id=data.order_id, address=data.address, driver_id=data.driver_id, status="PENDING")
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"success": True, "data": _del_dict(d)}

@router.patch("/pos/delivery/{did}/assign")
def assign_driver(did: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    d = db.query(PosDelivery).filter(PosDelivery.id == did, PosDelivery.business_id == bid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Topilmadi")
    d.driver_id = data.get("driverId")
    d.status = "ASSIGNED"
    db.commit()
    return {"success": True, "data": _del_dict(d)}

@router.patch("/pos/delivery/{did}/pickup")
def mark_pickup(did: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    d = db.query(PosDelivery).filter(PosDelivery.id == did, PosDelivery.business_id == bid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Topilmadi")
    d.status = "PICKED_UP"
    db.commit()
    return {"success": True, "data": _del_dict(d)}

@router.patch("/pos/delivery/{did}/delivered")
def mark_delivered(did: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    d = db.query(PosDelivery).filter(PosDelivery.id == did, PosDelivery.business_id == bid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Topilmadi")
    d.status = "DELIVERED"
    d.delivered_at = datetime.now()
    db.commit()
    return {"success": True, "data": _del_dict(d)}

@router.get("/pos/delivery/stats")
def delivery_stats(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    total = db.query(PosDelivery).filter(PosDelivery.business_id == bid).count()
    active = db.query(PosDelivery).filter(PosDelivery.business_id == bid, PosDelivery.status.in_(["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"])).count()
    delivered = db.query(PosDelivery).filter(PosDelivery.business_id == bid, PosDelivery.status == "DELIVERED").count()
    return {"success": True, "data": {"total": total, "active": active, "delivered": delivered}}


def _del_dict(d: PosDelivery) -> dict:
    return {
        "id": str(d.id), "orderId": d.order_id, "driverId": d.driver_id,
        "address": d.address, "status": d.status,
        "deliveredAt": d.delivered_at.isoformat() if d.delivered_at else None,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
    }
