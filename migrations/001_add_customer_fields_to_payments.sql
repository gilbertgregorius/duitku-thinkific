-- Migration: Add customer fields and additional payment fields to payments table
-- Date: 2025-06-09

-- Add customer information fields
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS course_description TEXT,
ADD COLUMN IF NOT EXISTS qr_string TEXT,
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS settlement_date DATE,
ADD COLUMN IF NOT EXISTS issuer_code VARCHAR(50);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_customer_email ON payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Update any existing NULL customer fields if they can be derived
-- (This would be a custom update based on your existing data)
