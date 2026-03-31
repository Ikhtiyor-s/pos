"""
POS Staff — Xodimlar, Smenalar, Davomat, Ish haqi
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import PosShift, PosAttendance, PosPayroll, PosUser
from ..auth import business_id_from_header as _business_id_from_header

router = APIRouter(tags=["pos-staff"])


# ─── Shifts ───

class ShiftCreate(BaseModel):
    user_id: int
    start_time: str
    end_time: str

@router.get("/pos/staff/shifts")
def list_shifts(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    shifts = db.query(PosShift).filter(PosShift.business_id == bid).order_by(desc(PosShift.start_time)).limit(50).all()
    return {"success": True, "data": [{
        "id": str(s.id), "userId": s.user_id, "startTime": s.start_time.isoformat() if s.start_time else None,
        "endTime": s.end_time.isoformat() if s.end_time else None, "status": s.status,
    } for s in shifts]}

@router.post("/pos/staff/shifts")
def create_shift(data: ShiftCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    s = PosShift(business_id=bid, user_id=data.user_id,
                 start_time=datetime.fromisoformat(data.start_time), end_time=datetime.fromisoformat(data.end_time))
    db.add(s); db.commit(); db.refresh(s)
    return {"success": True, "data": {"id": str(s.id)}}


# ─── Attendance ───

@router.post("/pos/staff/clock-in")
def clock_in(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    a = PosAttendance(business_id=bid, user_id=data.get("userId", 0), clock_in=datetime.now())
    db.add(a); db.commit(); db.refresh(a)
    return {"success": True, "data": {"id": str(a.id), "clockIn": a.clock_in.isoformat()}}

@router.post("/pos/staff/clock-out")
def clock_out(data: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    a = db.query(PosAttendance).filter(
        PosAttendance.business_id == bid, PosAttendance.user_id == data.get("userId", 0), PosAttendance.clock_out == None
    ).order_by(desc(PosAttendance.clock_in)).first()
    if not a:
        raise HTTPException(status_code=404, detail="Ochiq davomat topilmadi")
    a.clock_out = datetime.now()
    db.commit()
    return {"success": True, "data": {"id": str(a.id), "clockOut": a.clock_out.isoformat()}}

@router.get("/pos/staff/attendance")
def attendance(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    records = db.query(PosAttendance).filter(PosAttendance.business_id == bid).order_by(desc(PosAttendance.clock_in)).limit(50).all()
    return {"success": True, "data": [{
        "id": str(a.id), "userId": a.user_id,
        "clockIn": a.clock_in.isoformat() if a.clock_in else None,
        "clockOut": a.clock_out.isoformat() if a.clock_out else None,
    } for a in records]}


# ─── Payroll ───

@router.get("/pos/staff/payroll")
def list_payroll(authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    records = db.query(PosPayroll).filter(PosPayroll.business_id == bid).order_by(desc(PosPayroll.period_start)).limit(50).all()
    return {"success": True, "data": [{
        "id": str(p.id), "userId": p.user_id, "amount": p.amount, "hoursWorked": p.hours_worked,
        "status": p.status, "periodStart": p.period_start.isoformat() if p.period_start else None,
    } for p in records]}

@router.patch("/pos/staff/payroll/{payroll_id}/pay")
def mark_paid(payroll_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    bid = _business_id_from_header(authorization)
    p = db.query(PosPayroll).filter(PosPayroll.id == payroll_id, PosPayroll.business_id == bid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Topilmadi")
    p.status = "PAID"
    p.paid_at = datetime.now()
    db.commit()
    return {"success": True}
