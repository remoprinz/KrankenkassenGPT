-- ============================================================================
-- SWISSHEALTH API - Qualitätsprüfungen
-- Ausführen in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================================

-- ============================================================================
-- 1. VOLLSTÄNDIGKEITS-CHECKS
-- ============================================================================

-- 1.1 Datensätze pro Jahr
SELECT 
    year,
    COUNT(*) as total_records,
    COUNT(DISTINCT canton) as cantons,
    COUNT(DISTINCT insurer_id) as insurers,
    ROUND(AVG(monthly_premium_chf)::numeric, 2) as avg_premium
FROM premiums
WHERE year BETWEEN 2016 AND 2026
GROUP BY year
ORDER BY year;

-- 1.2 Erwartete Vollständigkeit (26 Kantone pro Jahr)
SELECT 
    year,
    COUNT(DISTINCT canton) as cantons,
    CASE 
        WHEN COUNT(DISTINCT canton) = 26 THEN '✅ Vollständig'
        ELSE '⚠️ Unvollständig (' || COUNT(DISTINCT canton) || '/26)'
    END as status
FROM premiums
WHERE year BETWEEN 2016 AND 2026
GROUP BY year
ORDER BY year;

-- ============================================================================
-- 2. PLAUSIBILITÄTS-CHECKS
-- ============================================================================

-- 2.1 Ausreisser: Extrem hohe Prämien (>1000 CHF/Monat für Erwachsene)
SELECT 
    year, canton, insurer_id, model_type, franchise_chf, monthly_premium_chf
FROM premiums
WHERE monthly_premium_chf > 1000 
  AND age_band = 'adult'
ORDER BY monthly_premium_chf DESC
LIMIT 20;

-- 2.2 Ausreisser: Extrem tiefe Prämien (<100 CHF/Monat für Erwachsene Standard)
SELECT 
    year, canton, insurer_id, model_type, franchise_chf, monthly_premium_chf
FROM premiums
WHERE monthly_premium_chf < 100 
  AND age_band = 'adult'
  AND model_type = 'standard'
  AND franchise_chf = 300
ORDER BY monthly_premium_chf ASC
LIMIT 20;

-- 2.3 Check auf NULL-Werte in kritischen Feldern
SELECT 
    SUM(CASE WHEN monthly_premium_chf IS NULL THEN 1 ELSE 0 END) as null_premium,
    SUM(CASE WHEN canton IS NULL THEN 1 ELSE 0 END) as null_canton,
    SUM(CASE WHEN insurer_id IS NULL THEN 1 ELSE 0 END) as null_insurer,
    SUM(CASE WHEN year IS NULL THEN 1 ELSE 0 END) as null_year,
    SUM(CASE WHEN franchise_chf IS NULL THEN 1 ELSE 0 END) as null_franchise
FROM premiums;

-- ============================================================================
-- 3. KONSISTENZ-CHECKS
-- ============================================================================

-- 3.1 Versicherer ohne Namen in insurers-Tabelle
SELECT DISTINCT p.insurer_id, i.name
FROM premiums p
LEFT JOIN insurers i ON p.insurer_id = i.insurer_id
WHERE i.name IS NULL
LIMIT 20;

-- 3.2 Kantone mit fehlenden Regionen in locations
SELECT DISTINCT p.canton
FROM premiums p
LEFT JOIN locations l ON p.canton = l.canton
WHERE l.canton IS NULL;

-- 3.3 Preisentwicklung: Keine negativen Prämien
SELECT COUNT(*) as negative_premiums
FROM premiums
WHERE monthly_premium_chf < 0;

-- ============================================================================
-- 4. STICHPROBEN-VERGLEICH (Manual Check gegen priminfo.admin.ch)
-- ============================================================================

-- 4.1 CSS in Zürich 2026 (Erwachsener, 2500 Franchise, Standard)
-- → Prüfe manuell auf https://www.priminfo.admin.ch
SELECT 
    i.name as versicherer,
    p.canton,
    p.model_type,
    p.franchise_chf,
    p.monthly_premium_chf,
    p.year
FROM premiums p
JOIN insurers i ON p.insurer_id = i.insurer_id
WHERE p.year = 2026
  AND p.canton = 'ZH'
  AND p.age_band = 'adult'
  AND p.franchise_chf = 2500
  AND p.model_type = 'standard'
  AND p.accident_covered = true
  AND i.name ILIKE '%CSS%'
LIMIT 5;

-- 4.2 Günstigste Kassen in Bern 2026
SELECT 
    i.name as versicherer,
    p.model_type,
    p.monthly_premium_chf
FROM premiums p
JOIN insurers i ON p.insurer_id = i.insurer_id
WHERE p.year = 2026
  AND p.canton = 'BE'
  AND p.age_band = 'adult'
  AND p.franchise_chf = 2500
  AND p.accident_covered = true
ORDER BY p.monthly_premium_chf ASC
LIMIT 10;

-- ============================================================================
-- 5. ZUSAMMENFASSUNG
-- ============================================================================

-- 5.1 Gesamtstatistik
SELECT 
    'Total Records' as metric,
    COUNT(*)::text as value
FROM premiums
UNION ALL
SELECT 
    'Years Covered',
    MIN(year)::text || ' - ' || MAX(year)::text
FROM premiums
UNION ALL
SELECT 
    'Cantons',
    COUNT(DISTINCT canton)::text
FROM premiums
UNION ALL
SELECT 
    'Insurers',
    COUNT(DISTINCT insurer_id)::text
FROM premiums
UNION ALL
SELECT 
    'Avg Premium 2026 (Adult, ZH, 2500)',
    ROUND(AVG(monthly_premium_chf)::numeric, 2)::text || ' CHF'
FROM premiums
WHERE year = 2026 AND canton = 'ZH' AND age_band = 'adult' AND franchise_chf = 2500;

-- ============================================================================
-- HINWEIS: Alle Tests sollten "grün" sein bevor der MCP-Server live geht!
-- ============================================================================











