"""
POS Reservations — Bron boshqaruvi
"""
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosReservation, PosTable
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-reservations"])


class ReservationCreate(BaseModel):
    table_id: int | None = None
    customer_name: str
    customer_phone: str = ""
    guest_count: int = 2
    reservation_time: str  # ISO format
    note: str = ""


def _res_dict(r: PosReservation) -> dict:
    return {
        "id": str(r.id), "tableId": r.table_id, "customerName": r.customer_name,
        "customerPhone": r.customer_phone, "guestCount": r.guest_count,
        "reservationTime": r.reservation_time.isoformat() if r.reservation_time else None,
        "status": r.status, "code": r.code, "note": r.note,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/pos/reservations")
def list_reservations(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    reservations = db.query(PosReservation).filter(PosReservation.business_id == bid).order_by(desc(PosReservation.reservation_time)).limit(50).all()
    return {"success": True, "data": [_res_dict(r) for r in reservations]}

@router.get("/pos/reservations/today")
def today_reservations(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    reservations = db.query(PosReservation).filter(
        PosReservation.business_id == bid,
        PosReservation.reservation_time >= today_start,
        PosReservation.reservation_time < today_end,
    ).order_by(PosReservation.reservation_time).all()
    return {"success": True, "data": [_res_dict(r) for r in reservations]}

@router.get("/pos/reservations/{rid}")
def get_reservation(rid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    r = db.query(PosReservation).filter(PosReservation.id == rid, PosReservation.business_id == bid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    return {"success": True, "data": _res_dict(r)}

@router.post("/pos/reservations")
def create_reservation(data: ReservationCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    code = secrets.token_hex(3).upper()  # 6 belgili kod
    r = PosReservation(
        business_id=bid, table_id=data.table_id, customer_name=data.customer_name,
        customer_phone=data.customer_phone, guest_count=data.guest_count,
        reservation_time=datetime.fromisoformat(data.reservation_time),
        status="PENDING", code=code, note=data.note,
    )
    db.add(r)
    # Stol bron qilish
    if data.table_id:
        table = db.query(PosTable).filter(PosTable.id == data.table_id, PosTable.business_id == bid).first()
        if table:
            table.status = "RESERVED"
    db.commit()
    db.refresh(r)
    return {"success": True, "data": _res_dict(r)}

@router.patch("/pos/reservations/{rid}/confirm")
def confirm_reservation(rid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    r = db.query(PosReservation).filter(PosReservation.id == rid, PosReservation.business_id == bid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Topilmadi")
    r.status = "CONFIRMED"
    db.commit()
    return {"success": True, "data": _res_dict(r)}

@router.patch("/pos/reservations/{rid}/seat")
def seat_reservation(rid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    r = db.query(PosReservation).filter(PosReservation.id == rid, PosReservation.business_id == bid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Topilmadi")
    r.status = "SEATED"
    if r.table_id:
        table = db.query(PosTable).filter(PosTable.id == r.table_id).first()
        if table:
            table.status = "OCCUPIED"
    db.commit()
    return {"success": True, "data": _res_dict(r)}

@router.patch("/pos/reservations/{rid}/cancel")
def cancel_reservation(rid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    r = db.query(PosReservation).filter(PosReservation.id == rid, PosReservation.business_id == bid).first()
    if not r:
        raise HTTPException(status_code=404, detail="Topilmadi")
    r.status = "CANCELLED"
    if r.table_id:
        table = db.query(PosTable).filter(PosTable.id == r.table_id).first()
        if table and table.status == "RESERVED":
            table.status = "FREE"
    db.commit()
    return {"success": True, "data": _res_dict(r)}

@router.get("/pos/reservations/lookup/{code}")
def lookup_reservation(code: str, db: Session = Depends(get_db)):
    """PUBLIC — kod bo'yicha bron qidirish"""
    r = db.query(PosReservation).filter(PosReservation.code == code).first()
    if not r:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    return {"success": True, "data": _res_dict(r)}
