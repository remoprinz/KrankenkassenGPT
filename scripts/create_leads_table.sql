-- ============================================
-- Leads-Tabelle für Krankenkassen-Anfragen
-- Ausführen in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kontaktdaten
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Gewähltes Angebot
  insurer_id VARCHAR(20) NOT NULL,
  insurer_name VARCHAR(100) NOT NULL,
  monthly_premium_chf DECIMAL(10,2) NOT NULL,
  annual_premium_chf DECIMAL(10,2),
  
  -- Profil
  canton VARCHAR(2) NOT NULL,
  age_band VARCHAR(20) NOT NULL,
  franchise_chf INTEGER NOT NULL,
  model_type VARCHAR(50) DEFAULT 'standard',
  accident_covered BOOLEAN DEFAULT true,
  
  -- Zusätzliche Infos
  message TEXT,
  source VARCHAR(50) DEFAULT 'chatgpt',
  
  -- Status
  status VARCHAR(20) DEFAULT 'new',
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- RLS (Row Level Security) - Optional aber empfohlen
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Nur Service-Role kann Leads einfügen/lesen
CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- Kommentar zur Tabelle
COMMENT ON TABLE leads IS 'Leads von ChatGPT Krankenkassen-Berater';











