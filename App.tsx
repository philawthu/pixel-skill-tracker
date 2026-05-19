import { useState, useCallback, useEffect } from 'react';
import type { Skill, SkillCategory, TitleUnlock, CheckinRecord, Equipment, Course, SkillReturn } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  generateId,
  getTodayString,
  getTimeString,
  calculateLevel,
  getDefaultTitles,
  getDefaultCategoryId,
  SKILL_ICONS,
  PRESET_CATEGORIES,
} from './utils';
import { HomePage } from './components/HomePage';
import { SkillDetailPage } from './components/SkillDetailPage';
import { BackpackPage } from './components/BackpackPage';
import { CheckinPage } from './components/CheckinPage';
import { CoursesPage } from './components/CoursesPage';
import { ReturnsPage } from './components/ReturnsPage';
import { AddSkillModal } from './components/AddSkillModal';
import { TitleUnlockModal } from './components/TitleUnlockModal';
import { CategoryManager } from './components/CategoryManager';
import { DataManager } from './components/DataManager';
import CloudSyncPanel from './components/CloudSyncPanel';
import type { SyncData, CloudData } from './cloudSync';

type Page = { type: 'home' } | { type: 'checkin' } | { type: 'detail'; skillId: string } | { type: 'backpack' } | { type: 'courses' } | { type: 'returns' };

function App() {
  const [skills, setSkills] = useLocalStorage<Skill[]>('pixel-skills', []);
  const [categories, setCategories] = useLocalStorage<SkillCategory[]>('pixel-categories', PRESET_CATEGORIES);
  const [checkinRecords, setCheckinRecords] = useLocalStorage<CheckinRecord[]>('pixel-checkin-records', []);
  const [titleUnlocks, setTitleUnlocks] = useLocalStorage<TitleUnlock[]>('pixel-title-unlocks', []);
  const [equipments, setEquipments] = useLocalStorage<Equipment[]>('pixel-equipments', []);
  const [courses, setCourses] = useLocalStorage<Course[]>('pixel-courses', []);
  const [skillReturns, setSkillReturns] = useLocalStorage<SkillReturn[]>('pixel-skill-returns', []);
  const [page, setPage] = useState<Page>({ type: 'home' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [currentUnlock, setCurrentUnlock] = useState<TitleUnlock | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [farmName, setFarmName] = useLocalStorage<string>('pixel-farm-name', '星露谷');
  const [userName, setUserName] = useLocalStorage<string>('pixel-user-name', '冒险家');
  const [editingField, setEditingField] = useState<'farm' | 'user' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showExportReminder, setShowExportReminder] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);

  // 确保预设分类都存在（旧数据兼容）
  useEffect(() => {
    const existingIds = new Set(categories.map(c => c.id));
    const missing = PRESET_CATEGORIES.filter(c => !existingIds.has(c.id));
    if (missing.length > 0) {
      setCategories(prev => [...missing, ...prev]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 旧数据兼容：为没有 categoryId 的技能自动分配分类
  useEffect(() => {
    const needsMigration = skills.some(s => !s.categoryId);
    if (needsMigration) {
      setSkills(prev =>
        prev.map(s =>
          s.categoryId ? s : { ...s, categoryId: getDefaultCategoryId(s.name) }
        )
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a new skill (now with categoryId)
  const handleAddSkill = useCallback((name: string, icon: string, categoryId: string) => {
    if (skills.some(s => s.name === name)) return;
    const titles = getDefaultTitles(name);
    const newSkill: Skill = {
      id: generateId(),
      name,
      icon: icon || SKILL_ICONS[name] || '⭐',
      level: 1,
      exp: 0,
      totalCheckins: 0,
      streak: 0,
      lastCheckin: null,
      todayCheckins: 0,
      createdAt: new Date().toISOString(),
      title5: titles.title5,
      title10: titles.title10,
      title15: titles.title15,
      title20: titles.title20,
      title30: titles.title30,
      categoryId,
    };
    setSkills(prev => [...prev, newSkill]);
  }, [skills, setSkills]);

  // Check in for a skill
  const handleCheckin = useCallback((skillId: string, note: string, timeSlot: string) => {
    const today = getTodayString();
    const time = getTimeString();

    const record: CheckinRecord = {
      id: generateId(),
      skillId,
      date: today,
      time,
      timeSlot: timeSlot || '',
      expGained: 10,
      note,
    };
    setCheckinRecords(prev => [...prev, record]);

    // 检查是否是该技能今天的第一次打卡，如果是则弹出导出提醒
    const targetSkill = skills.find(s => s.id === skillId);
    if (targetSkill && targetSkill.lastCheckin !== today) {
      setShowExportReminder(true);
      setTimeout(() => setShowExportReminder(false), 4000);
    }

    setSkills(prev => {
      return prev.map(skill => {
        if (skill.id !== skillId) return skill;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = skill.streak;
        if (skill.lastCheckin === today) {
          newStreak = skill.streak;
        } else if (skill.lastCheckin === yesterdayStr) {
          newStreak = skill.streak + 1;
        } else {
          newStreak = 1;
        }

        const newTodayCheckins = skill.lastCheckin === today ? skill.todayCheckins + 1 : 1;
        const newExp = skill.exp + 10;
        const newLevel = calculateLevel(newExp);
        const oldLevel = skill.level;

        const milestones: { level: number; titleKey: keyof Skill }[] = [
          { level: 5, titleKey: 'title5' },
          { level: 10, titleKey: 'title10' },
          { level: 15, titleKey: 'title15' },
          { level: 20, titleKey: 'title20' },
          { level: 30, titleKey: 'title30' },
        ];

        for (const milestone of milestones) {
          if (newLevel >= milestone.level && oldLevel < milestone.level) {
            const unlock: TitleUnlock = {
              skillId: skill.id,
              skillName: skill.name,
              title: skill[milestone.titleKey] as string,
              level: milestone.level,
              unlockedAt: new Date().toISOString(),
            };
            setTimeout(() => {
              setCurrentUnlock(unlock);
              setTitleUnlocks(prev => {
                const exists = prev.some(t => t.skillId === unlock.skillId && t.level === unlock.level);
                if (exists) return prev;
                return [...prev, unlock];
              });
            }, 300);
            break;
          }
        }

        return {
          ...skill,
          exp: newExp,
          level: newLevel,
          totalCheckins: skill.totalCheckins + 1,
          streak: newStreak,
          todayCheckins: newTodayCheckins,
          lastCheckin: today,
        };
      });
    });
  }, [skills, setSkills, setCheckinRecords, setTitleUnlocks]);

  // Recalculate streak
  const recalculateStreak = useCallback((skillId: string, allRecords: CheckinRecord[]): number => {
    const skillRecords = allRecords.filter(r => r.skillId === skillId);
    const uniqueDates = [...new Set(skillRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) return 0;

    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterdayStr) return 0;

    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = new Date(uniqueDates[i]);
      const prev = new Date(uniqueDates[i + 1]);
      const diff = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, []);

  // Makeup checkin
  const handleMakeupCheckin = useCallback((skillId: string, date: string, note: string, timeSlot: string) => {
    const record: CheckinRecord = {
      id: generateId(),
      skillId,
      date,
      time: '补卡',
      timeSlot: timeSlot || '',
      expGained: 10,
      note,
    };
    const newRecords = [...checkinRecords, record];
    setCheckinRecords(newRecords);

    setSkills(prev => {
      return prev.map(skill => {
        if (skill.id !== skillId) return skill;

        const newExp = skill.exp + 10;
        const newLevel = calculateLevel(newExp);
        const oldLevel = skill.level;
        const newStreak = recalculateStreak(skillId, newRecords);

        const milestones: { level: number; titleKey: keyof Skill }[] = [
          { level: 5, titleKey: 'title5' },
          { level: 10, titleKey: 'title10' },
          { level: 15, titleKey: 'title15' },
          { level: 20, titleKey: 'title20' },
          { level: 30, titleKey: 'title30' },
        ];

        for (const milestone of milestones) {
          if (newLevel >= milestone.level && oldLevel < milestone.level) {
            const unlock: TitleUnlock = {
              skillId: skill.id,
              skillName: skill.name,
              title: skill[milestone.titleKey] as string,
              level: milestone.level,
              unlockedAt: new Date().toISOString(),
            };
            setTimeout(() => {
              setCurrentUnlock(unlock);
              setTitleUnlocks(prev => {
                const exists = prev.some(t => t.skillId === unlock.skillId && t.level === unlock.level);
                if (exists) return prev;
                return [...prev, unlock];
              });
            }, 300);
            break;
          }
        }

        return {
          ...skill,
          exp: newExp,
          level: newLevel,
          totalCheckins: skill.totalCheckins + 1,
          streak: newStreak,
        };
      });
    });
  }, [checkinRecords, setSkills, setCheckinRecords, setTitleUnlocks, recalculateStreak]);

  // Delete a skill
  const handleDelete = useCallback((skillId: string) => {
    if (deleteConfirm === skillId) {
      setSkills(prev => prev.filter(s => s.id !== skillId));
      setTitleUnlocks(prev => prev.filter(t => t.skillId !== skillId));
      setCheckinRecords(prev => prev.filter(r => r.skillId !== skillId));
      setEquipments(prev => prev.filter(e => e.skillId !== skillId));
      setCourses(prev => prev.filter(c => c.skillId !== skillId));
      setSkillReturns(prev => prev.filter(r => r.skillId !== skillId));
      setDeleteConfirm(null);
      setPage({ type: 'home' });
    } else {
      setDeleteConfirm(skillId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }, [deleteConfirm, setSkills, setTitleUnlocks, setCheckinRecords]);

  // Category management
  const handleAddCategory = useCallback((category: SkillCategory) => {
    setCategories(prev => [...prev, category]);
  }, [setCategories]);

  const handleDeleteCategory = useCallback((categoryId: string) => {
    setSkills(prev =>
      prev.map(s => s.categoryId === categoryId ? { ...s, categoryId: 'cat-life' } : s)
    );
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  }, [setSkills, setCategories]);

  // Equipment handlers
  const handleAddEquipment = useCallback((equipment: Equipment) => {
    setEquipments(prev => [...prev, equipment]);
  }, [setEquipments]);

  const handleDeleteEquipment = useCallback((equipmentId: string) => {
    setEquipments(prev => prev.filter(e => e.id !== equipmentId));
  }, [setEquipments]);

  const handleEditEquipment = useCallback((updated: Equipment) => {
    setEquipments(prev => prev.map(e => e.id === updated.id ? updated : e));
  }, [setEquipments]);

  // Course handlers
  // 添加课程时自动关联一次打卡（包含时间段）
  const handleAddCourse = useCallback((course: Course) => {
    setCourses(prev => [...prev, course]);

    // 解析课程时长为时间段，用于打卡记录
    // 尝试从课程 duration 构造一个时间段
    let autoTimeSlot = '';
    const durationStr = course.duration;
    // 解析课程时长（分钟）
    let durationMinutes = 0;
    const hourMatch = durationStr.match(/([\d.]+)\s*(?:小时|h|hr|hour)/i);
    const minMatch = durationStr.match(/([\d.]+)\s*(?:分钟|分|min|m)/i);
    if (hourMatch) durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
    else if (minMatch) durationMinutes = Math.round(parseFloat(minMatch[1]));
    else {
      const num = parseFloat(durationStr);
      if (!isNaN(num)) durationMinutes = Math.round(num);
    }

    // 如果能解析出时长，以 "09:00" 为起始构造时间段（方便统计）
    if (durationMinutes > 0) {
      const startHour = 9;
      const startMin = 0;
      const endTotalMin = startHour * 60 + startMin + durationMinutes;
      const endH = Math.floor(endTotalMin / 60) % 24;
      const endM = endTotalMin % 60;
      autoTimeSlot = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    const autoNote = `📖 课程打卡：${course.name}`;

    // 如果课程日期是今天，走正常打卡；如果是过去日期，走补卡
    const today = getTodayString();
    if (course.date === today) {
      handleCheckin(course.skillId, autoNote, autoTimeSlot);
    } else if (course.date < today) {
      handleMakeupCheckin(course.skillId, course.date, autoNote, autoTimeSlot);
    } else {
      // 未来日期也记录一次今天的打卡
      handleCheckin(course.skillId, autoNote, autoTimeSlot);
    }
  }, [setCourses, handleCheckin, handleMakeupCheckin]);

  const handleDeleteCourse = useCallback((courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
  }, [setCourses]);

  const handleEditCourse = useCallback((updated: Course) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, [setCourses]);

  // Skill return handlers
  const handleAddReturn = useCallback((ret: SkillReturn) => {
    setSkillReturns(prev => [...prev, ret]);
  }, [setSkillReturns]);

  const handleDeleteReturn = useCallback((returnId: string) => {
    setSkillReturns(prev => prev.filter(r => r.id !== returnId));
  }, [setSkillReturns]);

  const handleEditReturn = useCallback((updated: SkillReturn) => {
    setSkillReturns(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, [setSkillReturns]);

  // Import data
  const handleImportData = useCallback((data: { skills: Skill[]; categories: SkillCategory[]; checkinRecords: CheckinRecord[]; titleUnlocks: TitleUnlock[]; equipments?: Equipment[]; courses?: Course[]; skillReturns?: SkillReturn[]; farmName?: string; userName?: string }) => {
    setSkills(data.skills);
    setCategories(data.categories);
    setCheckinRecords(data.checkinRecords);
    setTitleUnlocks(data.titleUnlocks);
    if (data.equipments) setEquipments(data.equipments);
    if (data.courses) setCourses(data.courses);
    if (data.skillReturns) setSkillReturns(data.skillReturns);
    if (data.farmName) setFarmName(data.farmName);
    if (data.userName) setUserName(data.userName);
  }, [setSkills, setCategories, setCheckinRecords, setTitleUnlocks, setEquipments, setCourses, setSkillReturns, setFarmName, setUserName]);

  // Cloud sync helpers
  const getCurrentSyncData = useCallback((): SyncData => ({
    skills,
    categories,
    checkinRecords,
    titleUnlocks,
    equipments,
    courses,
    skillReturns,
    settings: { farmName, userName },
  }), [skills, categories, checkinRecords, titleUnlocks, equipments, courses, skillReturns, farmName, userName]);

  const handleRestoreFromCloud = useCallback((data: CloudData) => {
    if (data.skills) setSkills(data.skills);
    if (data.categories) setCategories(data.categories);
    if (data.checkinRecords) setCheckinRecords(data.checkinRecords);
    if (data.titleUnlocks) setTitleUnlocks(data.titleUnlocks);
    if (data.equipments) setEquipments(data.equipments);
    if (data.courses) setCourses(data.courses);
    if (data.skillReturns) setSkillReturns(data.skillReturns);
    if (data.settings?.farmName) setFarmName(data.settings.farmName);
    if (data.settings?.userName) setUserName(data.settings.userName);
  }, [setSkills, setCategories, setCheckinRecords, setTitleUnlocks, setEquipments, setCourses, setSkillReturns, setFarmName, setUserName]);

  // Navigate to skill detail
  const handleSkillClick = useCallback((skillId: string) => {
    setPage({ type: 'detail', skillId });
  }, []);

  // Get current skill for detail page
  const currentSkill = page.type === 'detail'
    ? skills.find(s => s.id === page.skillId)
    : null;

  const currentCategory = currentSkill
    ? categories.find(c => c.id === currentSkill.categoryId)
    : undefined;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-6">
        <div className="pixel-card p-4 text-center relative">
          <h1
            className="text-[14px] md:text-[16px] text-[#3d2010] mb-2 cursor-pointer flex items-center justify-center gap-1 flex-wrap"
            onClick={() => setPage({ type: 'home' })}
          >
            <span>⚔️</span>
            {editingField === 'farm' ? (
              <input
                autoFocus
                className="pixel-input bg-[#fff8dc] border-2 border-[#8b4513] text-[#3d2010] text-center w-[80px] md:w-[100px] text-[12px] md:text-[14px] px-1"
                style={{ fontFamily: "'Press Start 2P', cursive" }}
                value={editValue}
                onClick={e => e.stopPropagation()}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && editValue.trim()) {
                    setFarmName(editValue.trim());
                    setEditingField(null);
                  }
                  if (e.key === 'Escape') setEditingField(null);
                }}
                onBlur={() => {
                  if (editValue.trim()) setFarmName(editValue.trim());
                  setEditingField(null);
                }}
                maxLength={8}
              />
            ) : (
              <span
                className="underline decoration-dashed decoration-[#8b4513]/40 underline-offset-4 hover:text-[#c0392b] cursor-text transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setEditValue(farmName);
                  setEditingField('farm');
                }}
                title="点击修改农场名"
              >
                {farmName}
              </span>
            )}
            <span>农场</span>
            {editingField === 'user' ? (
              <input
                autoFocus
                className="pixel-input bg-[#fff8dc] border-2 border-[#8b4513] text-[#3d2010] text-center w-[80px] md:w-[100px] text-[12px] md:text-[14px] px-1"
                style={{ fontFamily: "'Press Start 2P', cursive" }}
                value={editValue}
                onClick={e => e.stopPropagation()}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && editValue.trim()) {
                    setUserName(editValue.trim());
                    setEditingField(null);
                  }
                  if (e.key === 'Escape') setEditingField(null);
                }}
                onBlur={() => {
                  if (editValue.trim()) setUserName(editValue.trim());
                  setEditingField(null);
                }}
                maxLength={8}
              />
            ) : (
              <span
                className="underline decoration-dashed decoration-[#8b4513]/40 underline-offset-4 hover:text-[#c0392b] cursor-text transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setEditValue(userName);
                  setEditingField('user');
                }}
                title="点击修改冒险者名"
              >
                {userName}
              </span>
            )}
            <span>成长记 ⚔️</span>
          </h1>
          <p className="text-[8px] text-[#8b4513]">
            每日打卡 · 升级技能 · 解锁称号
          </p>
          {/* 数据管理 & 云同步按钮 */}
          <div className="absolute top-3 right-3 flex gap-1">
            <button
              onClick={() => setShowCloudSync(true)}
              className="pixel-btn bg-[#2563eb] text-white px-2 py-1 text-[7px]"
              title="云端同步"
            >
              ☁️
            </button>
            <button
              onClick={() => setShowDataManager(true)}
              className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-2 py-1 text-[7px]"
              title="数据管理"
            >
              💾
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto">
        {page.type === 'home' && (
          <HomePage
            skills={skills}
            categories={categories}
            checkinRecords={checkinRecords}
            titleUnlocks={titleUnlocks}
            equipments={equipments}
            courses={courses}
            skillReturns={skillReturns}
            onSkillClick={handleSkillClick}
            onAddSkill={() => setShowAddModal(true)}
            onManageCategories={() => setShowCategoryManager(true)}
            onOpenBackpack={() => setPage({ type: 'backpack' })}
            onOpenCourses={() => setPage({ type: 'courses' })}
            onOpenReturns={() => setPage({ type: 'returns' })}
            onGoCheckin={() => setPage({ type: 'checkin' })}
          />
        )}

        {page.type === 'checkin' && (
          <CheckinPage
            skills={skills}
            categories={categories}
            checkinRecords={checkinRecords}
            onCheckin={handleCheckin}
            onMakeupCheckin={handleMakeupCheckin}
            onDelete={handleDelete}
            onAddSkill={() => setShowAddModal(true)}
            onBack={() => setPage({ type: 'home' })}
            onSkillDetail={handleSkillClick}
          />
        )}

        {page.type === 'detail' && currentSkill && (
          <SkillDetailPage
            skill={currentSkill}
            category={currentCategory}
            records={checkinRecords.filter(r => r.skillId === currentSkill.id)}
            equipments={equipments}
            courses={courses}
            returns={skillReturns}
            onCheckin={handleCheckin}
            onMakeupCheckin={handleMakeupCheckin}
            onDelete={handleDelete}
            onAddEquipment={handleAddEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onEditEquipment={handleEditEquipment}
            onAddCourse={handleAddCourse}
            onDeleteCourse={handleDeleteCourse}
            onEditCourse={handleEditCourse}
            onAddReturn={handleAddReturn}
            onDeleteReturn={handleDeleteReturn}
            onEditReturn={handleEditReturn}
            onBack={() => setPage({ type: 'home' })}
          />
        )}

        {page.type === 'backpack' && (
          <BackpackPage
            skills={skills}
            equipments={equipments}
            courses={courses}
            skillReturns={skillReturns}
            onBack={() => setPage({ type: 'home' })}
            onSkillClick={handleSkillClick}
          />
        )}

        {page.type === 'courses' && (
          <CoursesPage
            skills={skills}
            courses={courses}
            onBack={() => setPage({ type: 'home' })}
            onSkillClick={handleSkillClick}
          />
        )}

        {page.type === 'returns' && (
          <ReturnsPage
            skills={skills}
            skillReturns={skillReturns}
            onBack={() => setPage({ type: 'home' })}
            onSkillClick={handleSkillClick}
          />
        )}

        {page.type === 'detail' && !currentSkill && (
          <div className="pixel-card p-8 text-center">
            <p className="text-[10px] text-[#3d2010] mb-4">技能不存在</p>
            <button
              onClick={() => setPage({ type: 'home' })}
              className="pixel-btn bg-[#daa520] text-[#3d2010] px-4 py-2 text-[10px]"
            >
              返回首页
            </button>
          </div>
        )}

        {/* Delete Confirmation Toast */}
        {deleteConfirm && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pixel-card p-3 text-[8px] text-[#cd5c5c] z-40">
            ⚠️ 再次点击 ✕ 确认删除
          </div>
        )}

        {/* Export Reminder Toast */}
        {showExportReminder && (
          <div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pixel-card px-4 py-3 bg-[#fff8dc] border-2 border-[#daa520] shadow-lg animate-fade-in-down flex items-center gap-2"
            onClick={() => {
              setShowExportReminder(false);
              setShowDataManager(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="text-[10px]">💾</span>
            <span className="text-[8px] text-[#8b4513]">打卡成功！请及时导出数据备份</span>
            <span className="text-[7px] text-[#daa520] ml-2">点击导出 →</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-8 text-center">
        <p className="text-[7px] text-[#8fbc8f]/60">
          🎮 Pixel Skill Tracker · 本地存储 + ☁️ 云端同步
        </p>
      </footer>

      {/* Modals */}
      <AddSkillModal
        isOpen={showAddModal}
        categories={categories}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSkill}
        onAddCategory={handleAddCategory}
      />
      <TitleUnlockModal
        unlock={currentUnlock}
        onClose={() => setCurrentUnlock(null)}
      />
      <CategoryManager
        isOpen={showCategoryManager}
        categories={categories}
        onClose={() => setShowCategoryManager(false)}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />
      <DataManager
        isOpen={showDataManager}
        skills={skills}
        categories={categories}
        checkinRecords={checkinRecords}
        titleUnlocks={titleUnlocks}
        equipments={equipments}
        courses={courses}
        skillReturns={skillReturns}
        farmName={farmName}
        userName={userName}
        onImport={handleImportData}
        onClose={() => setShowDataManager(false)}
      />
      <CloudSyncPanel
        isOpen={showCloudSync}
        onClose={() => setShowCloudSync(false)}
        getCurrentData={getCurrentSyncData}
        onRestoreData={handleRestoreFromCloud}
      />
    </div>
  );
}

export default App;
