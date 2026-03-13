-- Huatai 华泰 员工管理系统 数据库

-- 员工信息表
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,               -- 姓名
  rut VARCHAR(20),                           -- 税号 RUT/RUN
  position VARCHAR(50) NOT NULL DEFAULT 'Vendedor',  -- 职业/Cargo
  contract_status VARCHAR(20) NOT NULL DEFAULT '有合同-在职',
    -- 合同状态: 有合同-在职, 试用期, 日结/临时, 已离职
  has_contract BOOLEAN DEFAULT true,         -- 有合同?
  shift_group CHAR(1),                       -- 排班组: A, B, C
  contract_end_date DATE,                    -- 合同到期日
  nationality VARCHAR(20) DEFAULT 'Chile',   -- 国籍: Chile, China
  daily_wage INTEGER DEFAULT 0,              -- 日薪(CLP), 仅日结工人
  area VARCHAR(30),                          -- 区域: 游乐园, 零售, 化妆品, 保安, 柜台
  notes TEXT,                                -- 备注
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 排班记录表 (每天每人一条记录)
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  shift_value VARCHAR(5) NOT NULL DEFAULT 'R',
    -- 排班值: 9=全天, 7=半天, R=休息, 空=未排
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- 公告通知表
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal',  -- urgent, normal, low
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(contract_status);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned, created_at DESC);
