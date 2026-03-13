import React, { createContext, useContext, useState } from 'react';

const translations = {
  zh: {
    // Nav
    navHome: '首页',
    navEmployees: '员工信息',
    navSchedule: '排班日历',
    navAnnouncements: '公告通知',
    navInternal: '内部管理',
    brandSub: 'Gestión Interna',
    logout: '退出',

    // Home
    greetingMorning: '早上好 👋',
    greetingAfternoon: '下午好 👋',
    greetingEvening: '晚上好 👋',
    locale: 'zh-CN',
    homeTotal: '总员工',
    homeRecentAnnouncements: '最新公告',
    homeViewAll: '查看全部',
    homeQuickActions: '快捷操作',
    reportByStatus: '员工状态分布',
    reportByArea: '区域分布',
    reportByGroup: '排班组分布',
    reportNoGroup: '未分组',
    reportPeople: '人',

    // Login
    loginTitle: '华泰商城 — 员工管理系统',
    loginUsername: '用户名 / Usuario',
    loginPassword: '密码 / Contraseña',
    loginPlaceholderUser: '请输入用户名',
    loginPlaceholderPass: '请输入密码',
    loginBtn: '登录 / Iniciar Sesión',
    loginLoading: '登录中...',
    loginError: '用户名或密码错误',
    loginFooter: 'Puente Alto, Santiago, Chile',

    // Common
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    add: '添加',
    create: '创建',
    search: '搜索姓名...',
    noData: '暂无数据',
    all: '全部',
    confirm: '确认',
    yes: '是',
    no: '否',

    // Employee statuses (display labels - internal values stay the same)
    statusActive: '有合同-在职',
    statusTrial: '试用期',
    statusDaily: '日结/临时',
    statusDeparted: '已离职',

    // Areas
    areaAmusement: '游乐园',
    areaRetail: '零售',
    areaCosmetics: '化妆品',
    areaSecurity: '保安',
    areaCounter: '柜台',
    areaUnassigned: '未分配',

    // Employee list
    addEmployee: '+ 添加员工',
    editEmployee: '编辑员工',
    addEmployeeTitle: '添加员工',
    chinaSection: '🇨🇳 中国员工 — Empleado (China)',
    chileSection: '🇨🇱 员工 — Empleados (Chile / Latinoamérica)',
    colName: '姓名 / Nombre',
    colRut: '税号 RUT',
    colPosition: '职业 / Cargo',
    colStatus: '合同状态',
    colContract: '有合同?',
    colGroup: '排班组',
    colArea: '区域',
    colExpiry: '合同到期日',
    colNotes: '备注',
    colActions: '操作',
    hasContract: '✔ 有合同',
    noContract: '✘ 无合同',
    confirmDelete: '确定删除',

    // Form labels
    formName: '姓名 / Nombre *',
    formRut: '税号 RUT/RUN',
    formPosition: '职业 / Cargo',
    formStatus: '合同状态',
    formGroup: '排班组',
    formArea: '区域',
    formWorkArea: '工作区域',
    formNationality: '国籍',
    formContract: '有合同?',
    formContractYes: '有合同',
    formContractNo: '无合同',
    formExpiry: '合同到期日',
    formWage: '日薪 (CLP)',
    formNotes: '备注',
    formNone: '无',

    // Edit page
    backToList: '返回列表',
    basicInfo: '基本信息',
    contractInfo: '合同信息',
    workInfo: '工作信息',

    // Schedule
    scheduleTitle: '排班日历',
    today: '今天',
    autoAssign: '自动排班',
    assigning: '排班中...',
    printSchedule: '打印排班表',
    autoAssignConfirm: (y, m) => `确认为 ${y}年${m}月 自动排班？\n\n规则：\n• 周一至周六: 10:00-20:00\n• 周日: 11:00-18:00\n• 每人每周休息1天，按组轮换\n• 午休1小时，A/B/C组分时段\n• 已有排班会被覆盖`,
    autoAssignFail: '自动排班失败: ',
    clickDayHint: '点击日历中的某一天查看详情',
    lunchRotation: '本周午休轮换:',
    lunchTitle: '午休安排 (1小时)',
    workHours: '上班时间',
    group: '组',
    people: '人',
    rest: '休息',
    quickSchedule: '快速排班',
    quickScheduleHint: '点击切换: 9(上班) → R(休息)',
    fullDay: '上班',
    halfDay: '半天',
    unscheduled: '未排',
    dayNames: ['一', '二', '三', '四', '五', '六', '日'],
    dayNamesFull: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    printTitle: '排班表',
    printName: '姓名',
    printWork: '工',
    printRest: '休',
    printDailyWorking: '每日上班',
    printSummary: '全员每日上班人数汇总',
    printWorking: '上班',
    printResting: '休息',
    printTime: '打印时间',
    printFullDay: '9 = 全天',
    printHalfDay: '7 = 半天',
    printRestDay: 'R = 休息',
    printDays: '天',

    // Announcements
    announcementsTitle: '公告通知',
    publishAnnouncement: '+ 发布公告',
    noAnnouncements: '暂无公告',
    editAnnouncement: '编辑公告',
    newAnnouncement: '发布公告',
    formTitle: '标题',
    formContent: '内容',
    formPriority: '优先级',
    priorityUrgent: '紧急',
    priorityNormal: '普通',
    priorityLow: '低',
    formPinned: '置顶',
    pinned: '置顶',
    edited: '已编辑',
    confirmDeleteAnnouncement: '确认删除此公告？',

    // Internal management
    internalTitle: '内部管理',
    employeeMgmt: '员工管理',
    createEmployee: '创建员工',
    createEmployeeSub: '新增员工账号',
    trialToFormal: '试用期转正',
    trialToFormalSub: (n) => `${n}人试用中`,
    handleDeparture: '办理离职',
    handleDepartureSub: '将员工设为离职',
    rehire: '重新入职',
    rehireSub: (n) => `${n}人已离职`,
    statActive: '在职',
    statTrial: '试用期',
    statDaily: '日结/临时',
    statDeparted: '已离职',
    statTotal: '总计',
    contractExpired: '合同已过期',
    contractExpiringSoon: '合同30天内到期',
    tabActiveAndTrial: '在职/试用',
    tabDailyWorker: '日结工',
    tabTrial: '试用期',
    tabDeparted: '已离职',
    tabAll: '全部',
    confirmDepart: (name) => `确定将 ${name} 设为已离职？`,
    confirmConvert: (name) => `确定将 ${name} 转为正式员工（有合同-在职）？`,
    confirmDeletePermanent: (name) => `确定永久删除 ${name}？此操作不可撤销！`,
    confirmRehire: (name) => `确定将 ${name} 重新设为在职？`,
    noTrialEmployees: '没有试用期员工',
    createFail: '创建失败: ',
    updateFail: '更新失败: ',
    deleteFail: '删除失败: ',
    operationFail: '操作失败: ',
    convert: '转正',
    depart: '离职',
    createNewEmployee: '创建新员工',
    editEmployeeTitle: (name) => `编辑员工 — ${name}`,
    colPosition2: '职位',
    colStatus2: '状态',
    colNationality: '国籍',
    colContractExpiry: '合同到期',

    // File uploads
    fileDocuments: '文件资料',
    fileContract: '合同 PDF',
    fileFiniquito: 'Finiquito',
    filePhoto: '员工照片',
    filePayslip: '工资单',
    fileUpload: '上传',
    fileUploading: '上传中...',
    fileDelete: '删除',
    fileConfirmDelete: '确定删除此文件？',
    fileView: '查看',
    fileDownload: '下载',
    fileNoFiles: '暂无文件',
    fileSelectType: '选择文件类型',
    filePayslipYear: '年份',
    filePayslipMonth: '月份',
    fileUploadSuccess: '上传成功',
    fileUploadFail: '上传失败: ',
    fileDeleteFail: '删除失败: ',
    fileSizeLimit: '文件大小不能超过20MB',
    fileTypeNotSupported: '不支持的文件类型，请上传PDF或图片',

    // Permissions / Roles
    colRole: '权限',
    roleAdmin: '管理员',
    roleSupervisor: '主管',
    roleStaff: '普通员工',
    chineseEmployees: '中国员工列表',
    permissionUpdated: '权限已更新',
    permissionFail: '权限更新失败: ',

    // Password
    resetPassword: '重置密码',
    confirmResetPassword: (name) => `确定将 ${name} 的密码重置为 123456？`,
    resetPasswordSuccess: '密码已重置为 123456',
    resetPasswordFail: '重置密码失败: ',

    // Language
    lang: '中文',
    switchLang: 'ES',
  },

  es: {
    // Nav
    navHome: 'Inicio',
    navEmployees: 'Empleados',
    navSchedule: 'Horarios',
    navAnnouncements: 'Avisos',
    navInternal: 'Gestión Interna',
    brandSub: 'Gestión Interna',
    logout: 'Salir',

    // Home
    greetingMorning: 'Buenos días 👋',
    greetingAfternoon: 'Buenas tardes 👋',
    greetingEvening: 'Buenas noches 👋',
    locale: 'es-CL',
    homeTotal: 'Total empleados',
    homeRecentAnnouncements: 'Avisos recientes',
    homeViewAll: 'Ver todos',
    homeQuickActions: 'Acceso rápido',
    reportByStatus: 'Distribución por estado',
    reportByArea: 'Distribución por área',
    reportByGroup: 'Distribución por grupo',
    reportNoGroup: 'Sin grupo',
    reportPeople: 'pers.',

    // Login
    loginTitle: 'Centro Comercial Huatai — Sistema de Gestión',
    loginUsername: 'Usuario',
    loginPassword: 'Contraseña',
    loginPlaceholderUser: 'Ingrese su usuario',
    loginPlaceholderPass: 'Ingrese su contraseña',
    loginBtn: 'Iniciar Sesión',
    loginLoading: 'Ingresando...',
    loginError: 'Usuario o contraseña incorrectos',
    loginFooter: 'Puente Alto, Santiago, Chile',

    // Common
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    add: 'Agregar',
    create: 'Crear',
    search: 'Buscar por nombre...',
    noData: 'Sin datos',
    all: 'Todos',
    confirm: 'Confirmar',
    yes: 'Sí',
    no: 'No',

    // Employee statuses
    statusActive: 'Con contrato',
    statusTrial: 'Período de prueba',
    statusDaily: 'Jornalero/Temporal',
    statusDeparted: 'Desvinculado',

    // Areas
    areaAmusement: 'Parque',
    areaRetail: 'Retail',
    areaCosmetics: 'Cosméticos',
    areaSecurity: 'Seguridad',
    areaCounter: 'Mostrador',
    areaUnassigned: 'Sin asignar',

    // Employee list
    addEmployee: '+ Agregar empleado',
    editEmployee: 'Editar empleado',
    addEmployeeTitle: 'Agregar empleado',
    chinaSection: '🇨🇳 Empleados (China)',
    chileSection: '🇨🇱 Empleados (Chile / Latinoamérica)',
    colName: 'Nombre',
    colRut: 'RUT',
    colPosition: 'Cargo',
    colStatus: 'Estado contrato',
    colContract: '¿Contrato?',
    colGroup: 'Grupo turno',
    colArea: 'Área',
    colExpiry: 'Vencimiento',
    colNotes: 'Notas',
    colActions: 'Acciones',
    hasContract: '✔ Sí',
    noContract: '✘ No',
    confirmDelete: '¿Eliminar a',

    // Form labels
    formName: 'Nombre *',
    formRut: 'RUT/RUN',
    formPosition: 'Cargo',
    formStatus: 'Estado contrato',
    formGroup: 'Grupo turno',
    formArea: 'Área',
    formWorkArea: 'Área de trabajo',
    formNationality: 'Nacionalidad',
    formContract: '¿Tiene contrato?',
    formContractYes: 'Con contrato',
    formContractNo: 'Sin contrato',
    formExpiry: 'Vencimiento contrato',
    formWage: 'Sueldo diario (CLP)',
    formNotes: 'Notas',
    formNone: 'Ninguno',

    // Edit page
    backToList: 'Volver a la lista',
    basicInfo: 'Información básica',
    contractInfo: 'Información de contrato',
    workInfo: 'Información laboral',

    // Schedule
    scheduleTitle: 'Calendario de turnos',
    today: 'Hoy',
    autoAssign: 'Auto-asignar',
    assigning: 'Asignando...',
    printSchedule: 'Imprimir turnos',
    autoAssignConfirm: (y, m) => `¿Confirmar auto-asignación para ${m}/${y}?\n\nReglas:\n• Lun–Sáb: 10:00–20:00\n• Dom: 11:00–18:00\n• 1 día libre por semana, rotación por grupo\n• Almuerzo 1 hora (A/B/C en horarios distintos)\n• Se sobrescribirán los turnos existentes`,
    autoAssignFail: 'Error en auto-asignación: ',
    workHours: 'Horario',
    clickDayHint: 'Haga clic en un día para ver los detalles',
    lunchRotation: 'Rotación almuerzo esta semana:',
    lunchTitle: 'Horario almuerzo',
    group: 'Grupo',
    people: 'pers.',
    rest: 'Descanso',
    quickSchedule: 'Asignación rápida',
    quickScheduleHint: 'Clic para cambiar: 9(completo) → 7(medio) → R(descanso)',
    fullDay: 'Completo',
    halfDay: 'Medio',
    unscheduled: 'Sin turno',
    dayNames: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'],
    dayNamesFull: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    printTitle: 'Horario de turnos',
    printName: 'Nombre',
    printWork: 'Trab.',
    printRest: 'Desc.',
    printDailyWorking: 'Trabajando/día',
    printSummary: 'Resumen diario de trabajadores',
    printWorking: 'Trabajando',
    printResting: 'Descansando',
    printTime: 'Impreso',
    printFullDay: '9 = Completo',
    printHalfDay: '7 = Medio',
    printRestDay: 'R = Descanso',
    printDays: 'días',

    // Announcements
    announcementsTitle: 'Avisos',
    publishAnnouncement: '+ Publicar aviso',
    noAnnouncements: 'Sin avisos',
    editAnnouncement: 'Editar aviso',
    newAnnouncement: 'Publicar aviso',
    formTitle: 'Título',
    formContent: 'Contenido',
    formPriority: 'Prioridad',
    priorityUrgent: 'Urgente',
    priorityNormal: 'Normal',
    priorityLow: 'Baja',
    formPinned: 'Fijar arriba',
    pinned: 'Fijado',
    edited: 'editado',
    confirmDeleteAnnouncement: '¿Eliminar este aviso?',

    // Internal management
    internalTitle: 'Gestión Interna',
    employeeMgmt: 'Gestión de Empleados',
    createEmployee: 'Crear empleado',
    createEmployeeSub: 'Nueva cuenta de empleado',
    trialToFormal: 'Formalizar',
    trialToFormalSub: (n) => `${n} en prueba`,
    handleDeparture: 'Desvincular',
    handleDepartureSub: 'Marcar como desvinculado',
    rehire: 'Recontratar',
    rehireSub: (n) => `${n} desvinculados`,
    statActive: 'Activo',
    statTrial: 'Prueba',
    statDaily: 'Jornalero',
    statDeparted: 'Desvinculado',
    statTotal: 'Total',
    contractExpired: 'Contratos vencidos',
    contractExpiringSoon: 'Contratos por vencer (30 días)',
    tabActiveAndTrial: 'Activos/Prueba',
    tabDailyWorker: 'Jornaleros',
    tabTrial: 'Prueba',
    tabDeparted: 'Desvinculados',
    tabAll: 'Todos',
    confirmDepart: (name) => `¿Desvincular a ${name}?`,
    confirmConvert: (name) => `¿Formalizar a ${name} como empleado con contrato?`,
    confirmDeletePermanent: (name) => `¿Eliminar permanentemente a ${name}? ¡Esta acción no se puede deshacer!`,
    confirmRehire: (name) => `¿Recontratar a ${name}?`,
    noTrialEmployees: 'No hay empleados en período de prueba',
    createFail: 'Error al crear: ',
    updateFail: 'Error al actualizar: ',
    deleteFail: 'Error al eliminar: ',
    operationFail: 'Error: ',
    convert: 'Formalizar',
    depart: 'Desvincular',
    createNewEmployee: 'Crear nuevo empleado',
    editEmployeeTitle: (name) => `Editar empleado — ${name}`,
    colPosition2: 'Cargo',
    colStatus2: 'Estado',
    colNationality: 'Nacionalidad',
    colContractExpiry: 'Vencimiento',

    // File uploads
    fileDocuments: 'Documentos',
    fileContract: 'Contrato PDF',
    fileFiniquito: 'Finiquito',
    filePhoto: 'Foto empleado',
    filePayslip: 'Liquidación',
    fileUpload: 'Subir',
    fileUploading: 'Subiendo...',
    fileDelete: 'Eliminar',
    fileConfirmDelete: '¿Eliminar este archivo?',
    fileView: 'Ver',
    fileDownload: 'Descargar',
    fileNoFiles: 'Sin archivos',
    fileSelectType: 'Seleccionar tipo',
    filePayslipYear: 'Año',
    filePayslipMonth: 'Mes',
    fileUploadSuccess: 'Subido exitosamente',
    fileUploadFail: 'Error al subir: ',
    fileDeleteFail: 'Error al eliminar: ',
    fileSizeLimit: 'El archivo no puede exceder 20MB',
    fileTypeNotSupported: 'Tipo no soportado, suba PDF o imagen',

    // Permissions / Roles
    colRole: 'Permiso',
    roleAdmin: 'Administrador',
    roleSupervisor: 'Supervisor',
    roleStaff: 'Empleado',
    chineseEmployees: 'Empleados Chinos',
    permissionUpdated: 'Permiso actualizado',
    permissionFail: 'Error al actualizar permiso: ',

    // Password
    resetPassword: 'Restablecer contraseña',
    confirmResetPassword: (name) => `¿Restablecer la contraseña de ${name} a 123456?`,
    resetPasswordSuccess: 'Contraseña restablecida a 123456',
    resetPasswordFail: 'Error al restablecer: ',

    // Language
    lang: 'ES',
    switchLang: '中文',
  }
};

// Map internal DB values to translation keys for display
const STATUS_LABEL_MAP = {
  '有合同-在职': 'statusActive',
  '试用期': 'statusTrial',
  '日结/临时': 'statusDaily',
  '已离职': 'statusDeparted',
};

const AREA_LABEL_MAP = {
  '游乐园': 'areaAmusement',
  '零售': 'areaRetail',
  '化妆品': 'areaCosmetics',
  '保安': 'areaSecurity',
  '柜台': 'areaCounter',
  '未分配': 'areaUnassigned',
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('huatai_lang') || 'zh');

  const toggleLang = () => {
    const next = lang === 'zh' ? 'es' : 'zh';
    setLang(next);
    localStorage.setItem('huatai_lang', next);
  };

  const t = (key) => translations[lang]?.[key] ?? translations.zh[key] ?? key;

  const tStatus = (dbValue) => {
    const key = STATUS_LABEL_MAP[dbValue];
    return key ? t(key) : dbValue;
  };

  const tArea = (dbValue) => {
    const key = AREA_LABEL_MAP[dbValue];
    return key ? t(key) : dbValue;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, tStatus, tArea }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
