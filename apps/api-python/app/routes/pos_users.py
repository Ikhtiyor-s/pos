"""
POS Users — Foydalanuvchilar boshqaruvi (xodimlar, rollar)
"""
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosUser
from ..auth import business_id_from_header as _business_id_from_header, sha256_hash as _hash

router = APIRouter(tags=["pos-users"])


class UserCreate(BaseModel):
    email: str = ""
    first_name: str
    last_name: str = ""
    phone: str = ""
    password: str
    role: str = "CASHIER"

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str | None = None
    password: str | None = None
    is_active: bool | None = None


def _user_dict(u: PosUser) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "firstName": u.first_name,
        "lastName": u.last_name,
        "name": f"{u.first_name} {u.last_name}".strip(),
        "phone": u.phone,
        "role": u.role,
        "isActive": u.is_active,
        "createdAt": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("/pos/users")
def list_users(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    users = db.query(PosUser).filter(PosUser.business_id == bid).order_by(desc(PosUser.created_at)).all()
    return {"success": True, "data": [_user_dict(u) for u in users]}


@router.get("/pos/users/{uid}")
def get_user(uid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    u = db.query(PosUser).filter(PosUser.id == uid, PosUser.business_id == bid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return {"success": True, "data": _user_dict(u)}


@router.post("/pos/users")
def create_user(data: UserCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Parol kamida 6 ta belgidan iborat bo'lishi kerak")
    u = PosUser(
        business_id=bid, email=data.email, first_name=data.first_name,
        last_name=data.last_name, phone=data.phone,
        password_hash=_hash(data.password), role=data.role, is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"success": True, "data": _user_dict(u)}


@router.put("/pos/users/{uid}")
def update_user(uid: int, data: UserUpdate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    u = db.query(PosUser).filter(PosUser.id == uid, PosUser.business_id == bid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if data.first_name is not None: u.first_name = data.first_name
    if data.last_name is not None: u.last_name = data.last_name
    if data.phone is not None: u.phone = data.phone
    if data.email is not None: u.email = data.email
    if data.role is not None: u.role = data.role
    if data.is_active is not None: u.is_active = data.is_active
    if data.password is not None:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        u.password_hash = _hash(data.password)
    db.commit()
    return {"success": True, "data": _user_dict(u)}


@router.patch("/pos/users/{uid}/toggle")
def toggle_user(uid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    u = db.query(PosUser).filter(PosUser.id == uid, PosUser.business_id == bid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    u.is_active = not u.is_active
    db.commit()
    return {"success": True, "data": _user_dict(u)}


@router.delete("/pos/users/{uid}")
def delete_user(uid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    u = db.query(PosUser).filter(PosUser.id == uid, PosUser.business_id == bid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    db.delete(u)
    db.commit()
    return {"success": True}
