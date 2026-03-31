"""
POS Orders — Buyurtmalar boshqaruvi
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models import PosOrder, PosOrderItem, PosPayment, PosCustomer
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-orders"])


class OrderItemIn(BaseModel):
    productId: int
    productName: str = ""
    variantId: int | None = None
    quantity: int = 1
    price: float = 0
    note: str = ""
    modifiers: list[dict] | None = None

class OrderCreate(BaseModel):
    tableId: int | None = None
    customerId: int | None = None
    customerName: str = ""
    customerPhone: str = ""
    orderType: str = "DINE_IN"
    items: list[OrderItemIn]
    paymentMethod: str = "CASH"
    discount: float = 0
    note: str = ""

class PaymentIn(BaseModel):
    amount: float
    method: str = "CASH"
    reference: str = ""


def _next_order_number(db: Session, bid: int) -> str:
    last = db.query(PosOrder).filter(PosOrder.business_id == bid).order_by(desc(PosOrder.id)).first()
    num = (last.id + 1) if last else 1
    return f"ORD-{bid}-{num:04d}"


def _order_dict(o: PosOrder, items: list | None = None) -> dict:
    result = {
        "id": str(o.id),
        "orderNumber": o.order_number,
        "tableId": o.table_id,
        "customerId": o.customer_id,
        "customerName": o.customer_name,
        "customerPhone": o.customer_phone,
        "orderType": o.order_type,
        "source": o.source,
        "status": o.status,
        "subtotal": o.subtotal,
        "tax": o.tax,
        "discount": o.discount,
        "total": o.total,
        "paymentMethod": o.payment_method,
        "paymentStatus": o.payment_status,
        "note": o.note,
        "createdBy": o.created_by,
        "createdAt": o.created_at.isoformat() if o.created_at else None,
        "completedAt": o.completed_at.isoformat() if o.completed_at else None,
    }
    if items is not None:
        result["items"] = [{
            "id": str(it.id), "productId": it.product_id, "productName": it.product_name,
            "quantity": it.quantity, "price": it.price, "total": it.total,
            "status": it.status, "note": it.note,
        } for it in items]
    return result


@router.get("/pos/orders")
def list_orders(
    status: str | None = None,
    date: str | None = None,
    page: int = 1,
    limit: int = 50,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    bid = _business_id_from_header(authorization)
    q = db.query(PosOrder).filter(PosOrder.business_id == bid)
    if status:
        q = q.filter(PosOrder.status == status)
    if date:
        q = q.filter(func.date(PosOrder.created_at) == date)
    total = q.count()
    orders = q.order_by(desc(PosOrder.created_at)).offset((page - 1) * limit).limit(limit).all()
    return {"success": True, "data": [_order_dict(o) for o in orders], "total": total}


@router.get("/pos/orders/kitchen")
def kitchen_orders(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    orders = db.query(PosOrder).filter(
        PosOrder.business_id == bid, PosOrder.status.in_(["NEW", "PREPARING"])
    ).order_by(PosOrder.created_at).all()
    result = []
    for o in orders:
        items = db.query(PosOrderItem).filter(PosOrderItem.order_id == o.id).all()
        result.append(_order_dict(o, items))
    return {"success": True, "data": result}


@router.get("/pos/orders/{oid}")
def get_order(oid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    items = db.query(PosOrderItem).filter(PosOrderItem.order_id == o.id).all()
    return {"success": True, "data": _order_dict(o, items)}


@router.post("/pos/orders")
def create_order(data: OrderCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    if not data.items:
        raise HTTPException(status_code=400, detail="Buyurtmada mahsulot bo'lishi kerak")

    subtotal = sum(it.price * it.quantity for it in data.items)
    total = subtotal - data.discount

    o = PosOrder(
        business_id=bid, order_number=_next_order_number(db, bid),
        table_id=data.tableId, customer_id=data.customerId,
        customer_name=data.customerName, customer_phone=data.customerPhone,
        order_type=data.orderType, source="POS", status="NEW",
        subtotal=round(subtotal, 2), discount=data.discount, total=round(total, 2),
        payment_method=data.paymentMethod, note=data.note,
        items_json=json.dumps([it.model_dump() for it in data.items]),
    )
    db.add(o)
    db.flush()

    for it in data.items:
        oi = PosOrderItem(
            order_id=o.id, product_id=it.productId, product_name=it.productName,
            variant_id=it.variantId, quantity=it.quantity, price=it.price,
            total=round(it.price * it.quantity, 2), note=it.note,
            modifiers_json=json.dumps(it.modifiers or []),
        )
        db.add(oi)

    db.commit()
    db.refresh(o)
    items = db.query(PosOrderItem).filter(PosOrderItem.order_id == o.id).all()
    return {"success": True, "data": _order_dict(o, items)}


@router.patch("/pos/orders/{oid}/status")
def update_status(oid: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    new_status = data.get("status", "")
    valid = ["NEW", "PREPARING", "READY", "SERVED", "PAID", "COMPLETED", "CANCELLED"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri status. Ruxsat: {valid}")
    o.status = new_status
    if new_status in ("COMPLETED", "PAID"):
        o.completed_at = datetime.now()
        o.payment_status = "COMPLETED"
    elif new_status == "CANCELLED":
        o.payment_status = "FAILED"
    db.commit()
    return {"success": True, "data": _order_dict(o)}


@router.patch("/pos/orders/{oid}/items/{item_id}/status")
def update_item_status(oid: int, item_id: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    it = db.query(PosOrderItem).filter(PosOrderItem.id == item_id, PosOrderItem.order_id == oid).first()
    if not it:
        raise HTTPException(status_code=404, detail="Element topilmadi")
    it.status = data.get("status", it.status)
    db.commit()
    return {"success": True}


@router.post("/pos/orders/{oid}/items")
def add_items(oid: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    for it in data.get("items", []):
        qty = it.get("quantity", 1)
        price = it.get("price", 0)
        oi = PosOrderItem(
            order_id=oid, product_id=it.get("productId", 0), product_name=it.get("productName", ""),
            quantity=qty, price=price, total=round(price * qty, 2),
        )
        db.add(oi)
        o.subtotal += oi.total
        o.total = o.subtotal - o.discount
    db.commit()
    return {"success": True, "data": _order_dict(o)}


@router.post("/pos/orders/{oid}/payment")
def record_payment(oid: int, data: PaymentIn, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    p = PosPayment(business_id=bid, order_id=oid, amount=data.amount, method=data.method, reference=data.reference)
    db.add(p)
    o.payment_status = "COMPLETED"
    o.payment_method = data.method
    if o.status in ("NEW", "PREPARING", "READY", "SERVED"):
        o.status = "PAID"
        o.completed_at = datetime.now()
    # Mijoz statistikasini yangilash
    if o.customer_id:
        cust = db.query(PosCustomer).filter(PosCustomer.id == o.customer_id).first()
        if cust:
            cust.total_orders += 1
            cust.total_spent += data.amount
            cust.last_order_at = datetime.now()
    db.commit()
    return {"success": True, "data": {"paymentId": str(p.id), "orderStatus": o.status}}


@router.delete("/pos/orders/{oid}")
def cancel_order(oid: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    o = db.query(PosOrder).filter(PosOrder.id == oid, PosOrder.business_id == bid).first()
    if not o:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    o.status = "CANCELLED"
    db.commit()
    return {"success": True}
