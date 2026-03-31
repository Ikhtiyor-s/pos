"""
Oshxona POS Tizimi — Barcha modellar
"""
import json
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime
from sqlalchemy.sql import func
from .database import Base


# ─── FOYDALANUVCHILAR ───

class PosUser(Base):
    __tablename__ = "pos_users"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    email = Column(String, default="")
    first_name = Column(String, default="")
    last_name = Column(String, default="")
    phone = Column(String, default="")
    password_hash = Column(String, nullable=False)
    pin_hash = Column(String, nullable=True)
    role = Column(String, default="CASHIER")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── KATEGORIYALAR ───

class PosCategory(Base):
    __tablename__ = "pos_categories"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    nonbor_id = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    name_ru = Column(String, default="")
    slug = Column(String, default="")
    image = Column(String, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── MAHSULOTLAR ───

class PosProduct(Base):
    __tablename__ = "pos_products"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    category_id = Column(Integer, nullable=False)
    nonbor_id = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    barcode = Column(String, default="")
    sku = Column(String, default="")
    price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    image = Column(String, default="")
    description = Column(Text, default="")
    cooking_time = Column(Integer, default=0)
    calories = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    stock_tracking = Column(Boolean, default=False)
    stock_quantity = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


# ─── STOLLAR ───

class PosTable(Base):
    __tablename__ = "pos_tables"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(String, default="FREE")
    qr_code = Column(String, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── BUYURTMALAR ───

class PosOrder(Base):
    __tablename__ = "pos_orders"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    order_number = Column(String, nullable=False)
    table_id = Column(Integer, nullable=True)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String, default="")
    customer_phone = Column(String, default="")
    order_type = Column(String, default="DINE_IN")
    source = Column(String, default="POS")
    status = Column(String, default="NEW")
    items_json = Column(Text, default="[]")
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    payment_method = Column(String, default="CASH")
    payment_status = Column(String, default="PENDING")
    note = Column(String, default="")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    @property
    def items(self):
        try:
            return json.loads(self.items_json or "[]")
        except Exception:
            return []

class PosOrderItem(Base):
    __tablename__ = "pos_order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    product_name = Column(String, default="")
    variant_id = Column(Integer, nullable=True)
    quantity = Column(Integer, default=1)
    price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String, default="NEW")
    modifiers_json = Column(Text, default="[]")
    note = Column(String, default="")

class PosPayment(Base):
    __tablename__ = "pos_payments"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String, default="CASH")
    status = Column(String, default="COMPLETED")
    reference = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())


# ─── MIJOZLAR ───

class PosCustomer(Base):
    __tablename__ = "pos_customers"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    email = Column(String, default="")
    address = Column(String, default="")
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    last_order_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── OMBOR ───

class PosInventoryItem(Base):
    __tablename__ = "pos_inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    unit = Column(String, default="kg")
    quantity = Column(Float, default=0.0)
    reorder_level = Column(Float, default=0.0)
    cost_per_unit = Column(Float, default=0.0)
    supplier_id = Column(Integer, nullable=True)
    image = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())

class PosInventoryTransaction(Base):
    __tablename__ = "pos_inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, nullable=False, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    note = Column(String, default="")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class PosSupplier(Base):
    __tablename__ = "pos_suppliers"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())


# ─── MOLIYA ───

class PosExpenseCategory(Base):
    __tablename__ = "pos_expense_categories"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)

class PosExpense(Base):
    __tablename__ = "pos_expenses"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    category_id = Column(Integer, nullable=True)
    amount = Column(Float, nullable=False)
    description = Column(String, default="")
    status = Column(String, default="APPROVED")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class PosCashRegister(Base):
    __tablename__ = "pos_cash_registers"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    opened_by = Column(Integer, nullable=False)
    opening_amount = Column(Float, default=0.0)
    closing_amount = Column(Float, nullable=True)
    expected_amount = Column(Float, nullable=True)
    difference = Column(Float, nullable=True)
    status = Column(String, default="OPEN")
    opened_at = Column(DateTime, server_default=func.now())
    closed_at = Column(DateTime, nullable=True)


# ─── XODIMLAR ───

class PosShift(Base):
    __tablename__ = "pos_shifts"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, default="SCHEDULED")
    created_at = Column(DateTime, server_default=func.now())

class PosAttendance(Base):
    __tablename__ = "pos_attendance"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime, nullable=True)

class PosPayroll(Base):
    __tablename__ = "pos_payroll"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    hours_worked = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    status = Column(String, default="PENDING")
    paid_at = Column(DateTime, nullable=True)


# ─── YETKAZIB BERISH ───

class PosDriver(Base):
    __tablename__ = "pos_drivers"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    status = Column(String, default="AVAILABLE")
    created_at = Column(DateTime, server_default=func.now())

class PosDelivery(Base):
    __tablename__ = "pos_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, nullable=False)
    driver_id = Column(Integer, nullable=True)
    address = Column(String, default="")
    status = Column(String, default="PENDING")
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── BRON ───

class PosReservation(Base):
    __tablename__ = "pos_reservations"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    table_id = Column(Integer, nullable=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, default="")
    guest_count = Column(Integer, default=2)
    reservation_time = Column(DateTime, nullable=False)
    status = Column(String, default="PENDING")
    code = Column(String, default="")
    note = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())


# ─── BONUS TIZIM ───

class PosLoyaltyProgram(Base):
    __tablename__ = "pos_loyalty_programs"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, unique=True)
    points_per_sum = Column(Float, default=0.01)
    redemption_rate = Column(Float, default=1.0)
    is_active = Column(Boolean, default=False)

class PosLoyaltyTransaction(Base):
    __tablename__ = "pos_loyalty_transactions"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, nullable=False, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    type = Column(String, nullable=False)
    points = Column(Integer, nullable=False)
    order_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class PosCoupon(Base):
    __tablename__ = "pos_coupons"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    code = Column(String, nullable=False)
    discount_type = Column(String, default="PERCENTAGE")
    discount_value = Column(Float, nullable=False)
    min_order = Column(Float, default=0.0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


# ─── BILDIRISHNOMALAR ───

class PosNotification(Base):
    __tablename__ = "pos_notifications"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    type = Column(String, default="SYSTEM")
    title = Column(String, default="")
    message = Column(Text, default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


# ─── SOZLAMALAR ───

class PosSettings(Base):
    __tablename__ = "pos_settings"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, unique=True)
    settings_json = Column(Text, default="{}")

    @property
    def settings(self):
        try:
            return json.loads(self.settings_json or "{}")
        except Exception:
            return {}


# ─── AUDIT LOG ───

class PosAuditLog(Base):
    __tablename__ = "pos_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    entity = Column(String, default="")
    entity_id = Column(Integer, nullable=True)
    details_json = Column(Text, default="{}")
    created_at = Column(DateTime, server_default=func.now())
