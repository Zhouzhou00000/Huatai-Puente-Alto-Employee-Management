-- 初始员工数据 (来自表格)
INSERT INTO employees (name, rut, position, contract_status, has_contract, shift_group, nationality, daily_wage, notes) VALUES
-- 🇨🇱 智利/拉美员工
('Salomé Constanza Varas Galvez', '20.790.905-k', 'Cajera/Reponedor', '有合同-在职', true, 'A', 'Chile', 0, NULL),
('Leonardo Enrique Llaituqueo Perez', '33.217.716-8', 'Vendedor', '有合同-在职', true, 'B', 'Chile', 0, NULL),
('Francisco Daniel Contador Montecinos', NULL, 'Vendedor', '有合同-在职', true, 'B', 'Chile', 0, NULL),
('Ignacio Madriel Vergara Monsalves', NULL, 'Vendedor', '有合同-在职', true, 'A', 'Chile', 0, NULL),
('César Abraham Anacona Santis', NULL, 'Vendedor', '有合同-在职', true, 'B', 'Chile', 0, NULL),
('Daniela Quiñonez Veléz', NULL, 'Vendedora', '有合同-在职', true, 'B', 'Chile', 0, NULL),
('Didier Fernando Alzate Montilla', NULL, 'Vendedor', '有合同-在职', true, 'A', 'Chile', 0, NULL),
('ANGIE YULIETH VELEZ GONZALEZ', NULL, 'Vendedora', '有合同-在职', true, 'A', 'Chile', 0, NULL),
('Yurangel Jesús Rodriguez Longat', NULL, 'Vendedor', '试用期', true, 'B', 'Chile', 0, '试用期中'),
('Edgar Alexander Lopez Escalona', NULL, 'Vendedor', '日结/临时', false, 'A', 'Chile', 0, '按日结算'),
('Johan Daniel Lopez Ylarraza', NULL, 'Vendedor', '日结/临时', false, 'A', 'Chile', 0, '按日结算'),
('Oliine Naomis Caraballo Escobar', NULL, 'Vendedora', '日结/临时', false, 'B', 'Chile', 0, '按日结算'),
('Rafael Enrique Pirona Hernández', NULL, 'Vendedor', '日结/临时', false, 'A', 'Chile', 0, '按日结算'),
('Jean Carlos Orozco Leon', NULL, 'Vendedor', '已离职', false, NULL, 'Chile', 0, NULL),
('Lea de Sabhay Silva Pino', NULL, 'Vendedora', '已离职', false, NULL, 'Chile', 0, NULL),
('Camila Fernanda Aronda Maturana', NULL, 'Vendedora', '已离职', false, NULL, 'Chile', 0, NULL),
('Claudia Andrea Yupanqui Vargas', NULL, 'Vendedora', '已离职', false, NULL, 'Chile', 0, NULL),
-- 🇨🇳 中国员工
('Xingting Li (李兴婷)', NULL, '管理', '有合同-在职', false, 'C', 'China', 0, NULL),
('Zhengmiao (郑淼)', NULL, '管理', '有合同-在职', true, NULL, 'China', 0, NULL);
