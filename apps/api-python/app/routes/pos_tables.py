"""
POS Tables — Stollar boshqaruvi
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PosTable
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-tables"])


class TableCreate(BaseModel):
    name: str
    capacity: int = 4
    sort_order: int = 0

class TableUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


def _table_dict(t: PosTable) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "capacity": t.capacity,
        "status": t.status,
        "qrCode": t.qr_code,
        "sortOrder": t.sort_order,
        "isActive": t.is_active,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("/pos/tables")
def list_tables(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    tables = db.query(PosTable).filter(PosTable.business_id == bid).order_by(PosTable.sort_order).all()
    return {"success": True, "data": [_table_dict(t) for t in tables]}


@router.get("/pos/tables/{tid}")
def get_table(tid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    t = db.query(PosTable).filter(PosTable.id == tid, PosTable.business_id == bid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    return {"success": True, "data": _table_dict(t)}


@router.post("/pos/tables")
def create_table(data: TableCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    t = PosTable(
        business_id=bid, name=data.name, capacity=data.capacity,
        sort_order=data.sort_order, qr_code=str(uuid.uuid4())[:8],
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"success": True, "data": _table_dict(t)}


@router.put("/pos/tables/{tid}")
def update_table(tid: int, data: TableUpdate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    t = db.query(PosTable).filter(PosTable.id == tid, PosTable.business_id == bid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    if data.name is not None: t.name = data.name
    if data.capacity is not None: t.capacity = data.capacity
    if data.sort_order is not None: t.sort_order = data.sort_order
    if data.is_active is not None: t.is_active = data.is_active
    db.commit()
    return {"success": True, "data": _table_dict(t)}


@router.patch("/pos/tables/{tid}/status")
def update_status(tid: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    t = db.query(PosTable).filter(PosTable.id == tid, PosTable.business_id == bid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    new_status = data.get("status", "")
    valid = ["FREE", "OCCUPIED", "RESERVED", "CLEANING"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri status. Ruxsat: {valid}")
    t.status = new_status
    db.commit()
    return {"success": True, "data": _table_dict(t)}


@router.delete("/pos/tables/{tid}")
def delete_table(tid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    t = db.query(PosTable).filter(PosTable.id == tid, PosTable.business_id == bid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    db.delete(t)
    db.commit()
    return {"success": True}
