"""
POS Finance — Moliya boshqaruvi (Xarajatlar, Kassa, Hisobotlar)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..models import PosExpenseCategory, PosExpense, PosCashRegister, PosOrder
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-finance"])


# ─── Expense Categories ───

@router.get("/pos/finance/expense-categories")
def list_expense_cats(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    cats = db.query(PosExpenseCategory).filter(PosExpenseCategory.business_id == bid).all()
    return {"success": True, "data": [{"id": str(c.id), "name": c.name} for c in cats]}

@router.post("/pos/finance/expense-categories")
def create_expense_cat(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = PosExpenseCategory(business_id=bid, name=data.get("name", ""))
    db.add(c); db.commit(); db.refresh(c)
    return {"success": True, "data": {"id": str(c.id), "name": c.name}}

@router.delete("/pos/finance/expense-categories/{cat_id}")
def delete_expense_cat(cat_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    c = db.query(PosExpenseCategory).filter(PosExpenseCategory.id == cat_id, PosExpenseCategory.business_id == bid).first()
    if not c: raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(c); db.commit()
    return {"success": True}


# ─── Expenses ───

class ExpenseCreate(BaseModel):
    amount: float
    description: str = ""
    category_id: int | None = None

@router.get("/pos/finance/expenses")
def list_expenses(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    expenses = db.query(PosExpense).filter(PosExpense.business_id == bid).order_by(desc(PosExpense.created_at)).limit(100).all()
    return {"success": True, "data": [{
        "id": str(e.id), "amount": e.amount, "description": e.description,
        "categoryId": e.category_id, "status": e.status,
        "createdAt": e.created_at.isoformat() if e.created_at else None,
    } for e in expenses]}

@router.post("/pos/finance/expenses")
def create_expense(data: ExpenseCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    e = PosExpense(business_id=bid, amount=data.amount, description=data.description, category_id=data.category_id, status="APPROVED")
    db.add(e); db.commit(); db.refresh(e)
    return {"success": True, "data": {"id": str(e.id), "amount": e.amount}}

@router.get("/pos/finance/expenses/summary")
def expense_summary(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    total = db.query(func.sum(PosExpense.amount)).filter(PosExpense.business_id == bid, PosExpense.status == "APPROVED").scalar() or 0
    return {"success": True, "data": {"total": round(total, 2)}}


# ─── Cash Register ───

@router.get("/pos/finance/cash-register/active")
def active_register(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    reg = db.query(PosCashRegister).filter(PosCashRegister.business_id == bid, PosCashRegister.status == "OPEN").first()
    if not reg:
        return {"success": True, "data": None}
    return {"success": True, "data": {
        "id": str(reg.id), "openingAmount": reg.opening_amount, "status": reg.status,
        "openedAt": reg.opened_at.isoformat() if reg.opened_at else None,
    }}

@router.post("/pos/finance/cash-register/open")
def open_register(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    existing = db.query(PosCashRegister).filter(PosCashRegister.business_id == bid, PosCashRegister.status == "OPEN").first()
    if existing:
        raise HTTPException(status_code=400, detail="Kassa allaqachon ochiq")
    reg = PosCashRegister(business_id=bid, opened_by=data.get("userId", 0), opening_amount=data.get("amount", 0), status="OPEN")
    db.add(reg); db.commit(); db.refresh(reg)
    return {"success": True, "data": {"id": str(reg.id), "status": "OPEN"}}

@router.post("/pos/finance/cash-register/{reg_id}/close")
def close_register(reg_id: int, data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    reg = db.query(PosCashRegister).filter(PosCashRegister.id == reg_id, PosCashRegister.business_id == bid).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Kassa topilmadi")
    reg.closing_amount = data.get("amount", 0)
    reg.status = "CLOSED"
    reg.closed_at = datetime.now()
    # Kutilgan summa = ochilish + davr savdolari
    sales = db.query(func.sum(PosOrder.total)).filter(
        PosOrder.business_id == bid, PosOrder.status == "COMPLETED",
        PosOrder.payment_method == "CASH", PosOrder.created_at >= reg.opened_at,
    ).scalar() or 0
    reg.expected_amount = reg.opening_amount + sales
    reg.difference = reg.closing_amount - reg.expected_amount
    db.commit()
    return {"success": True, "data": {"id": str(reg.id), "difference": reg.difference}}

@router.get("/pos/finance/cash-register/history")
def register_history(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    regs = db.query(PosCashRegister).filter(PosCashRegister.business_id == bid).order_by(desc(PosCashRegister.opened_at)).limit(30).all()
    return {"success": True, "data": [{
        "id": str(r.id), "openingAmount": r.opening_amount, "closingAmount": r.closing_amount,
        "difference": r.difference, "status": r.status,
        "openedAt": r.opened_at.isoformat() if r.opened_at else None,
        "closedAt": r.closed_at.isoformat() if r.closed_at else None,
    } for r in regs]}


# ─── Reports ───

@router.get("/pos/finance/reports/profit-loss")
def profit_loss(period: str = "month", authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    from .pos_analytics import _period_start
    start = _period_start(period)

    revenue = db.query(func.sum(PosOrder.total)).filter(
        PosOrder.business_id == bid, PosOrder.status == "COMPLETED", PosOrder.created_at >= start
    ).scalar() or 0
    expenses = db.query(func.sum(PosExpense.amount)).filter(
        PosExpense.business_id == bid, PosExpense.status == "APPROVED", PosExpense.created_at >= start
    ).scalar() or 0

    return {"success": True, "data": {
        "revenue": round(revenue, 2), "expenses": round(expenses, 2), "profit": round(revenue - expenses, 2),
        "period": period,
    }}
