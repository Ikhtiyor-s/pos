"""
POS Inventory — Ombor boshqaruvi
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosInventoryItem, PosInventoryTransaction, PosSupplier
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-inventory"])


class ItemCreate(BaseModel):
    name: str
    unit: str = "kg"
    quantity: float = 0
    reorder_level: float = 0
    cost_per_unit: float = 0
    supplier_id: int | None = None

class ItemUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    quantity: float | None = None
    reorder_level: float | None = None
    cost_per_unit: float | None = None

class TransactionIn(BaseModel):
    type: str  # PURCHASE, SALE, ADJUSTMENT, WASTE
    quantity: float
    note: str = ""


def _item_dict(i: PosInventoryItem) -> dict:
    return {
        "id": str(i.id), "name": i.name, "unit": i.unit, "quantity": i.quantity,
        "reorderLevel": i.reorder_level, "costPerUnit": i.cost_per_unit,
        "supplierId": i.supplier_id, "image": i.image,
        "createdAt": i.created_at.isoformat() if i.created_at else None,
    }


@router.get("/pos/inventory")
def list_inventory(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    items = db.query(PosInventoryItem).filter(PosInventoryItem.business_id == bid).all()
    return {"success": True, "data": [_item_dict(i) for i in items]}


@router.get("/pos/inventory/low-stock")
def low_stock(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    items = db.query(PosInventoryItem).filter(
        PosInventoryItem.business_id == bid,
        PosInventoryItem.quantity <= PosInventoryItem.reorder_level,
    ).all()
    return {"success": True, "data": [_item_dict(i) for i in items]}


@router.get("/pos/inventory/{item_id}")
def get_item(item_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    i = db.query(PosInventoryItem).filter(PosInventoryItem.id == item_id, PosInventoryItem.business_id == bid).first()
    if not i:
        raise HTTPException(status_code=404, detail="Topilmadi")
    return {"success": True, "data": _item_dict(i)}


@router.post("/pos/inventory")
def create_item(data: ItemCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    i = PosInventoryItem(business_id=bid, name=data.name, unit=data.unit, quantity=data.quantity,
                         reorder_level=data.reorder_level, cost_per_unit=data.cost_per_unit, supplier_id=data.supplier_id)
    db.add(i)
    db.commit()
    db.refresh(i)
    return {"success": True, "data": _item_dict(i)}


@router.put("/pos/inventory/{item_id}")
def update_item(item_id: int, data: ItemUpdate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    i = db.query(PosInventoryItem).filter(PosInventoryItem.id == item_id, PosInventoryItem.business_id == bid).first()
    if not i:
        raise HTTPException(status_code=404, detail="Topilmadi")
    if data.name is not None: i.name = data.name
    if data.unit is not None: i.unit = data.unit
    if data.quantity is not None: i.quantity = data.quantity
    if data.reorder_level is not None: i.reorder_level = data.reorder_level
    if data.cost_per_unit is not None: i.cost_per_unit = data.cost_per_unit
    db.commit()
    return {"success": True, "data": _item_dict(i)}


@router.delete("/pos/inventory/{item_id}")
def delete_item(item_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    i = db.query(PosInventoryItem).filter(PosInventoryItem.id == item_id, PosInventoryItem.business_id == bid).first()
    if not i:
        raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(i)
    db.commit()
    return {"success": True}


@router.get("/pos/inventory/{item_id}/transactions")
def item_transactions(item_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    txns = db.query(PosInventoryTransaction).filter(
        PosInventoryTransaction.item_id == item_id, PosInventoryTransaction.business_id == bid
    ).order_by(desc(PosInventoryTransaction.created_at)).all()
    return {"success": True, "data": [{
        "id": str(t.id), "type": t.type, "quantity": t.quantity, "note": t.note,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
    } for t in txns]}


@router.post("/pos/inventory/{item_id}/transaction")
def add_transaction(item_id: int, data: TransactionIn, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    i = db.query(PosInventoryItem).filter(PosInventoryItem.id == item_id, PosInventoryItem.business_id == bid).first()
    if not i:
        raise HTTPException(status_code=404, detail="Topilmadi")

    txn = PosInventoryTransaction(item_id=item_id, business_id=bid, type=data.type, quantity=data.quantity, note=data.note)
    db.add(txn)

    if data.type in ("PURCHASE", "ADJUSTMENT") and data.quantity > 0:
        i.quantity += data.quantity
    elif data.type in ("SALE", "WASTE"):
        i.quantity = max(0, i.quantity - abs(data.quantity))

    db.commit()
    return {"success": True, "data": _item_dict(i)}
