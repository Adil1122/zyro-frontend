-- Query to insert test admin user
INSERT INTO users (id, name, email, password, phone) 
VALUES (gen_random_uuid(), 'admin', 'admin@zyro.com', 'admin12345', '03449878987');

-- Queries to add this user's id to all multitenant tables
UPDATE ads_campaign SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE customers SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE couriers SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE orders SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE products SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
