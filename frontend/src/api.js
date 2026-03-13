import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// 员工 API
export const getEmployees = () => API.get('/employees');
export const getEmployee = (id) => API.get(`/employees/${id}`);
export const createEmployee = (data) => API.post('/employees', data);
export const updateEmployee = (id, data) => API.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => API.delete(`/employees/${id}`);

// 排班 API
export const getSchedules = (year, month) => API.get(`/schedules?year=${year}&month=${month}`);
export const updateSchedule = (employeeId, date, shiftValue) =>
  API.put(`/schedules/${employeeId}/${date}`, { shift_value: shiftValue });
export const batchUpdateSchedules = (schedules) => API.post('/schedules/batch', { schedules });

// 公告 API
export const getAnnouncements = () => API.get('/announcements');
export const createAnnouncement = (data) => API.post('/announcements', data);
export const updateAnnouncement = (id, data) => API.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => API.delete(`/announcements/${id}`);
