-- ==========================================
-- SUPABASE POSTGRESQL SCHEMA FOR LOTTERY APP
-- ==========================================

-- 1. เคลียร์ตารางเก่าทิ้ง (เผื่อรันซ้ำ)
DROP TABLE IF EXISTS "BET_SLIPS_SUB" CASCADE;
DROP TABLE IF EXISTS "BET_SLIPS" CASCADE;
DROP TABLE IF EXISTS "LIMITS_AND_RATES" CASCADE;
DROP TABLE IF EXISTS "DRAWS" CASCADE;
DROP TABLE IF EXISTS "TRANSACTIONS" CASCADE;
DROP TABLE IF EXISTS "USERS" CASCADE;

-- 2. สร้างตาราง USERS
CREATE TABLE "USERS" (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'AGENT')),
    balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. สร้างตาราง TRANSACTIONS (ประวัติการเงิน ฝาก/ถอน/แทง/ถูกรางวัล)
CREATE TABLE "TRANSACTIONS" (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "USERS"(user_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'BET', 'WIN', 'REFUND')),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. สร้างตาราง DRAWS (รอบการออกรางวัล)
CREATE TABLE "DRAWS" (
    draw_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'COMPLETED')),
    winning_numbers JSONB, -- เก็บผลรางวัล เช่น {"3TOP": "456", "2BOT": "12"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. สร้างตาราง LIMITS_AND_RATES (ตั้งค่าอั้น/เรทจ่าย/ยอดรับสูงสุด)
CREATE TABLE "LIMITS_AND_RATES" (
    limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID REFERENCES "DRAWS"(draw_id) ON DELETE CASCADE,
    bet_type VARCHAR(20) NOT NULL, -- เช่น 3TOP, 2BOT
    number_bet VARCHAR(3) NULL,    -- ถ้าเป็น NULL คือตั้งค่าเรทรวม ถ้าใส่เลขคือเลขอั้นเฉพาะตัว
    max_accept_limit DECIMAL(12, 2) NOT NULL, -- รับสูงสุดกี่บาท
    current_accepted DECIMAL(12, 2) DEFAULT 0.00 NOT NULL, -- ตอนนี้คนแทงมาแล้วกี่บาท
    payout_rate DECIMAL(8, 2) NOT NULL, -- อัตราจ่าย เช่น 90.00
    UNIQUE(draw_id, bet_type, number_bet)
);

-- 6. สร้างตาราง BET_SLIPS (หัวบิลโพย)
CREATE TABLE "BET_SLIPS" (
    slip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "USERS"(user_id) ON DELETE CASCADE,
    draw_id UUID REFERENCES "DRAWS"(draw_id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. สร้างตาราง BET_SLIPS_SUB (รายการแทงย่อยในโพย)
CREATE TABLE "BET_SLIPS_SUB" (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_id UUID REFERENCES "BET_SLIPS"(slip_id) ON DELETE CASCADE,
    bet_type VARCHAR(20) NOT NULL, -- เช่น 3TOP, 3TOAD, 2BOT
    number_bet VARCHAR(3) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    price_rate DECIMAL(8, 2) NOT NULL, -- อัตราจ่ายตอนที่ซื้อ (เพื่อล็อคเรท)
    payout_amount DECIMAL(12, 2) DEFAULT 0.00, -- เงินรางวัลที่ได้
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE (ทำ Index ให้ Query ไวๆ)
-- ==========================================
CREATE INDEX idx_bet_sub_slip_id ON "BET_SLIPS_SUB"(slip_id);
CREATE INDEX idx_bet_sub_number ON "BET_SLIPS_SUB"(number_bet, bet_type);
CREATE INDEX idx_limits_draw ON "LIMITS_AND_RATES"(draw_id);
CREATE INDEX idx_transactions_user ON "TRANSACTIONS"(user_id);
