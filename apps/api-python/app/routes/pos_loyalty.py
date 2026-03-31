"""
POS Loyalty — Bonus tizimi va kuponlar
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models import PosLoyaltyProgram, PosLoyaltyTransaction, PosCoupon, PosCustomer
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-loyalty"])


# ─── Loyalty Program ───

@router.get("/pos/loyalty/program")
def get_program(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    prog = db.query(PosLoyaltyProgram).filter(PosLoyaltyProgram.business_id == bid).first()
    if not prog:
        return {"success": True, "data": None}
    return {"success": True, "data": {
        "id": str(prog.id), "pointsPerSum": prog.points_per_sum,
        "redemptionRate": prog.redemption_rate, "isActive": prog.is_active,
    }}

@router.put("/pos/loyalty/program")
def setup_program(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    prog = db.query(PosLoyaltyProgram).filter(PosLoyaltyProgram.business_id == bid).first()
    if not prog:
        prog = PosLoyaltyProgram(business_id=bid)
        db.add(prog)
    prog.points_per_sum = data.get("pointsPerSum", 0.01)
    prog.redemption_rate = data.get("redemptionRate", 1.0)
    prog.is_active = data.get("isActive", True)
    db.commit()
    return {"success": True}


# ─── Loyalty Transactions ───

@router.get("/pos/loyalty/account/{customer_id}")
def get_account(customer_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    customer = db.query(PosCustomer).filter(PosCustomer.id == customer_id, PosCustomer.business_id == bid).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    txns = db.query(PosLoyaltyTransaction).filter(
        PosLoyaltyTransaction.customer_id == customer_id, PosLoyaltyTransaction.business_id == bid
    ).order_by(desc(PosLoyaltyTransaction.created_at)).limit(20).all()
    return {"success": True, "data": {
        "points": customer.loyalty_points,
        "transactions": [{"id": str(t.id), "type": t.type, "points": t.points, "createdAt": t.created_at.isoformat() if t.created_at else None} for t in txns],
    }}

@router.post("/pos/loyalty/earn")
def earn_points(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    customer = db.query(PosCustomer).filter(PosCustomer.id == data.get("customerId"), PosCustomer.business_id == bid).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    points = data.get("points", 0)
    txn = PosLoyaltyTransaction(customer_id=customer.id, business_id=bid, type="EARN", points=points, order_id=data.get("orderId"))
    db.add(txn)
    customer.loyalty_points += points
    db.commit()
    return {"success": True, "data": {"points": customer.loyalty_points}}

@router.post("/pos/loyalty/redeem")
def redeem_points(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    customer = db.query(PosCustomer).filter(PosCustomer.id == data.get("customerId"), PosCustomer.business_id == bid).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Mijoz topilmadi")
    points = data.get("points", 0)
    if customer.loyalty_points < points:
        raise HTTPException(status_code=400, detail="Ballar yetarli emas")
    txn = PosLoyaltyTransaction(customer_id=customer.id, business_id=bid, type="REDEEM", points=-points, order_id=data.get("orderId"))
    db.add(txn)
    customer.loyalty_points -= points
    db.commit()
    return {"success": True, "data": {"points": customer.loyalty_points}}

@router.get("/pos/loyalty/leaderboard")
def leaderboard(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    top = db.query(PosCustomer).filter(PosCustomer.business_id == bid).order_by(desc(PosCustomer.loyalty_points)).limit(10).all()
    return {"success": True, "data": [{"id": str(c.id), "name": c.name, "points": c.loyalty_points, "totalSpent": c.total_spent} for c in top]}


# ─── Coupons ───

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "PERCENTAGE"
    discount_value: float
    min_order: float = 0
    max_uses: int | None = None
    expires_at: str | None = None

@router.get("/pos/loyalty/coupons")
def list_coupons(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    coupons = db.query(PosCoupon).filter(PosCoupon.business_id == bid).all()
    return {"success": True, "data": [{
        "id": str(c.id), "code": c.code, "discountType": c.discount_type,
        "discountValue": c.discount_value, "minOrder": c.min_order,
        "maxUses": c.max_uses, "usedCount": c.used_count, "isActive": c.is_active,
        "expiresAt": c.expires_at.isoformat() if c.expires_at else None,
    } for c in coupons]}

@router.post("/pos/loyalty/coupons")
def create_coupon(data: CouponCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = PosCoupon(
        business_id=bid, code=data.code.upper(), discount_type=data.discount_type,
        discount_value=data.discount_value, min_order=data.min_order, max_uses=data.max_uses,
        expires_at=datetime.fromisoformat(data.expires_at) if data.expires_at else None,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "data": {"id": str(c.id), "code": c.code}}

@router.post("/pos/loyalty/coupons/validate")
def validate_coupon(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    code = (data.get("code") or "").upper()
    c = db.query(PosCoupon).filter(PosCoupon.business_id == bid, PosCoupon.code == code, PosCoupon.is_active == True).first()
    if not c:
        raise HTTPException(status_code=404, detail="Kupon topilmadi")
    if c.max_uses and c.used_count >= c.max_uses:
        raise HTTPException(status_code=400, detail="Kupon limiti tugagan")
    if c.expires_at and c.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="Kupon muddati o'tgan")
    order_total = data.get("orderTotal", 0)
    if order_total < c.min_order:
        raise HTTPException(status_code=400, detail=f"Minimal buyurtma: {c.min_order}")
    discount = c.discount_value if c.discount_type == "FIXED" else order_total * c.discount_value / 100
    return {"success": True, "data": {"valid": True, "discount": round(discount, 2), "type": c.discount_type}}
