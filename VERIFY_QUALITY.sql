-- QUALITÄTSPRÜFUNG: Bitte im Supabase SQL Editor ausführen

-- 1. Total pro Jahr
SELECT year, COUNT(*) as count
FROM premiums
WHERE year BETWEEN 2016 AND 2025
GROUP BY year
ORDER BY year;

-- 2. Altersgruppen für 2020
SELECT age_band, COUNT(*) as count
FROM premiums
WHERE year = 2020
GROUP BY age_band
ORDER BY age_band;

-- 3. Franchisen für 2020
SELECT franchise_chf, COUNT(*) as count
FROM premiums
WHERE year = 2020
GROUP BY franchise_chf
ORDER BY franchise_chf;

-- 4. Unfalldeckung für 2020
SELECT accident_covered, COUNT(*) as count
FROM premiums
WHERE year = 2020
GROUP BY accident_covered;

-- 5. Modelle für 2020
SELECT model_type, COUNT(*) as count
FROM premiums
WHERE year = 2020
GROUP BY model_type
ORDER BY count DESC;
