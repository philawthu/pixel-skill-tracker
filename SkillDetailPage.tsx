import type { Skill, CheckinRecord, SkillCategory, Equipment, Course, SkillReturn } from '../types';
import { SkillCard } from './SkillCard';
import { EquipmentPanel } from './EquipmentPanel';
import { CoursePanel } from './CoursePanel';
import { ReturnPanel } from './ReturnPanel';
import { SkillSummaryPanel } from './SkillSummaryPanel';

interface SkillDetailPageProps {
  skill: Skill;
  category: SkillCategory | undefined;
  records: CheckinRecord[];
  equipments: Equipment[];
  courses: Course[];
  returns: SkillReturn[];
  onCheckin: (skillId: string, note: string, timeSlot: string) => void;
  onMakeupCheckin: (skillId: string, date: string, note: string, timeSlot: string) => void;
  onDelete: (skillId: string) => void;
  onAddEquipment: (equipment: Equipment) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  onEditEquipment: (equipment: Equipment) => void;
  onAddCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onEditCourse: (course: Course) => void;
  onAddReturn: (ret: SkillReturn) => void;
  onDeleteReturn: (returnId: string) => void;
  onEditReturn: (ret: SkillReturn) => void;
  onBack: () => void;
}

export function SkillDetailPage({
  skill,
  category,
  records,
  equipments,
  courses,
  returns,
  onCheckin,
  onMakeupCheckin,
  onDelete,
  onAddEquipment,
  onDeleteEquipment,
  onEditEquipment,
  onAddCourse,
  onDeleteCourse,
  onEditCourse,
  onAddReturn,
  onDeleteReturn,
  onEditReturn,
  onBack,
}: SkillDetailPageProps) {
  return (
    <div>
      {/* 返回按钮 + 面包屑 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="pixel-btn bg-[#8b4513] text-[#faf0e6] px-3 py-1.5 text-[8px]"
        >
          ← 返回首页
        </button>
        {category && (
          <span className="text-[7px] text-[#8fbc8f]">
            {category.icon} {category.name} / {skill.icon} {skill.name}
          </span>
        )}
      </div>

      {/* 技能详情卡片 */}
      <div className="max-w-lg mx-auto">
        <SkillCard
          skill={skill}
          records={records}
          onCheckin={onCheckin}
          onMakeupCheckin={onMakeupCheckin}
          onDelete={onDelete}
        />

        {/* 花费汇总 */}
        <div className="pixel-card p-4 mt-3">
          <SkillSummaryPanel
            skillId={skill.id}
            records={records}
            equipments={equipments}
            courses={courses}
          />
        </div>

        {/* 背包区域 */}
        <div className="pixel-card p-4 mt-3">
          <EquipmentPanel
            skillId={skill.id}
            skillName={skill.name}
            skillIcon={skill.icon}
            equipments={equipments}
            onAdd={onAddEquipment}
            onDelete={onDeleteEquipment}
            onEdit={onEditEquipment}
          />
        </div>

        {/* 已上课程区域 */}
        <div className="pixel-card p-4 mt-3">
          <CoursePanel
            skillId={skill.id}
            skillName={skill.name}
            skillIcon={skill.icon}
            courses={courses}
            onAdd={onAddCourse}
            onDelete={onDeleteCourse}
            onEdit={onEditCourse}
          />
        </div>

        {/* 技能复利区域 */}
        <div className="pixel-card p-4 mt-3">
          <ReturnPanel
            skillId={skill.id}
            skillName={skill.name}
            skillIcon={skill.icon}
            returns={returns}
            onAdd={onAddReturn}
            onDelete={onDeleteReturn}
            onEdit={onEditReturn}
          />
        </div>
      </div>
    </div>
  );
}
