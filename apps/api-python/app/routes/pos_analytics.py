"""
POS Analytics — Dashboard statistika va hisobotlar
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import PosOrder, PosOrderItem, PosPayment
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-analytics"])


def _period_start(period: str) -> datetime:
    now = datetime.now()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/pos/dashboard")
def dashboard(
    period: str = "today",
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    bid = _business_id_from_header(authorization)
    start = _period_start(period)

    # Daromad
    revenue_row = db.query(func.sum(PosOrder.total)).filter(
        PosOrder.business_id == bid, PosOrder.status == "COMPLETED", PosOrder.created_at >= start
    ).scalar() or 0

    # Buyurtmalar
    total_orders = db.query(PosOrder).filter(PosOrder.business_id == bid, PosOrder.created_at >= start).count()
    completed = db.query(PosOrder).filter(PosOrder.business_id == bid, PosOrder.status == "COMPLETED", PosOrder.created_at >= start).count()
    avg_check = revenue_row / completed if completed > 0 else 0

    # Top mahsulotlar
    top_items = db.query(
        PosOrderItem.product_name,
        func.sum(PosOrderItem.quantity).label("qty"),
        func.sum(PosOrderItem.total).label("rev"),
    ).join(PosOrder, PosOrderItem.order_id == PosOrder.id).filter(
        PosOrder.business_id == bid, PosOrder.created_at >= start
    ).group_by(PosOrderItem.product_name).order_by(func.sum(PosOrderItem.quantity).desc()).limit(10).all()

    # So'nggi buyurtmalar
    recent = db.query(PosOrder).filter(PosOrder.business_id == bid).order_by(PosOrder.created_at.desc()).limit(5).all()

    return {
        "success": True,
        "data": {
            "revenue": {"total": round(revenue_row, 2), "averageCheck": round(avg_check, 2)},
            "orders": {"total": total_orders, "completed": completed},
            "topProducts": [{"name": r[0], "quantity": r[1], "revenue": round(r[2], 2)} for r in top_items],
            "recentOrders": [{
                "id": str(o.id), "orderNumber": o.order_number, "status": o.status,
                "total": o.total, "type": o.order_type,
                "createdAt": o.created_at.isoformat() if o.created_at else None,
            } for o in recent],
        },
    }


@router.get("/pos/analytics/daily-sales")
def daily_sales(
    days: int = 7,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    bid = _business_id_from_header(authorization)
    result = []
    for i in range(days - 1, -1, -1):
        day = datetime.now() - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        rev = db.query(func.sum(PosOrder.total)).filter(
            PosOrder.business_id == bid, PosOrder.status == "COMPLETED",
            PosOrder.created_at >= start, PosOrder.created_at < end,
        ).scalar() or 0
        cnt = db.query(PosOrder).filter(
            PosOrder.business_id == bid, PosOrder.created_at >= start, PosOrder.created_at < end,
        ).count()
        result.append({"date": start.strftime("%Y-%m-%d"), "revenue": round(rev, 2), "orders": cnt})
    return {"success": True, "data": result}
