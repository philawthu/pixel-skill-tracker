import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Skill, SkillCategory, CheckinRecord, TitleUnlock, Equipment, Course, SkillReturn } from '../types';

export interface ExportData {
  version: number;
  exportedAt: string;
  skills: Skill[];
  categories: SkillCategory[];
  checkinRecords: CheckinRecord[];
  titleUnlocks: TitleUnlock[];
  equipments?: Equipment[];
  courses?: Course[];
  skillReturns?: SkillReturn[];
  farmName?: string;
  userName?: string;
}

interface DataManagerProps {
  isOpen: boolean;
  skills: Skill[];
  categories: SkillCategory[];
  checkinRecords: CheckinRecord[];
  titleUnlocks: TitleUnlock[];
  equipments: Equipment[];
  courses: Course[];
  skillReturns: SkillReturn[];
  farmName: string;
  userName: string;
  onImport: (data: ExportData) => void;
  onClose: () => void;
}

/* ─── Excel helpers ─── */

function skillsToRows(skills: Skill[], categories: SkillCategory[]) {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  return skills.map(s => ({
    '技能名称': s.name,
    '图标': s.icon,
    '等级': s.level,
    '经验值': s.exp,
    '总打卡次数': s.totalCheckins,
    '连续天数': s.streak,
    '今日打卡': s.todayCheckins,
    '上次打卡': s.lastCheckin || '',
    '创建时间': s.createdAt,
    '所属分类': catMap.get(s.categoryId) || '未分类',
    '5级称号': s.title5,
    '10级称号': s.title10,
    '15级称号': s.title15,
    '20级称号': s.title20,
    '30级称号': s.title30,
    'ID': s.id,
    '分类ID': s.categoryId,
  }));
}

function categoriesToRows(categories: SkillCategory[]) {
  return categories.map(c => ({
    '分类名称': c.name,
    '图标': c.icon,
    '颜色': c.color,
    '预设分类': c.isPreset ? '是' : '否',
    'ID': c.id,
  }));
}

function recordsToRows(records: CheckinRecord[], skills: Skill[]) {
  const skillMap = new Map(skills.map(s => [s.id, s.name]));
  return records.map(r => ({
    '技能名称': skillMap.get(r.skillId) || '未知技能',
    '日期': r.date,
    '时间': r.time,
    '时间段': r.timeSlot || '',
    '获得经验': r.expGained,
    '备注': r.note || '',
    'ID': r.id,
    '技能ID': r.skillId,
  }));
}

function titlesToRows(unlocks: TitleUnlock[]) {
  return unlocks.map(t => ({
    '技能名称': t.skillName,
    '称号': t.title,
    '解锁等级': t.level,
    '解锁时间': t.unlockedAt,
    '技能ID': t.skillId,
  }));
}

function equipmentsToRows(equipments: Equipment[], skills: Skill[]) {
  const skillMap = new Map(skills.map(s => [s.id, s.name]));
  return equipments.map(e => ({
    '装备名称': e.name,
    '图标': e.icon,
    '所属技能': skillMap.get(e.skillId) || '未知技能',
    '获得日期': e.acquiredDate,
    '获得方式': e.acquiredMethod,
    '价格': e.price,
    '备注': e.note || '',
    '状态': e.retired ? '历史装备' : '当前装备',
    '封存时间': e.retiredAt || '',
    '创建时间': e.createdAt,
    'ID': e.id,
    '技能ID': e.skillId,
  }));
}

function coursesToRows(courses: Course[], skills: Skill[]) {
  const skillMap = new Map(skills.map(s => [s.id, s.name]));
  return courses.map(c => ({
    '课程名称': c.name,
    '所属技能': skillMap.get(c.skillId) || '未知技能',
    '上课日期': c.date,
    '课程时长': c.duration,
    '课程价格': c.price,
    '备注': c.note || '',
    '创建时间': c.createdAt,
    'ID': c.id,
    '技能ID': c.skillId,
  }));
}

function returnsToRows(returns: SkillReturn[], skills: Skill[]) {
  const skillMap = new Map(skills.map(s => [s.id, s.name]));
  const catLabels: Record<string, string> = {
    money: '金钱收入', emotion: '好心情', social: '人际关系',
    health: '健康提升', growth: '个人成长', other: '其他收获',
  };
  return returns.map(r => ({
    '收获标题': r.title,
    '类别': catLabels[r.category] || r.category,
    '所属技能': skillMap.get(r.skillId) || '未知技能',
    '收获日期': r.date,
    '金额': r.moneyAmount || '',
    '详细描述': r.description || '',
    '备注': r.note || '',
    '创建时间': r.createdAt,
    'ID': r.id,
    '技能ID': r.skillId,
    '类别Key': r.category,
  }));
}

/* ─── Excel 导入解析 ─── */

function parseExcelToExportData(workbook: XLSX.WorkBook): ExportData {
  // Parse settings sheet (farm name / user name)
  let farmName: string | undefined;
  let userName: string | undefined;
  const settingsSheet = workbook.Sheets['设置'];
  if (settingsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(settingsSheet);
    for (const row of rows) {
      const key = String(row['配置项'] || '');
      const val = String(row['值'] || '');
      if (key === '农场名' && val) farmName = val;
      if (key === '冒险者名' && val) userName = val;
    }
  }

  // Parse categories sheet
  const catSheet = workbook.Sheets['分类'];
  const categories: SkillCategory[] = [];
  if (catSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(catSheet);
    for (const row of rows) {
      categories.push({
        id: String(row['ID'] || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        name: String(row['分类名称'] || ''),
        icon: String(row['图标'] || '📁'),
        color: String(row['颜色'] || '#8b4513'),
        isPreset: row['预设分类'] === '是',
      });
    }
  }

  // Parse skills sheet
  const skillSheet = workbook.Sheets['技能'];
  const skills: Skill[] = [];
  if (skillSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(skillSheet);
    for (const row of rows) {
      const catName = String(row['所属分类'] || '');
      let categoryId = String(row['分类ID'] || '');
      // If no categoryId, try matching by name
      if (!categoryId && catName) {
        const found = categories.find(c => c.name === catName);
        if (found) categoryId = found.id;
      }
      skills.push({
        id: String(row['ID'] || `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        name: String(row['技能名称'] || ''),
        icon: String(row['图标'] || '🎯'),
        level: Number(row['等级']) || 1,
        exp: Number(row['经验值']) || 0,
        totalCheckins: Number(row['总打卡次数']) || 0,
        streak: Number(row['连续天数']) || 0,
        todayCheckins: Number(row['今日打卡']) || 0,
        lastCheckin: String(row['上次打卡'] || '') || null,
        createdAt: String(row['创建时间'] || new Date().toISOString().split('T')[0]),
        categoryId: categoryId || 'cat-sports',
        title5: String(row['5级称号'] || ''),
        title10: String(row['10级称号'] || ''),
        title15: String(row['15级称号'] || ''),
        title20: String(row['20级称号'] || ''),
        title30: String(row['30级称号'] || ''),
      });
    }
  }

  // Parse checkin records sheet
  const recordSheet = workbook.Sheets['打卡记录'];
  const checkinRecords: CheckinRecord[] = [];
  if (recordSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(recordSheet);
    for (const row of rows) {
      let skillId = String(row['技能ID'] || '');
      // If no skillId, try matching by name
      if (!skillId) {
        const skillName = String(row['技能名称'] || '');
        const found = skills.find(s => s.name === skillName);
        if (found) skillId = found.id;
      }
      checkinRecords.push({
        id: String(row['ID'] || `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        skillId,
        date: String(row['日期'] || ''),
        time: String(row['时间'] || ''),
        timeSlot: String(row['时间段'] || ''),
        expGained: Number(row['获得经验']) || 10,
        note: String(row['备注'] || ''),
      });
    }
  }

  // Parse title unlocks sheet
  const titleSheet = workbook.Sheets['已解锁称号'];
  const titleUnlocks: TitleUnlock[] = [];
  if (titleSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(titleSheet);
    for (const row of rows) {
      titleUnlocks.push({
        skillId: String(row['技能ID'] || ''),
        skillName: String(row['技能名称'] || ''),
        title: String(row['称号'] || ''),
        level: Number(row['解锁等级']) || 0,
        unlockedAt: String(row['解锁时间'] || ''),
      });
    }
  }

  // Parse equipments sheet
  const equipSheet = workbook.Sheets['装备背包'];
  const equipments: Equipment[] = [];
  if (equipSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(equipSheet);
    for (const row of rows) {
      let skillId = String(row['技能ID'] || '');
      if (!skillId) {
        const skillName = String(row['所属技能'] || '');
        const found = skills.find(s => s.name === skillName);
        if (found) skillId = found.id;
      }
      const statusStr = String(row['状态'] || '');
      const isRetired = statusStr === '历史装备';
      equipments.push({
        id: String(row['ID'] || `equip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        skillId,
        name: String(row['装备名称'] || ''),
        icon: String(row['图标'] || '🎒'),
        acquiredDate: String(row['获得日期'] || ''),
        acquiredMethod: String(row['获得方式'] || '未说明'),
        price: String(row['价格'] || '未填写'),
        note: String(row['备注'] || '') || undefined,
        createdAt: String(row['创建时间'] || new Date().toISOString()),
        retired: isRetired || undefined,
        retiredAt: String(row['封存时间'] || '') || undefined,
      });
    }
  }

  // Parse courses sheet
  const courseSheet = workbook.Sheets['已上课程'];
  const courses: Course[] = [];
  if (courseSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(courseSheet);
    for (const row of rows) {
      let skillId = String(row['技能ID'] || '');
      if (!skillId) {
        const skillName = String(row['所属技能'] || '');
        const found = skills.find(s => s.name === skillName);
        if (found) skillId = found.id;
      }
      courses.push({
        id: String(row['ID'] || `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        skillId,
        name: String(row['课程名称'] || ''),
        date: String(row['上课日期'] || ''),
        duration: String(row['课程时长'] || '未填写'),
        price: String(row['课程价格'] || '未填写'),
        note: String(row['备注'] || '') || undefined,
        createdAt: String(row['创建时间'] || new Date().toISOString()),
      });
    }
  }

  // Parse skill returns sheet
  const returnSheet = workbook.Sheets['技能复利'];
  const skillReturns: SkillReturn[] = [];
  if (returnSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(returnSheet);
    const catKeyMap: Record<string, string> = {
      '金钱收入': 'money', '好心情': 'emotion', '人际关系': 'social',
      '健康提升': 'health', '个人成长': 'growth', '其他收获': 'other',
    };
    for (const row of rows) {
      let skillId = String(row['技能ID'] || '');
      if (!skillId) {
        const skillName = String(row['所属技能'] || '');
        const found = skills.find(s => s.name === skillName);
        if (found) skillId = found.id;
      }
      const catLabel = String(row['类别'] || '');
      const catKey = String(row['类别Key'] || '') || catKeyMap[catLabel] || 'other';
      skillReturns.push({
        id: String(row['ID'] || `return-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        skillId,
        title: String(row['收获标题'] || ''),
        category: catKey as SkillReturn['category'],
        date: String(row['收获日期'] || ''),
        moneyAmount: String(row['金额'] || '') || undefined,
        description: String(row['详细描述'] || ''),
        note: String(row['备注'] || '') || undefined,
        createdAt: String(row['创建时间'] || new Date().toISOString()),
      });
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    skills,
    categories,
    checkinRecords,
    titleUnlocks,
    equipments,
    courses,
    skillReturns,
    farmName,
    userName,
  };
}

/* ─── Component ─── */

export function DataManager({
  isOpen,
  skills,
  categories,
  checkinRecords,
  titleUnlocks,
  equipments,
  courses,
  skillReturns,
  farmName,
  userName,
  onImport,
  onClose,
}: DataManagerProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [previewData, setPreviewData] = useState<ExportData | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  /* ─── Export JSON ─── */
  const handleExportJSON = () => {
    const data: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      skills,
      categories,
      checkinRecords,
      titleUnlocks,
      equipments,
      courses,
      skillReturns,
      farmName,
      userName,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `pixel-skill-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ─── Export Excel ─── */
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 0: Settings (farm name / user name)
    const settingsRows = [
      { '配置项': '农场名', '值': farmName },
      { '配置项': '冒险者名', '值': userName },
    ];
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
    wsSettings['!cols'] = [{ wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSettings, '设置');

    // Sheet 1: Skills overview
    const skillRows = skillsToRows(skills, categories);
    const wsSkills = XLSX.utils.json_to_sheet(skillRows);
    // Set column widths
    wsSkills['!cols'] = [
      { wch: 12 }, // 技能名称
      { wch: 5 },  // 图标
      { wch: 6 },  // 等级
      { wch: 8 },  // 经验值
      { wch: 10 }, // 总打卡次数
      { wch: 8 },  // 连续天数
      { wch: 8 },  // 今日打卡
      { wch: 12 }, // 上次打卡
      { wch: 12 }, // 创建时间
      { wch: 10 }, // 所属分类
      { wch: 12 }, // 5级称号
      { wch: 12 }, // 10级称号
      { wch: 12 }, // 15级称号
      { wch: 12 }, // 20级称号
      { wch: 12 }, // 30级称号
      { wch: 24 }, // ID
      { wch: 14 }, // 分类ID
    ];
    XLSX.utils.book_append_sheet(wb, wsSkills, '技能');

    // Sheet 2: Categories
    const catRows = categoriesToRows(categories);
    const wsCat = XLSX.utils.json_to_sheet(catRows);
    wsCat['!cols'] = [
      { wch: 12 }, // 分类名称
      { wch: 5 },  // 图标
      { wch: 10 }, // 颜色
      { wch: 8 },  // 预设分类
      { wch: 14 }, // ID
    ];
    XLSX.utils.book_append_sheet(wb, wsCat, '分类');

    // Sheet 3: Checkin records
    const recRows = recordsToRows(checkinRecords, skills);
    const wsRec = XLSX.utils.json_to_sheet(recRows);
    wsRec['!cols'] = [
      { wch: 12 }, // 技能名称
      { wch: 12 }, // 日期
      { wch: 10 }, // 时间
      { wch: 8 },  // 获得经验
      { wch: 30 }, // 备注
      { wch: 24 }, // ID
      { wch: 24 }, // 技能ID
    ];
    XLSX.utils.book_append_sheet(wb, wsRec, '打卡记录');

    // Sheet 4: Title unlocks
    const titleRows = titlesToRows(titleUnlocks);
    const wsTitle = XLSX.utils.json_to_sheet(titleRows);
    wsTitle['!cols'] = [
      { wch: 12 }, // 技能名称
      { wch: 14 }, // 称号
      { wch: 8 },  // 解锁等级
      { wch: 20 }, // 解锁时间
      { wch: 24 }, // 技能ID
    ];
    XLSX.utils.book_append_sheet(wb, wsTitle, '已解锁称号');

    // Sheet 5: Equipments
    const equipRows = equipmentsToRows(equipments, skills);
    const wsEquip = XLSX.utils.json_to_sheet(equipRows);
    wsEquip['!cols'] = [
      { wch: 14 }, // 装备名称
      { wch: 5 },  // 图标
      { wch: 12 }, // 所属技能
      { wch: 12 }, // 获得日期
      { wch: 14 }, // 获得方式
      { wch: 10 }, // 价格
      { wch: 20 }, // 备注
      { wch: 10 }, // 状态
      { wch: 20 }, // 封存时间
      { wch: 20 }, // 创建时间
      { wch: 24 }, // ID
      { wch: 24 }, // 技能ID
    ];
    XLSX.utils.book_append_sheet(wb, wsEquip, '装备背包');

    // Sheet 6: Courses
    const courseRows = coursesToRows(courses, skills);
    const wsCourse = XLSX.utils.json_to_sheet(courseRows);
    wsCourse['!cols'] = [
      { wch: 18 }, // 课程名称
      { wch: 12 }, // 所属技能
      { wch: 12 }, // 上课日期
      { wch: 12 }, // 课程时长
      { wch: 10 }, // 课程价格
      { wch: 20 }, // 备注
      { wch: 20 }, // 创建时间
      { wch: 24 }, // ID
      { wch: 24 }, // 技能ID
    ];
    XLSX.utils.book_append_sheet(wb, wsCourse, '已上课程');

    // Sheet 7: Skill Returns
    const returnRows = returnsToRows(skillReturns, skills);
    const wsReturns = XLSX.utils.json_to_sheet(returnRows);
    wsReturns['!cols'] = [
      { wch: 18 }, // 收获标题
      { wch: 10 }, // 类别
      { wch: 12 }, // 所属技能
      { wch: 12 }, // 收获日期
      { wch: 12 }, // 金额
      { wch: 30 }, // 详细描述
      { wch: 20 }, // 备注
      { wch: 20 }, // 创建时间
      { wch: 24 }, // ID
      { wch: 24 }, // 技能ID
      { wch: 10 }, // 类别Key
    ];
    XLSX.utils.book_append_sheet(wb, wsReturns, '技能复利');

    // Download
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `pixel-skill-backup-${dateStr}.xlsx`);
  };

  /* ─── Import file (JSON or Excel) ─── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      // JSON import (existing logic)
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          validateImportData(raw);
          setPreviewData(raw as ExportData);
          setImportStatus('preview');
          setImportError('');
        } catch (err) {
          setImportError(err instanceof Error ? err.message : '文件解析失败');
          setImportStatus('error');
          setPreviewData(null);
        }
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      // Excel import
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Check required sheets
          const sheetNames = workbook.SheetNames;
          if (!sheetNames.includes('技能')) {
            throw new Error('Excel 文件缺少"技能"工作表。请确保使用本系统导出的格式。');
          }

          const parsed = parseExcelToExportData(workbook);

          if (parsed.skills.length === 0) {
            throw new Error('Excel 文件中没有找到有效的技能数据');
          }

          setPreviewData(parsed);
          setImportStatus('preview');
          setImportError('');
        } catch (err) {
          setImportError(err instanceof Error ? err.message : 'Excel 文件解析失败');
          setImportStatus('error');
          setPreviewData(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('不支持的文件格式，请选择 .json 或 .xlsx 文件');
      setImportStatus('error');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateImportData = (raw: Record<string, unknown>) => {
    if (!raw.skills || !Array.isArray(raw.skills)) {
      throw new Error('无效的数据格式：缺少 skills 字段');
    }
    if (!raw.categories || !Array.isArray(raw.categories)) {
      throw new Error('无效的数据格式：缺少 categories 字段');
    }
    if (!raw.checkinRecords || !Array.isArray(raw.checkinRecords)) {
      throw new Error('无效的数据格式：缺少 checkinRecords 字段');
    }
    if (!raw.titleUnlocks || !Array.isArray(raw.titleUnlocks)) {
      throw new Error('无效的数据格式：缺少 titleUnlocks 字段');
    }
    for (const skill of raw.skills as Array<Record<string, unknown>>) {
      if (!skill.id || !skill.name || typeof skill.level !== 'number') {
        throw new Error(`无效的技能数据：${skill.name || '未知'}`);
      }
    }
  };

  const handleConfirmImport = () => {
    if (!previewData) return;

    if (importMode === 'replace') {
      onImport(previewData);
    } else {
      // Merge mode: combine data, dedup by id
      const mergedSkills = [...skills];
      for (const s of previewData.skills) {
        if (!mergedSkills.some(ms => ms.id === s.id)) {
          mergedSkills.push(s);
        }
      }

      const mergedCategories = [...categories];
      for (const c of previewData.categories) {
        if (!mergedCategories.some(mc => mc.id === c.id)) {
          mergedCategories.push(c);
        }
      }

      const mergedRecords = [...checkinRecords];
      for (const r of previewData.checkinRecords) {
        if (!mergedRecords.some(mr => mr.id === r.id)) {
          mergedRecords.push(r);
        }
      }

      const mergedUnlocks = [...titleUnlocks];
      for (const t of previewData.titleUnlocks) {
        if (!mergedUnlocks.some(mt => mt.skillId === t.skillId && mt.level === t.level)) {
          mergedUnlocks.push(t);
        }
      }

      const mergedEquipments = [...equipments];
      for (const e of (previewData.equipments || [])) {
        if (!mergedEquipments.some(me => me.id === e.id)) {
          mergedEquipments.push(e);
        }
      }

      const mergedCourses = [...courses];
      for (const c of (previewData.courses || [])) {
        if (!mergedCourses.some(mc => mc.id === c.id)) {
          mergedCourses.push(c);
        }
      }

      const mergedReturns = [...skillReturns];
      for (const r of (previewData.skillReturns || [])) {
        if (!mergedReturns.some(mr => mr.id === r.id)) {
          mergedReturns.push(r);
        }
      }

      onImport({
        ...previewData,
        skills: mergedSkills,
        categories: mergedCategories,
        checkinRecords: mergedRecords,
        titleUnlocks: mergedUnlocks,
        equipments: mergedEquipments,
        courses: mergedCourses,
        skillReturns: mergedReturns,
      });
    }

    setImportStatus('success');
    setPreviewData(null);
    setTimeout(() => {
      setImportStatus('idle');
    }, 2000);
  };

  const handleReset = () => {
    setImportStatus('idle');
    setImportError('');
    setPreviewData(null);
  };

  // Stats for current data
  const totalCheckins = checkinRecords.length;
  const totalExp = skills.reduce((sum, s) => sum + s.exp, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="pixel-card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] text-[#3d2010]">💾 数据管理</h2>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="pixel-btn bg-[#cd5c5c] text-white px-2 py-1 text-[8px]"
          >
            ✕ 关闭
          </button>
        </div>

        {/* Current Data Stats */}
        <div className="bg-[#fff8dc] p-3 pixel-border-light mb-4">
          <h3 className="text-[9px] text-[#3d2010] mb-2">📊 当前数据概览</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-[8px] text-[#5c3a21]">
              🗡️ 技能数量: <span className="text-[#32cd32]">{skills.length}</span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              📋 打卡记录: <span className="text-[#4169e1]">{totalCheckins}</span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              ⭐ 总经验值: <span className="text-[#daa520]">{totalExp}</span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              🏅 已解锁称号: <span className="text-[#cd5c5c]">{titleUnlocks.length}</span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              🎒 装备数量: <span className="text-[#8b4513]">{equipments.length}</span>
              <span className="text-[6px] text-[#8b4513]/60 ml-1">
                (当前 {equipments.filter(e => !e.retired).length} / 历史 {equipments.filter(e => e.retired).length})
              </span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              📖 课程数量: <span className="text-[#4169e1]">{courses.length}</span>
            </div>
            <div className="text-[8px] text-[#5c3a21]">
              🌟 技能复利: <span className="text-[#f39c12]">{skillReturns.length}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#deb887] rounded-full mb-4" />

        {/* Export Section */}
        <div className="mb-4">
          <h3 className="text-[9px] text-[#3d2010] mb-2">📤 导出数据</h3>
          <p className="text-[7px] text-[#8b4513] mb-3">
            选择导出格式：Excel 更易读适合查看，JSON 适合完整备份
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="pixel-btn bg-[#217346] text-white px-3 py-2 text-[9px] flex-1"
            >
              📊 导出 Excel
            </button>
            <button
              onClick={handleExportJSON}
              className="pixel-btn bg-[#32cd32] text-[#1a3a1a] px-3 py-2 text-[9px] flex-1"
            >
              📄 导出 JSON
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-[#e8f5e9] p-2 rounded">
              <p className="text-[7px] text-[#2e7d32] font-bold">📊 Excel (.xlsx)</p>
              <p className="text-[6px] text-[#5c3a21] mt-0.5">4个工作表: 技能 / 分类 / 打卡记录 / 称号</p>
              <p className="text-[6px] text-[#5c3a21]">可直接用 Excel 或 WPS 打开阅读</p>
            </div>
            <div className="bg-[#f1f8e9] p-2 rounded">
              <p className="text-[7px] text-[#33691e] font-bold">📄 JSON</p>
              <p className="text-[6px] text-[#5c3a21] mt-0.5">原始格式，保留所有字段</p>
              <p className="text-[6px] text-[#5c3a21]">适合程序化处理和完整备份</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#deb887] rounded-full mb-4" />

        {/* Import Section */}
        <div>
          <h3 className="text-[9px] text-[#3d2010] mb-2">📥 导入数据</h3>

          {importStatus === 'idle' && (
            <>
              <p className="text-[7px] text-[#8b4513] mb-2">
                支持导入 <span className="text-[#217346] font-bold">.xlsx</span> (Excel) 和 <span className="text-[#4169e1] font-bold">.json</span> 格式的备份文件
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="pixel-btn bg-[#4169e1] text-white px-4 py-2 text-[9px] w-full"
              >
                📂 选择备份文件 (.xlsx / .json)
              </button>
            </>
          )}

          {importStatus === 'error' && (
            <div className="bg-[#ffe4e1] p-3 pixel-border-light mb-3">
              <p className="text-[8px] text-[#cd5c5c] mb-2">❌ 导入失败</p>
              <p className="text-[7px] text-[#8b4513] mb-3">{importError}</p>
              <button
                onClick={handleReset}
                className="pixel-btn bg-[#daa520] text-[#3d2010] px-3 py-1 text-[8px]"
              >
                🔄 重新选择
              </button>
            </div>
          )}

          {importStatus === 'preview' && previewData && (
            <div>
              {/* Preview data summary */}
              <div className="bg-[#e8f5e9] p-3 pixel-border-light mb-3">
                <h4 className="text-[8px] text-[#2e7d32] mb-2">📋 文件预览</h4>
                {previewData.exportedAt && (
                  <p className="text-[7px] text-[#5c3a21] mb-1">
                    导出时间: {new Date(previewData.exportedAt).toLocaleString('zh-CN')}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <div className="text-[7px] text-[#5c3a21]">
                    🗡️ 技能: {previewData.skills.length}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    📋 打卡: {previewData.checkinRecords.length}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    🗂️ 分类: {previewData.categories.length}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    🏅 称号: {previewData.titleUnlocks.length}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    🎒 装备: {previewData.equipments?.length || 0}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    📖 课程: {previewData.courses?.length || 0}
                  </div>
                  <div className="text-[7px] text-[#5c3a21]">
                    🌟 复利: {previewData.skillReturns?.length || 0}
                  </div>
                </div>

                {/* Skill names preview */}
                <div className="mt-2 pt-2 border-t border-[#a5d6a7]">
                  <p className="text-[7px] text-[#2e7d32] mb-1">包含技能:</p>
                  <div className="flex flex-wrap gap-1">
                    {previewData.skills.slice(0, 10).map(s => (
                      <span
                        key={s.id}
                        className="text-[7px] bg-[#c8e6c9] text-[#1b5e20] px-1.5 py-0.5 rounded"
                      >
                        {s.icon} {s.name} Lv.{s.level}
                      </span>
                    ))}
                    {previewData.skills.length > 10 && (
                      <span className="text-[7px] text-[#5c3a21]">
                        +{previewData.skills.length - 10} 更多...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Import mode selection */}
              <div className="mb-3">
                <p className="text-[8px] text-[#3d2010] mb-2">导入方式:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`pixel-btn px-3 py-1.5 text-[8px] flex-1 ${
                      importMode === 'merge'
                        ? 'bg-[#4169e1] text-white'
                        : 'bg-[#f5deb3] text-[#5c3a21]'
                    }`}
                  >
                    🔀 合并
                  </button>
                  <button
                    onClick={() => setImportMode('replace')}
                    className={`pixel-btn px-3 py-1.5 text-[8px] flex-1 ${
                      importMode === 'replace'
                        ? 'bg-[#cd5c5c] text-white'
                        : 'bg-[#f5deb3] text-[#5c3a21]'
                    }`}
                  >
                    🔄 覆盖
                  </button>
                </div>
                <p className="text-[7px] text-[#8b4513] mt-1">
                  {importMode === 'merge'
                    ? '💡 合并模式：保留现有数据，仅添加文件中新增的部分'
                    : '⚠️ 覆盖模式：用文件数据完全替换当前数据'}
                </p>
              </div>

              {/* Confirm / Cancel */}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="pixel-btn bg-[#deb887] text-[#5c3a21] px-3 py-2 text-[8px] flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmImport}
                  className={`pixel-btn px-3 py-2 text-[8px] flex-1 text-white ${
                    importMode === 'replace' ? 'bg-[#cd5c5c]' : 'bg-[#32cd32]'
                  }`}
                >
                  {importMode === 'replace' ? '⚠️ 确认覆盖' : '✅ 确认合并'}
                </button>
              </div>
            </div>
          )}

          {importStatus === 'success' && (
            <div className="bg-[#e8f5e9] p-3 pixel-border-light text-center">
              <p className="text-[10px] text-[#2e7d32]">✅ 导入成功！</p>
              <p className="text-[7px] text-[#5c3a21] mt-1">数据已更新</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
