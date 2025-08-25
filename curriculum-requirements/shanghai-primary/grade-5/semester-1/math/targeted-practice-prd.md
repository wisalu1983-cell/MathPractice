# 五年级数学针对性训练模块 - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位
面向上海小学五年级学生的智能数学训练模块，通过弱点诊断和个性化推荐，实现精准提升而非题海战术。

### 1.2 设计原则
- **精准诊断**：基于错题分析和知识点掌握度评估
- **分层训练**：对应基础夯实、能力提升、综合突破三个层次
- **适度练习**：避免题海战术，注重质量和针对性
- **闭环改进**：练习-诊断-调整的持续优化循环

### 1.3 目标用户
- **主要用户**：上海五年级学生
- **协助用户**：家长（监督和配合）
- **使用场景**：课后针对性补强、考前重点攻克、弱项专项训练

## 2. 核心价值主张

### 2.1 解决的痛点
1. **盲目刷题**：不知道哪些是真正的弱点
2. **练习低效**：大量时间花在已掌握的知识点上
3. **提分困难**：缺乏系统的弱点分析和提升路径
4. **缺乏反馈**：练习后不知道改进方向

### 2.2 核心价值
1. **个性化诊断**：精准识别知识薄弱点和提分机会点
2. **智能推荐**：基于诊断结果推荐最适合的练习内容
3. **分层提升**：针对不同目标提供差异化的训练方案
4. **进度跟踪**：可视化学习进展和掌握度变化

## 3. 功能架构设计

### 3.1 整体架构
```
五年级数学针对性训练模块
├── 错题管理系统
│   ├── 错题录入
│   ├── 错题分析
│   └── 错题复练
├── 诊断评估系统
│   ├── 知识点掌握度评估
│   ├── 弱点识别分析
│   └── 学习能力层次判定
├── 个性化练习系统
│   ├── 智能题目推荐
│   ├── 分层训练模式
│   └── 自适应难度调整
├── 进度跟踪系统
│   ├── 掌握度可视化
│   ├── 进步轨迹记录
│   └── 学习报告生成
└── 家长协作系统
    ├── 学习状态同步
    ├── 练习建议推送
    └── 配合指导提醒
```

### 3.2 与现有模块的关系
- **独立性**：与计算练习模块完全独立，有自己的数据存储和界面
- **互补性**：计算练习重在熟练度，针对性训练重在弱点攻克
- **数据共享**：可参考计算练习的历史数据作为诊断参考

## 4. 详细功能设计

### 4.1 错题管理系统

#### 4.1.1 错题录入功能
**功能描述**：支持多种方式录入学校作业、一课一练等错题

**核心特性**：
- **手动录入**：文字描述 + 拍照上传
- **题型分类**：自动识别知识点和题型
- **错误标注**：标记具体错误类型（概念理解、计算错误、审题失误等）
- **来源记录**：记录错题来源（作业/考试/练习册等）

**界面设计要点**：
- 简化的录入流程，支持快速批量录入
- 智能的知识点识别和标签建议
- 错误类型的预设选项和自定义标签

#### 4.1.2 错题分析功能
**功能描述**：对录入的错题进行智能分析，识别问题根源

**分析维度**：
- **知识点分布**：哪些单元/知识点错误集中
- **错误类型**：概念理解、运算技能、解题思路、审题仔细度
- **错误频率**：同类错误的重复出现模式
- **难度分析**：错题在三层目标中的分布情况

**输出结果**：
- 弱点知识点排序列表
- 错误类型占比统计
- 个性化问题诊断报告

#### 4.1.3 错题复练功能
**功能描述**：基于遗忘曲线安排错题复习，确保真正掌握

**复练策略**：
- **间隔重复**：根据掌握情况调整复练间隔
- **变式练习**：同知识点的不同题型练习
- **综合应用**：将单一知识点错题扩展为综合题

### 4.2 诊断评估系统

#### 4.2.1 知识点掌握度评估
**功能描述**：基于多维数据评估各知识点的掌握程度

**评估数据来源**：
- 历史练习数据（计算练习模块）
- 错题记录和分析结果
- 专项测评结果
- 练习时间和错误模式

**掌握度等级**：
- **未掌握**（0-40%）：基础概念不清，需要重新学习
- **初步掌握**（40-70%）：基本理解但不熟练，需要强化练习
- **基本掌握**（70-85%）：较为熟练，偶有错误
- **熟练掌握**（85-95%）：运用自如，可以挑战更高难度
- **精通**（95%+）：完全掌握，可以进行知识拓展

#### 4.2.2 弱点识别分析
**功能描述**：智能识别学习中的薄弱环节和提分机会点

**识别维度**：
1. **基础薄弱点**：影响后续学习的关键概念缺失
2. **频繁错误点**：反复出现错误的知识点
3. **提分潜力点**：稍加练习就能显著提高的知识点
4. **综合应用弱点**：单项知识点掌握但综合运用困难

**输出建议**：
- 优先级排序的改进建议
- 针对性的练习方案推荐
- 预估的提升效果和时间

#### 4.2.3 学习能力层次判定
**功能描述**：评估学生在三层目标中的当前水平

**判定标准**：
- **基础层**：基础概念掌握度、标准题型完成率
- **巩固层**：变式题应对能力、常见陷阱识别率
- **进阶层**：复杂信息提取能力、逻辑推理准确性

**动态调整**：
- 根据练习表现实时调整层次定位
- 支持不同知识点的不同层次水平
- 提供升级到下一层次的具体路径

### 4.3 个性化练习系统

#### 4.3.1 智能题目推荐
**功能描述**：基于诊断结果智能推荐最适合的练习题目

**推荐策略**：
- **弱点优先**：优先推荐弱点知识点的练习
- **难度适配**：根据当前能力层次推荐合适难度
- **类型多样**：同一知识点的不同题型组合
- **负荷平衡**：控制练习量，避免过度训练

**推荐算法**：
```
推荐分数 = 弱点权重 × 知识点重要性 × 难度匹配度 × 练习效果预期
```

#### 4.3.2 分层训练模式
**功能描述**：针对三个能力层次提供差异化的训练内容

**基础夯实模式**：
- 重点练习基础概念和标准题型
- 强调正确率和基本技能熟练度
- 每日练习量：5-8题，重质量不重数量

**能力提升模式**：
- 加入变式题和应用题训练
- 培养解题技巧和陷阱识别能力
- 每日练习量：8-12题，平衡数量和难度

**综合突破模式**：
- 重点训练信息提取和逻辑推理
- 练习复杂题型和综合应用
- 每日练习量：5-10题，重点培养思维能力

#### 4.3.3 自适应难度调整
**功能描述**：根据练习表现实时调整题目难度

**调整机制**：
- **连续正确**：逐步提升难度，挑战更高层次
- **连续错误**：降低难度，巩固基础
- **混合表现**：保持当前难度，增加同级练习

**调整幅度**：
- 小步调整：避免难度跳跃过大
- 回退机制：支持回到更基础的层次重新建立信心

### 4.4 进度跟踪系统

#### 4.4.1 掌握度可视化
**功能描述**：直观展示各知识点的掌握进展

**可视化形式**：
- **雷达图**：显示六个单元的掌握度分布
- **进度条**：每个知识点的掌握程度
- **热力图**：错误集中区域的可视化
- **趋势图**：掌握度随时间的变化

#### 4.4.2 进步轨迹记录
**功能描述**：记录和展示学习进步的历程

**记录内容**：
- 知识点掌握度的变化历史
- 练习正确率的提升轨迹
- 解题速度的改善情况
- 综合能力层次的升级记录

#### 4.4.3 学习报告生成
**功能描述**：定期生成个性化的学习分析报告

**报告内容**：
- **周报**：本周练习总结和下周建议
- **月报**：掌握度变化分析和改进成效
- **阶段报告**：单元结束后的全面评估
- **考前报告**：考试前的重点复习建议

### 4.5 家长协作系统

#### 4.5.1 学习状态同步
**功能描述**：向家长实时同步孩子的学习状态

**同步内容**：
- 每日练习完成情况
- 弱点改善进展
- 需要关注的问题点
- 学习习惯建议

#### 4.5.2 练习建议推送
**功能描述**：为家长提供具体的辅导建议

**建议类型**：
- 针对性的错题讲解要点
- 知识点强化的生活应用建议
- 学习时间安排建议
- 激励和心理支持方法

#### 4.5.3 配合指导提醒
**功能描述**：提醒家长在关键时点给予配合

**提醒场景**：
- 新弱点发现时的关注提醒
- 进步达成时的鼓励提醒
- 练习卡顿时的支持提醒
- 阶段性评估时的参与提醒

## 5. 用户体验流程

### 5.1 初始设置流程
1. **学习状况评估**：通过问卷了解当前学习情况
2. **目标设定**：选择学习目标层次（合格/良好/优秀）
3. **弱点初筛**：通过小测试初步识别弱点
4. **个性化配置**：设置练习偏好和时间安排

### 5.2 日常使用流程
1. **错题录入**：录入当日作业/练习中的错题
2. **诊断分析**：系统分析错题并更新弱点识别
3. **练习推荐**：获取个性化的练习题目推荐
4. **针对性练习**：完成推荐的练习并获得反馈
5. **进度查看**：查看掌握度变化和进步情况

### 5.3 阶段评估流程
1. **阶段测评**：完成系统推荐的阶段性测试
2. **成果分析**：查看能力提升和弱点改善情况
3. **计划调整**：根据评估结果调整后续练习计划
4. **目标更新**：必要时更新学习目标和期望

## 6. 技术实现方案

### 6.1 数据模型设计

#### 6.1.1 核心数据表
```typescript
// 知识点掌握度表
interface KnowledgePointMastery {
  id: string;
  userId: string;
  knowledgePoint: string; // 知识点标识
  masteryLevel: number; // 掌握度 0-100
  lastPracticeDate: Date;
  practiceCount: number;
  correctCount: number;
  accuracy: number;
  difficultyProgression: string; // 当前练习难度层次
}

// 错题记录表
interface WrongQuestionRecord {
  id: string;
  userId: string;
  questionText: string;
  questionImage?: string;
  knowledgePoints: string[]; // 涉及的知识点
  errorType: string; // 错误类型
  source: string; // 来源（作业/考试等）
  addedDate: Date;
  practiceHistory: PracticeHistory[];
  masteryStatus: 'not-mastered' | 'practicing' | 'mastered';
}

// 练习历史表
interface PracticeHistory {
  id: string;
  userId: string;
  practiceType: 'targeted' | 'wrong-question' | 'assessment';
  knowledgePoints: string[];
  questions: Question[];
  answers: (string | number)[];
  correctCount: number;
  accuracy: number;
  averageTime: number;
  practiceDate: Date;
  difficultyLevel: 'basic' | 'enhanced' | 'advanced';
}

// 学习目标配置表
interface LearningGoalConfig {
  id: string;
  userId: string;
  targetLevel: 'pass' | 'good' | 'excellent'; // 目标层次
  focusAreas: string[]; // 重点关注领域
  practiceIntensity: 'light' | 'normal' | 'intensive';
  weeklyGoals: WeeklyGoal[];
}

// 诊断报告表
interface DiagnosticReport {
  id: string;
  userId: string;
  reportDate: Date;
  weakPoints: WeakPoint[];
  recommendations: Recommendation[];
  progressSummary: ProgressSummary;
  nextSteps: string[];
}
```

#### 6.1.2 算法模型

**掌握度计算算法**：
```typescript
function calculateMasteryLevel(
  practiceHistory: PracticeHistory[],
  wrongQuestions: WrongQuestionRecord[],
  timeDecayFactor: number = 0.95
): number {
  // 基于练习历史、错题数量、时间衰减等因素计算掌握度
  const recentPractices = getRecentPractices(practiceHistory, 30); // 最近30天
  const wrongQuestionCount = wrongQuestions.filter(q => 
    q.masteryStatus !== 'mastered'
  ).length;
  
  let baseScore = recentPractices.reduce((sum, practice) => {
    return sum + practice.accuracy * getTimeWeight(practice.practiceDate);
  }, 0) / recentPractices.length;
  
  // 错题惩罚
  const wrongQuestionPenalty = Math.min(wrongQuestionCount * 5, 30);
  
  return Math.max(0, Math.min(100, baseScore - wrongQuestionPenalty));
}
```

**题目推荐算法**：
```typescript
function recommendQuestions(
  userId: string,
  masteryData: KnowledgePointMastery[],
  targetDifficulty: string,
  questionPool: Question[]
): Question[] {
  // 识别弱点知识点
  const weakPoints = masteryData
    .filter(m => m.masteryLevel < 70)
    .sort((a, b) => a.masteryLevel - b.masteryLevel);
  
  // 为每个弱点推荐题目
  const recommendations: Question[] = [];
  
  weakPoints.forEach(weakPoint => {
    const relevantQuestions = questionPool.filter(q => 
      q.knowledgePoints.includes(weakPoint.knowledgePoint) &&
      q.difficulty === getTargetDifficulty(weakPoint.masteryLevel, targetDifficulty)
    );
    
    // 选择最适合的题目
    const selectedQuestions = selectOptimalQuestions(
      relevantQuestions, 
      weakPoint,
      2 // 每个弱点推荐2题
    );
    
    recommendations.push(...selectedQuestions);
  });
  
  return recommendations.slice(0, 10); // 限制每次推荐题数
}
```

### 6.2 系统架构

#### 6.2.1 模块结构
```
src/targeted-practice/
├── components/           # UI组件
│   ├── ErrorCollection/  # 错题管理组件
│   ├── Diagnosis/        # 诊断分析组件
│   ├── Practice/         # 练习模块组件
│   ├── Progress/         # 进度跟踪组件
│   └── Parent/           # 家长协作组件
├── hooks/               # 业务逻辑Hook
│   ├── useErrorManager.ts
│   ├── useDiagnosis.ts
│   ├── usePracticeRecommender.ts
│   └── useProgressTracker.ts
├── services/            # 后端服务
│   ├── errorService.ts
│   ├── diagnosisService.ts
│   ├── practiceService.ts
│   └── progressService.ts
├── algorithms/          # 算法实现
│   ├── masteryCalculator.ts
│   ├── questionRecommender.ts
│   └── difficultyAdapter.ts
├── types/              # 类型定义
│   ├── error.ts
│   ├── diagnosis.ts
│   ├── practice.ts
│   └── progress.ts
└── utils/              # 工具函数
    ├── knowledgePoints.ts
    ├── questionClassifier.ts
    └── reportGenerator.ts
```

#### 6.2.2 数据流设计
```
用户操作 → 组件事件 → Hook业务逻辑 → Service API调用 → 算法处理 → 数据持久化
    ↓
UI更新 ← 状态更新 ← Hook状态管理 ← Service响应 ← 算法结果 ← 数据查询
```

### 6.3 性能优化策略

1. **懒加载**：按需加载不同功能模块
2. **缓存策略**：缓存题目推荐结果和诊断报告
3. **增量更新**：只更新变化的掌握度数据
4. **异步处理**：复杂算法计算使用Web Workers

## 7. 开发优先级规划

### 7.1 MVP版本（第一阶段）
**目标**：验证核心价值和用户接受度

**核心功能**：
1. ✅ 错题录入和基础分析
2. ✅ 简单的掌握度评估
3. ✅ 基础的题目推荐
4. ✅ 简单的进度展示

**开发周期**：4-6周

### 7.2 完善版本（第二阶段）
**目标**：完善功能体验，提升算法准确性

**新增功能**：
1. ✅ 智能错题分析
2. ✅ 分层训练模式
3. ✅ 详细的诊断报告
4. ✅ 自适应难度调整

**开发周期**：6-8周

### 7.3 全功能版本（第三阶段）
**目标**：实现完整的学习闭环

**新增功能**：
1. ✅ 家长协作系统
2. ✅ 高级数据分析
3. ✅ 个性化学习路径
4. ✅ 智能学习建议

**开发周期**：8-10周

## 8. 成功指标

### 8.1 功能指标
- **错题识别准确率** > 85%
- **推荐题目相关性** > 80%
- **掌握度评估准确性** > 85%
- **练习完成率** > 70%

### 8.2 学习效果指标
- **弱点改善率** > 60%（一个月内）
- **整体掌握度提升** > 15%（三个月内）
- **练习效率提升** > 30%（相比随机练习）
- **用户满意度** > 80%

### 8.3 使用指标
- **日活跃用户留存** > 60%
- **功能使用深度** > 80%（使用3个以上核心功能）
- **家长参与度** > 40%
- **错题录入频率** > 3次/周

## 9. 风险评估与应对

### 9.1 技术风险
**风险**：算法准确性不足，推荐效果差
**应对**：
- 建立A/B测试机制
- 收集用户反馈持续优化
- 提供手动调整选项

### 9.2 产品风险
**风险**：功能复杂度高，用户学习成本大
**应对**：
- 设计直观的引导流程
- 提供详细的使用说明
- 采用渐进式功能开放

### 9.3 运营风险
**风险**：用户粘性不足，活跃度下降
**应对**：
- 设计合理的激励机制
- 定期推送个性化内容
- 建立学习成就体系

## 10. 后续规划

### 10.1 功能扩展
- 支持其他年级和学科
- 增加协作学习功能
- 接入更多教育资源

### 10.2 技术演进
- 引入机器学习算法
- 优化推荐系统性能
- 增强数据分析能力

### 10.3 生态整合
- 与学校系统对接
- 整合家庭作业数据
- 连接线下教育资源

---

## 附录：核心算法伪代码

### A.1 掌握度计算算法
```python
def calculate_mastery_level(user_id, knowledge_point):
    # 获取相关数据
    practices = get_recent_practices(user_id, knowledge_point, days=30)
    wrong_questions = get_wrong_questions(user_id, knowledge_point)
    
    # 计算基础分数
    base_score = 0
    total_weight = 0
    
    for practice in practices:
        time_weight = calculate_time_weight(practice.date)
        base_score += practice.accuracy * time_weight
        total_weight += time_weight
    
    if total_weight > 0:
        base_score = base_score / total_weight
    
    # 错题惩罚
    unmastered_errors = count_unmastered_errors(wrong_questions)
    error_penalty = min(unmastered_errors * 5, 30)
    
    # 最终掌握度
    mastery = max(0, min(100, base_score - error_penalty))
    
    return mastery
```

### A.2 题目推荐算法
```python
def recommend_questions(user_id, target_count=10):
    # 获取掌握度数据
    mastery_data = get_user_mastery(user_id)
    
    # 识别弱点
    weak_points = [m for m in mastery_data if m.level < 70]
    weak_points.sort(key=lambda x: x.level)
    
    recommendations = []
    
    for weak_point in weak_points:
        # 确定推荐题目数量
        question_count = calculate_question_count(weak_point.level)
        
        # 确定难度层次
        difficulty = determine_difficulty(weak_point.level, weak_point.progress)
        
        # 获取候选题目
        candidates = get_candidate_questions(
            knowledge_point=weak_point.knowledge_point,
            difficulty=difficulty,
            exclude_recent=True
        )
        
        # 选择最优题目
        selected = select_optimal_questions(candidates, question_count)
        recommendations.extend(selected)
        
        if len(recommendations) >= target_count:
            break
    
    return recommendations[:target_count]
```

### A.3 自适应难度调整算法
```python
def adapt_difficulty(user_id, knowledge_point, recent_performance):
    current_level = get_current_difficulty_level(user_id, knowledge_point)
    
    # 分析最近表现
    recent_accuracy = calculate_recent_accuracy(recent_performance)
    consecutive_correct = count_consecutive_correct(recent_performance)
    consecutive_wrong = count_consecutive_wrong(recent_performance)
    
    # 调整规则
    if consecutive_correct >= 3 and recent_accuracy >= 0.8:
        # 提升难度
        new_level = min(current_level + 1, MAX_DIFFICULTY)
    elif consecutive_wrong >= 2 or recent_accuracy < 0.5:
        # 降低难度
        new_level = max(current_level - 1, MIN_DIFFICULTY)
    else:
        # 保持当前难度
        new_level = current_level
    
    update_difficulty_level(user_id, knowledge_point, new_level)
    return new_level
```
