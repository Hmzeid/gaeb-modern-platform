-- CONTROLLED TEST DATA — SYNTHETIC, for the POC demonstration only. Not customer data.
INSERT INTO app.governorates (code, name_en, name_ar) VALUES
  (1, 'Cairo', 'القاهرة'), (2, 'Alexandria', 'الإسكندرية'), (21, 'Giza', 'الجيزة')
ON CONFLICT (code) DO NOTHING;
INSERT INTO app.item_catalogue (code, name_en, name_ar, unit, standard_price) VALUES
  ('DMO-001', 'Demo item — concrete works', 'بند تجريبي — أعمال خرسانة', 'm3', 1500.00),
  ('DMO-002', 'Demo item — brick works', 'بند تجريبي — أعمال مباني', 'm2', 850.50)
ON CONFLICT (code) DO NOTHING;
