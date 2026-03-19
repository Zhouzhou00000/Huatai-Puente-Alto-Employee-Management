import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// 员工 API
export const getEmployees = () => API.get('/employees');
export const getEmployee = (id) => API.get(`/employees/${id}`);
export const createEmployee = (data) => API.post('/employees', data);
export const updateEmployee = (id, data) => API.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => API.delete(`/employees/${id}`);
export const resetEmployeePassword = (id, password) => API.put(`/employees/${id}/reset-password`, { password });

// 排班 API
export const getSchedules = (year, month) => API.get(`/schedules?year=${year}&month=${month}`);
export const updateSchedule = (employeeId, date, shiftValue) =>
  API.put(`/schedules/${employeeId}/${date}`, { shift_value: shiftValue });
export const batchUpdateSchedules = (schedules) => API.post('/schedules/batch', { schedules });

// 文件 API
export const getEmployeeFiles = (employeeId) => API.get(`/files/employee/${employeeId}`);
export const uploadEmployeeFile = (employeeId, formData) =>
  API.post(`/files/employee/${employeeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const deleteFile = (fileId) => API.delete(`/files/${fileId}`);
export const getFileUrl = (fileId) => `/api/files/${fileId}/download`;

// 用户 API
export const loginUser = (username, password) => API.post('/users/login', { username, password });
export const getUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const resetUserPassword = (id, password) => API.put(`/users/${id}/reset-password`, { password });
export const getUser = (id) => API.get(`/users/${id}`);
export const updateProfile = (id, data) => API.put(`/users/${id}/profile`, data);
export const uploadAvatar = (id, formData) =>
  API.post(`/users/${id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// 打卡 API
export const getClockRecords = (date) => API.get(`/clock?date=${date}`);
export const getEmployeeClockRecord = (employeeId, date) => API.get(`/clock/employee/${employeeId}?date=${date}`);
export const clockIn = (employee_id) => API.post('/clock/in', { employee_id });
export const clockOut = (employee_id) => API.post('/clock/out', { employee_id });
export const clockLunchOut = (employee_id) => API.post('/clock/lunch-out', { employee_id });
export const clockLunchIn = (employee_id) => API.post('/clock/lunch-in', { employee_id });
export const getClockMonth = (year, month, employee_id) => API.get(`/clock/month?year=${year}&month=${month}${employee_id ? `&employee_id=${employee_id}` : ''}`);
export const editClockRecord = (data) => API.put('/clock/edit', data);

// 考勤 API
export const getAttendance = (date) => API.get(`/attendance?date=${date}`);
export const setAttendance = (employee_id, date, status, note) =>
  API.post('/attendance', { employee_id, date, status, note });

// 系统设置 API
export const getSettings = () => API.get('/settings');
export const updateSetting = (key, value) => API.put(`/settings/${key}`, { value });

// 翻译 API
export const translateText = (text, from = 'zh-CN', to = 'es') => API.post('/translate', { text, from, to });

// WhatsApp API
export const sendWhatsApp = (phone, message) => API.post('/whatsapp/send', { phone, message });
export const sendWhatsAppBatch = (recipients) => API.post('/whatsapp/send-batch', { recipients });
export const testWhatsApp = () => API.get('/whatsapp/test');

// 公告 API
export const getAnnouncements = () => API.get('/announcements');
export const createAnnouncement = (data) => API.post('/announcements', data);
export const updateAnnouncement = (id, data) => API.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => API.delete(`/announcements/${id}`);
