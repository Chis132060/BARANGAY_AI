-- Research references, not confirmed active enrollments. Keep unpublished pending staff verification.
INSERT INTO public.barangay_programs (name, code, description, category, is_custom, status, is_public, registration_open, purok)
SELECT v.name, v.code, v.description, v.category, true, 'On Hold', false, false, 'All Puroks'
FROM (VALUES
('Buntis Congress / Safe Motherhood','TS-BUNTIS-2023','Historical March 2023 maternal health activity at Tandang Sora; source: Butuan City Government, Buntis Congress 2023. Current registration unverified.','Health'),
('Inter-Barangay Basketball','TS-BASKET-2025','Historical May 2025 event: Tandang Sora participated in Butuan Cluster 2; source: Butuan City Government. Current registration unverified.','Youth & Sports'),
('Livelihood Assistance (Citywide)','CITY-LIVELIHOOD-2026','Butuan citywide opportunity cited by City Employment Services Department in March 2026 Lawig Barangay initiative; availability in Tandang Sora unverified.','Livelihood'),
('SPES Student Employment (Citywide)','CITY-SPES-2026','Butuan citywide employment opportunity cited in March 2026 Lawig Barangay initiative; local intake unverified.','Education & Employment'),
('TUPAD Employment Assistance (Citywide)','CITY-TUPAD-2026','Butuan citywide employment opportunity cited in March 2026 Lawig Barangay initiative; local intake unverified.','Livelihood'),
('Skills Training (Citywide)','CITY-SKILLS-2026','Butuan citywide training opportunity cited in March 2026 Lawig Barangay initiative; local intake unverified.','Livelihood')
) AS v(name,code,description,category)
WHERE NOT EXISTS (SELECT 1 FROM public.barangay_programs p WHERE p.code=v.code);
