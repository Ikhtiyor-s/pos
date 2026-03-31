"""
POS Customers — Mijozlar boshqaruvi
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosCustomer
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-customers"])


class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""

class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


def _cust_dict(c: PosCustomer) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "address": c.address,
        "totalOrders": c.total_orders,
        "totalSpent": c.total_spent,
        "loyaltyPoints": c.loyalty_points,
        "lastOrderAt": c.last_order_at.isoformat() if c.last_order_at else None,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/pos/customers")
def list_customers(
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    bid = _business_id_from_header(authorization)
    q = db.query(PosCustomer).filter(PosCustomer.business_id == bid)
    if search:
        q = q.filter(PosCustomer.name.ilike(f"%{search}%") | PosCustomer.phone.ilike(f"%{search}%"))
    total = q.count()
    customers = q.order_by(desc(PosCustomer.created_at)).offset((page - 1) * limit).limit(limit).all()
    return {"success": True, "data": [_cust_dict(c) for c in customers], "total": total}


@router.get("/pos/customers/{cid}")
def get_customer(cid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = db.query(PosCustomer).filter(PosCustomer.id == cid, PosCustomer.business_id == bid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    return {"success": True, "data": _cust_dict(c)}


@router.post("/pos/customers")
def create_customer(data: CustomerCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    if data.phone:
        existing = db.query(PosCustomer).filter(PosCustomer.business_id == bid, PosCustomer.phone == data.phone).first()
        if existing:
            raise HTTPException(status_code=409, detail="Bu telefon raqam allaqachon mavjud")
    c = PosCustomer(business_id=bid, name=data.name, phone=data.phone, email=data.email, address=data.address)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "data": _cust_dict(c)}


@router.put("/pos/customers/{cid}")
def update_customer(cid: int, data: CustomerUpdate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = db.query(PosCustomer).filter(PosCustomer.id == cid, PosCustomer.business_id == bid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    if data.name is not None: c.name = data.name
    if data.phone is not None: c.phone = data.phone
    if data.email is not None: c.email = data.email
    if data.address is not None: c.address = data.address
    db.commit()
    return {"success": True, "data": _cust_dict(c)}


@router.delete("/pos/customers/{cid}")
def delete_customer(cid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = db.query(PosCustomer).filter(PosCustomer.id == cid, PosCustomer.business_id == bid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    db.delete(c)
    db.commit()
    return {"success": True}
