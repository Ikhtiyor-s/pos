"""
POS Webhooks — Tashqi xizmatlardan webhook qabul qilish
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PosOrder, PosNotification
from ..auth import business_id_from_header as _business_id_from_header

logger = logging.getLogger(__name__)
router = APIRouter(tags=["pos-webhooks"])


@router.post("/pos/webhooks/receive/{service}")
async def receive_webhook(service: str, request: Request, db: Session = Depends(get_db)):
    """PUBLIC — tashqi xizmatlardan webhook qabul qilish"""
    body = await request.json()
    logger.info(f"[Webhook] {service}: {body}")

    if service == "nonbor":
        event = body.get("event", "")
        if event in ("order:new", "order.new"):
            # Yangi buyurtma keldi — notification yaratish
            order_id = body.get("data", {}).get("order_id")
            business_id = body.get("data", {}).get("business_id")
            if business_id:
                notif = PosNotification(
                    business_id=business_id, type="ORDER_NEW",
                    title="Yangi buyurtma", message=f"Nonbor dan yangi buyurtma #{order_id}",
                )
                db.add(notif)
                db.commit()
        elif event in ("order:status", "order.status"):
            order_id = body.get("data", {}).get("order_id")
            new_status = body.get("data", {}).get("status", "")
            if order_id:
                order = db.query(PosOrder).filter(PosOrder.id == order_id).first()
                if order:
                    order.status = new_status
                    db.commit()

    return {"success": True, "received": service}


@router.post("/pos/sync/orders")
def sync_orders(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    """Offline buyurtmalarni sync qilish"""
    bid = _business_id_from_header(authorization)
    orders = data.get("orders", [])
    synced = 0
    for o in orders:
        existing = db.query(PosOrder).filter(PosOrder.order_number == o.get("orderNumber"), PosOrder.business_id == bid).first()
        if not existing:
            order = PosOrder(
                business_id=bid, order_number=o.get("orderNumber", ""),
                order_type=o.get("type", "DINE_IN"), source=o.get("source", "POS"),
                status=o.get("status", "COMPLETED"), total=o.get("total", 0),
                payment_method=o.get("paymentMethod", "CASH"), payment_status="COMPLETED",
            )
            db.add(order)
            synced += 1
    db.commit()
    return {"success": True, "data": {"synced": synced}}


@router.get("/pos/sync/health")
def sync_health():
    """PUBLIC — sync endpoint mavjudligini tekshirish"""
    return {"success": True, "status": "online", "timestamp": datetime.now().isoformat()}
