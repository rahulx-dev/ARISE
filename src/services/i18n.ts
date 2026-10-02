import { create } from 'zustand';
import { expoDb } from '../database/client';
import { Platform } from 'react-native';

export type LanguageCode =
  | 'en-IN'
  | 'en-US'
  | 'hi'
  | 'es'
  | 'ja'
  | 'ko'
  | 'de'
  | 'fr'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'zh';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳' },
  { code: 'en-US', label: 'English (US)', nativeLabel: 'English (US)', flag: '🇺🇸' },
  { code: 'en-IN', label: 'English (India)', nativeLabel: 'English (India)', flag: '🇮🇳' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese', nativeLabel: '简体中文', flag: '🇨🇳' },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Bottom Tabs
    tabHome: 'Home',
    tabQuests: 'Quests',
    tabDungeon: 'Dungeon',
    tabGym: 'Gym',
    tabProfile: 'Profile',

    // Home Screen
    welcome: 'Welcome',
    welcomeBack: 'Welcome Back, Hunter',
    dayStreak: 'Day Streak',
    repsToday: 'Reps Today',
    focusTime: 'Focus Time',
    coins: 'Coins',
    todaysQuests: "Today's Quests",
    viewAllQuests: 'View All Quests',
    quickActions: 'Quick Actions',
    seeAll: 'See All',
    workout: 'Workout',
    startSession: 'Start your session',
    focus: 'Focus',
    stayInZone: 'Stay in the zone',
    shop: 'Shop',
    upgradeUnlock: 'Upgrade & unlock',
    activityRings: 'Activity Rings',
    dailyReps: 'Daily Reps',
    questsDone: 'Quests Done',
    level: 'Level',
    rankHunter: '{0}-Rank Hunter',
    xpFraction: '{0} / {1} XP',
    startWorkout: 'ARISE // START AI WORKOUT',
    dailySystemDirectives: 'DAILY SYSTEM DIRECTIVES',

    // Quests Screen
    allDirectives: 'All Directives',
    filterAll: 'ALL',
    filterDaily: 'DAILY',
    filterWeekly: 'WEEKLY',
    filterSpecial: 'SPECIAL',
    startAiWorkout: 'START AI WORKOUT',
    startFocus: 'START FOCUS',
    startRun: 'START RUN',
    run: 'Run',
    runSub: 'Outdoor GPS tracker',
    shadowSprint: 'Shadow Sprint GPS Trial',
    sprintDesc: 'Live outdoor distance tracking with pace telemetry.',
    completed: 'COMPLETED',
    claimReward: 'CLAIM REWARD',
    questComplete: 'QUEST COMPLETE!',
    confirmCompletion: 'CONFIRM COMPLETION',
    noMissions: 'No Missions Found',
    noMissionsSub: 'Check back tomorrow for newly calibrated daily missions.',

    // Dungeon & Gates Screen
    dungeonsAndGates: 'Dungeons & Gates',
    dungeonSub: 'Clear dimensional gates to earn crystals',
    activeGates: 'Active Gates',
    leaderboard: 'Leaderboard',
    enterGate: 'ENTER GATE',
    scanning: 'Scanning...',
    scanDungeon: 'RADAR SCAN',
    locked: 'LOCKED',
    cleared: 'CLEARED',
    difficulty: 'Difficulty',
    rewards: 'Rewards',
    floor: 'Floor',

    // Gym Screen
    gymTrainingHub: 'Gym Training Hub',
    gymSub: 'AI pose tracking and form analysis',
    allExercises: 'All Exercises',
    startExercise: 'Start Exercise',
    sets: 'Sets',
    reps: 'Reps',
    restTime: 'Rest Time',
    target: 'Target',
    finishWorkout: 'FINISH WORKOUT',

    // Profile Screen
    warriorProfile: 'Warrior Profile',
    hunterRank: 'Hunter Rank',
    statsOverview: 'Stats Overview',
    totalWorkouts: 'Total Workouts',
    achievements: 'Achievements',
    currentStreak: 'Current Streak',
    generalSettings: 'GENERAL SETTINGS',
    themeMode: 'Theme Mode',
    language: 'Language',
    cloudSync: 'Google Cloud Sync',
    appBlocker: 'Blocked Distraction Apps',
    voiceCoach: 'Voice AI Coach Studio',
    backupData: 'Export Offline Backup',
    aboutArise: 'About ARISE',
    editProfile: 'Edit Profile & Avatar',

    // Settings Screen
    settingsTitle: 'Settings',
    appearance: 'APPEARANCE',
    generalPreferences: 'GENERAL PREFERENCES',
    soundEffects: 'Sound Effects (SFX)',
    soundDesc: 'Rep counters and quest completion sounds',
    tactileHaptics: 'Tactile Haptics',
    hapticsDesc: 'Tactile pulses on button taps and reps',
    languagePreference: 'Language Preference',
    languageSub: 'Change application language',
    dailyBudget: 'Daily Distraction Budget',
    budgetSub: 'Lock distracting apps behind workouts',
    systemProtocols: 'SYSTEM PROTOCOLS',
    permissionsHub: 'Permissions Hub',
    permissionsSub: 'Usage access, overlay & camera status',
    howToUse: 'How to Use ARISE',
    videoGuide: 'Official Video Guide',
    dataAndCloud: 'DATA & CLOUD BACKUP',
    connectGoogle: 'Google Cloud Sync',
    cloudSyncSub: 'Safely backup and restore your game progress',
    exportBackup: 'Export Offline Backup',
    exportSub: 'Save database backup to device JSON file',
    dangerZone: 'DANGER ZONE',
    resetPlayer: 'Reset Player Data',
    resetSub: 'Permanently erase all progress on this device',

    // Common
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    continue: 'Continue',
    back: 'Back',
    loading: 'Loading...',
    selectLanguage: 'Select Language',
    active: 'Active',
    connected: 'Connected',
  },

  hi: {
    // Bottom Tabs
    tabHome: 'होम',
    tabQuests: 'क्वेस्ट्स',
    tabDungeon: 'डंगियन',
    tabGym: 'जिम',
    tabProfile: 'प्रोफ़ाइल',

    // Home Screen
    welcome: 'स्वागत है',
    welcomeBack: 'पुनः स्वागत है, शिकारी',
    dayStreak: 'डे स्ट्रीक',
    repsToday: 'आज के रेप्स',
    focusTime: 'फोकस समय',
    coins: 'सिक्के',
    todaysQuests: 'आज के क्वेस्ट्स',
    viewAllQuests: 'सभी क्वेस्ट्स देखें',
    quickActions: 'त्वरित क्रियाएँ',
    seeAll: 'सभी देखें',
    workout: 'कसरत',
    startSession: 'सत्र शुरू करें',
    focus: 'एकाग्रता',
    stayInZone: 'ज़ोन में रहें',
    shop: 'शॉप',
    upgradeUnlock: 'अपग्रेड एवं अनलॉक',
    activityRings: 'गतिविधि रिंग्स',
    dailyReps: 'दैनिक रेप्स',
    questsDone: 'पूर्ण क्वेस्ट',
    level: 'स्तर',
    rankHunter: '{0}-रैंक शिकारी',
    xpFraction: '{0} / {1} XP',
    startWorkout: 'ARISE // एआई वर्कआउट शुरू करें',
    dailySystemDirectives: 'दैनिक प्रणाली निर्देश',

    // Quests Screen
    allDirectives: 'सभी निर्देश',
    filterAll: 'सभी',
    filterDaily: 'दैनिक',
    filterWeekly: 'साप्ताहिक',
    filterSpecial: 'विशेष',
    startAiWorkout: 'एआई वर्कआउट शुरू करें',
    startFocus: 'फोकस शुरू करें',
    startRun: 'दौड़ शुरू करें',
    run: 'दौड़ें',
    runSub: 'आउटडोर GPS ट्रैकर',
    shadowSprint: 'शैडो स्प्रिंट GPS ट्रायल',
    sprintDesc: 'पेस टेलीमेट्री के साथ लाइव आउटडोर दूरी ट्रैकिंग।',
    completed: 'पूर्ण हुआ',
    claimReward: 'इनाम प्राप्त करें',
    questComplete: 'क्वेस्ट पूर्ण हुआ!',
    confirmCompletion: 'पूर्णता की पुष्टि करें',
    noMissions: 'कोई सक्रिय मिशन नहीं',
    noMissionsSub: 'कल नए दैनिक क्वेस्ट जारी किए जाएंगे।',

    // Dungeon & Gates Screen
    dungeonsAndGates: 'डंगियन एवं गेट्स',
    dungeonSub: 'क्रिस्टल कमाने के लिए गेट्स क्लियर करें',
    activeGates: 'सक्रिय गेट्स',
    leaderboard: 'लीडरबोर्ड',
    enterGate: 'गेट में प्रवेश करें',
    scanning: 'स्कैनिंग...',
    scanDungeon: 'रडार स्कैन',
    locked: 'लॉक है',
    cleared: 'पूर्ण',
    difficulty: 'कठिनाई',
    rewards: 'पुरस्कार',
    floor: 'तल',

    // Gym Screen
    gymTrainingHub: 'जिम ट्रेनिंग हब',
    gymSub: 'एआई पोज़ ट्रैकिंग एवं फॉर्म विश्लेषण',
    allExercises: 'सभी व्यायाम',
    startExercise: 'व्यायाम शुरू करें',
    sets: 'सेट्स',
    reps: 'रेप्स',
    restTime: 'विश्राम समय',
    target: 'लक्ष्य',
    finishWorkout: 'वर्कआउट समाप्त करें',

    // Profile Screen
    warriorProfile: 'शिकारी प्रोफ़ाइल',
    hunterRank: 'शिकारी रैंक',
    statsOverview: 'आँकड़े अवलोकन',
    totalWorkouts: 'कुल वर्कआउट',
    achievements: 'उपलब्धियाँ',
    currentStreak: 'वर्तमान स्ट्रीक',
    generalSettings: 'सामान्य सेटिंग्स',
    themeMode: 'थीम मोड',
    language: 'भाषा',
    cloudSync: 'गूगल क्लाउड सिंक',
    appBlocker: 'ब्लॉक किए गए ऐप्स',
    voiceCoach: 'वॉइस एआई कोच स्टूडियो',
    backupData: 'ऑफ़लाइन बैकअप',
    aboutArise: 'ARISE के बारे में',
    editProfile: 'प्रोफ़ाइल एवं अवतार बदलें',

    // Settings Screen
    settingsTitle: 'सेटिंग्स',
    appearance: 'थीम एवं रूपरंग',
    generalPreferences: 'सामान्य प्राथमिकताएं',
    soundEffects: 'ध्वनि प्रभाव (SFX)',
    soundDesc: 'रेप्स और मिशन पूर्ण होने की आवाज़ें',
    tactileHaptics: 'कंपन हैप्टिक्स',
    hapticsDesc: 'बटन टैप और रेप्स पर स्पर्श कंपन',
    languagePreference: 'भाषा प्राथमिकता',
    languageSub: 'ऐप की भाषा बदलें',
    dailyBudget: 'दैनिक स्क्रीन समय सीमा',
    budgetSub: 'कसरत के पीछे ऐप्स लॉक करें',
    systemProtocols: 'सिस्टम प्रोटोकॉल',
    permissionsHub: 'अनुमति केंद्र',
    permissionsSub: 'यूसेज एक्सेस, ओवरले एवं कैमरा स्टेटस',
    howToUse: 'ARISE का उपयोग कैसे करें',
    videoGuide: 'आधिकारिक वीडियो गाइड',
    dataAndCloud: 'डेटा एवं क्लाउड बैकअप',
    connectGoogle: 'गूगल क्लाउड सिंक',
    cloudSyncSub: 'गेम डेटा सुरक्षित रूप से सेव एवं रीस्टोर करें',
    exportBackup: 'ऑफ़लाइन बैकअप निर्यात करें',
    exportSub: 'फ़ाइल में बैकअप सहेजें',
    dangerZone: 'खतरे का क्षेत्र',
    resetPlayer: 'प्लेयर डेटा रीसेट करें',
    resetSub: 'इस डिवाइस पर सभी डेटा हमेशा के लिए मिटाएं',

    // Common
    confirm: 'पुष्टि करें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    save: 'सहेजें',
    continue: 'जारी रखें',
    back: 'वापस',
    loading: 'लोड हो रहा है...',
    selectLanguage: 'भाषा चुनें',
    active: 'सक्रिय',
    connected: 'कनेक्टेड',
  },

  ja: {
    tabHome: 'ホーム',
    tabQuests: 'クエスト',
    tabDungeon: 'ダンジョン',
    tabGym: 'ジム',
    tabProfile: 'プロフィール',
    welcome: 'ようこそ',
    welcomeBack: 'お帰りなさい、ハンター様',
    dayStreak: '連続日数',
    repsToday: '本日のレップ',
    focusTime: '集中時間',
    coins: 'コイン',
    todaysQuests: '本日のクエスト',
    viewAllQuests: '全クエストを見る',
    quickActions: 'クイックアクション',
    seeAll: 'すべて見る',
    workout: 'ワークアウト',
    startSession: 'セッション開始',
    focus: '集中',
    stayInZone: '集中ゾーンを維持',
    shop: 'ショップ',
    upgradeUnlock: '強化・解放',
    activityRings: 'アクティビティリング',
    dailyReps: 'デイリーレップ',
    questsDone: '完了クエスト',
    level: 'レベル',
    rankHunter: '{0}級ハンター',
    xpFraction: '{0} / {1} XP',
    startWorkout: '起きよ // AIワークアウト開始',
    dailySystemDirectives: 'デイリーシステム指令',
    allDirectives: '全指令',
    filterAll: 'すべて',
    filterDaily: 'デイリー',
    filterWeekly: 'ウィークリー',
    filterSpecial: 'スペシャル',
    startAiWorkout: 'AIワークアウト開始',
    startFocus: '集中開始',
    startRun: 'ラン開始',
    run: 'ランニング',
    runSub: '屋外GPSトラッカー',
    shadowSprint: 'シャドウスプリントGPS試練',
    sprintDesc: 'ペース分析付き屋外距離トラッキング。',
    completed: '完了',
    claimReward: '報酬受取',
    questComplete: 'クエスト達成！',
    confirmCompletion: '達成の確認',
    noMissions: '任務が見つかりません',
    noMissionsSub: '明日新たなデイリークエストが発行されます。',
    dungeonsAndGates: 'ダンジョン＆ゲート',
    dungeonSub: '次元ゲートを攻略して魔晶石を獲得',
    activeGates: '開放中ゲート',
    leaderboard: '順位表',
    enterGate: 'ゲート入場',
    scanning: '探知中...',
    scanDungeon: 'レーダー探知',
    locked: '封印中',
    cleared: '攻略済',
    difficulty: '難易度',
    rewards: '報酬',
    floor: '階層',
    gymTrainingHub: 'トレーニング拠点',
    gymSub: 'AI姿勢測定とフォーム解析',
    allExercises: '全種目',
    startExercise: '運動開始',
    sets: 'セット',
    reps: 'レップ',
    restTime: '休憩時間',
    target: '目標',
    finishWorkout: '終了する',
    warriorProfile: 'ハンター情報',
    hunterRank: '等級',
    statsOverview: '能力値',
    totalWorkouts: '総運動回数',
    achievements: '実績',
    currentStreak: '継続記録',
    generalSettings: '一般設定',
    themeMode: 'テーマ設定',
    language: '言語',
    cloudSync: 'Google同期',
    appBlocker: '制限アプリ',
    voiceCoach: 'AI音声コーチ',
    backupData: 'バックアップ',
    aboutArise: 'ARISEについて',
    editProfile: 'プロフィール変更',
    settingsTitle: '設定',
    appearance: '外観',
    generalPreferences: '環境設定',
    soundEffects: '効果音 (SFX)',
    soundDesc: 'レップ計測音と完了効果音',
    tactileHaptics: '触覚振動',
    hapticsDesc: 'ボタンと動作のフィードバック',
    languagePreference: '言語設定',
    languageSub: 'アプリ内言語を変更',
    dailyBudget: '制限時間',
    budgetSub: '運動で制限解除',
    systemProtocols: 'システム規約',
    permissionsHub: '権限ハブ',
    permissionsSub: '利用状況・カメラ権限',
    howToUse: '利用手引',
    videoGuide: '公式動画ガイド',
    dataAndCloud: 'クラウド保存',
    connectGoogle: 'Google連携',
    cloudSyncSub: '進捗を安全に保存・復元',
    exportBackup: '端末保存',
    exportSub: 'JSON形式で保存',
    dangerZone: '危険領域',
    resetPlayer: 'データ初期化',
    resetSub: '端末内の進行状況を完全消去',
    confirm: '確認',
    cancel: 'キャンセル',
    close: '閉じる',
    save: '保存',
    continue: '次へ',
    back: '戻る',
    loading: '読込中...',
    selectLanguage: '言語選択',
    active: '有効',
    connected: '連携済',
  },

  ko: {
    tabHome: '홈',
    tabQuests: '퀘스트',
    tabDungeon: '던전',
    tabGym: '체육관',
    tabProfile: '프로필',
    welcome: '환영합니다',
    welcomeBack: '돌아오셨군요, 헌터님',
    dayStreak: '연속 일수',
    repsToday: '오늘의 횟수',
    focusTime: '집중 시간',
    coins: '코인',
    todaysQuests: '오늘의 퀘스트',
    viewAllQuests: '전체 퀘스트 보기',
    quickActions: '빠른 동작',
    seeAll: '전체 보기',
    workout: '운동',
    startSession: '운동 시작',
    focus: '집중',
    stayInZone: '집중 모드 유지',
    shop: '상점',
    upgradeUnlock: '강화 및 해금',
    activityRings: '활동 링',
    dailyReps: '일일 횟수',
    questsDone: '완료 퀘스트',
    level: '레벨',
    rankHunter: '{0}등급 헌터',
    xpFraction: '{0} / {1} XP',
    startWorkout: '일어나라 // AI 운동 시작',
    dailySystemDirectives: '일일 시스템 지령',
    allDirectives: '전체 지령',
    filterAll: '전체',
    filterDaily: '일일',
    filterWeekly: '주간',
    filterSpecial: '특별',
    startAiWorkout: 'AI 운동 시작',
    startFocus: '집중 시작',
    startRun: '달리기 시작',
    run: '달리기',
    runSub: '야외 GPS 측정',
    shadowSprint: '그림자 전력질주 GPS 시련',
    sprintDesc: '페이스 분석과 함께하는 야외 거리 측정.',
    completed: '완료',
    claimReward: '보상 받기',
    questComplete: '퀘스트 완료!',
    confirmCompletion: '완료 확인',
    noMissions: '임무가 없습니다',
    noMissionsSub: '내일 새로운 지령이 갱신됩니다.',
    dungeonsAndGates: '던전 및 게이트',
    dungeonSub: '차원 게이트를 클리어하여 마정석 획득',
    activeGates: '활성 게이트',
    leaderboard: '순위표',
    enterGate: '게이트 입장',
    scanning: '탐색 중...',
    scanDungeon: '레이더 탐색',
    locked: '잠김',
    cleared: '클리어',
    difficulty: '난이도',
    rewards: '보상',
    floor: '층',
    gymTrainingHub: '트레이닝 허브',
    gymSub: 'AI 자세 추적 및 폼 분석',
    allExercises: '모든 운동',
    startExercise: '운동 시작',
    sets: '세트',
    reps: '회',
    restTime: '휴식 시간',
    target: '목표',
    finishWorkout: '운동 종료',
    warriorProfile: '헌터 프로필',
    hunterRank: '등급',
    statsOverview: '능력치',
    totalWorkouts: '총 운동 횟수',
    achievements: '업적',
    currentStreak: '연속 기록',
    generalSettings: '일반 설정',
    themeMode: '테마 모드',
    language: '언어',
    cloudSync: 'Google 동기화',
    appBlocker: '차단 앱 관리',
    voiceCoach: '보이스 AI 코치',
    backupData: '백업 저장',
    aboutArise: 'ARISE 정보',
    editProfile: '프로필 수정',
    settingsTitle: '설정',
    appearance: '화면 테마',
    generalPreferences: '환경 설정',
    soundEffects: '효과음 (SFX)',
    soundDesc: '운동 및 퀘스트 완료 사운드',
    tactileHaptics: '햅틱 피드백',
    hapticsDesc: '터치 및 운동 반응 진동',
    languagePreference: '언어 설정',
    languageSub: '앱 언어 변경',
    dailyBudget: '일일 허용 시간',
    budgetSub: '운동으로 앱 잠금 해제',
    systemProtocols: '시스템 규율',
    permissionsHub: '권한 센터',
    permissionsSub: '사용 통계, 카메라 권한',
    howToUse: '이용 안내',
    videoGuide: '공식 가이드 영상',
    dataAndCloud: '클라우드 백업',
    connectGoogle: 'Google 계정 연결',
    cloudSyncSub: '진행 상황을 안전하게 저장 및 복원',
    exportBackup: '로컬 백업',
    exportSub: '기기에 JSON 파일로 저장',
    dangerZone: '위험 구역',
    resetPlayer: '데이터 초기화',
    resetSub: '기기 내 진행 기록을 완전히 삭제',
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
    save: '저장',
    continue: '계속',
    back: '뒤로',
    loading: '불러오는 중...',
    selectLanguage: '언어 선택',
    active: '활성',
    connected: '연결됨',
  },

  es: {
    tabHome: 'Inicio',
    tabQuests: 'Misiones',
    tabDungeon: 'Mazmorra',
    tabGym: 'Gimnasio',
    tabProfile: 'Perfil',
    welcome: 'Bienvenido',
    welcomeBack: 'Bienvenido de nuevo, Cazador',
    dayStreak: 'Racha de Días',
    repsToday: 'Reps de Hoy',
    focusTime: 'Tiempo Enfoque',
    coins: 'Monedas',
    todaysQuests: 'Misiones de Hoy',
    viewAllQuests: 'Ver Todas las Misiones',
    quickActions: 'Acciones Rápidas',
    seeAll: 'Ver Todo',
    workout: 'Entrenamiento',
    startSession: 'Iniciar sesión',
    focus: 'Enfoque',
    stayInZone: 'Mantén la zona',
    shop: 'Tienda',
    upgradeUnlock: 'Mejora y desbloquea',
    activityRings: 'Anillos de Actividad',
    dailyReps: 'Reps Diarias',
    questsDone: 'Misiones Hechas',
    level: 'Nivel',
    rankHunter: 'Cazador Rango {0}',
    xpFraction: '{0} / {1} XP',
    startWorkout: 'ARISE // INICIAR ENTRENAMIENTO IA',
    dailySystemDirectives: 'DIRECTIVAS DIARIAS DEL SISTEMA',
    allDirectives: 'Todas las Directivas',
    filterAll: 'TODO',
    filterDaily: 'DIARIO',
    filterWeekly: 'SEMANAL',
    filterSpecial: 'ESPECIAL',
    startAiWorkout: 'INICIAR ENTRENAMIENTO IA',
    startFocus: 'INICIAR ENFOQUE',
    startRun: 'INICIAR CARRERA',
    run: 'Correr',
    runSub: 'Rastreo GPS al aire libre',
    shadowSprint: 'Prueba Sprint de las Sombras',
    sprintDesc: 'Seguimiento de distancia exterior y telemetría de ritmo.',
    completed: 'COMPLETADO',
    claimReward: 'RECLAMAR RECOMPENSA',
    questComplete: '¡MISIÓN CUMPLIDA!',
    confirmCompletion: 'CONFIRMAR FINALIZACIÓN',
    noMissions: 'No hay misiones disponibles',
    noMissionsSub: 'Vuelve mañana para nuevas misiones diarias.',
    dungeonsAndGates: 'Mazmorras y Portales',
    dungeonSub: 'Despeja portales para ganar cristales',
    activeGates: 'Portales Activos',
    leaderboard: 'Clasificación',
    enterGate: 'ENTRAR AL PORTAL',
    scanning: 'Escaneando...',
    scanDungeon: 'ESCANEO DE RADAR',
    locked: 'BLOQUEADO',
    cleared: 'DESPEJADO',
    difficulty: 'Dificultad',
    rewards: 'Recompensas',
    floor: 'Piso',
    gymTrainingHub: 'Centro de Entrenamiento',
    gymSub: 'Seguimiento IA y análisis de forma',
    allExercises: 'Todos los Ejercicios',
    startExercise: 'Iniciar Ejercicio',
    sets: 'Series',
    reps: 'Reps',
    restTime: 'Descanso',
    target: 'Objetivo',
    finishWorkout: 'FINALIZAR SESIÓN',
    warriorProfile: 'Perfil de Cazador',
    hunterRank: 'Rango de Cazador',
    statsOverview: 'Resumen de Estadísticas',
    totalWorkouts: 'Entrenamientos Totales',
    achievements: 'Logros',
    currentStreak: 'Racha Actual',
    generalSettings: 'CONFIGURACIÓN GENERAL',
    themeMode: 'Modo de Tema',
    language: 'Idioma',
    cloudSync: 'Sincronización en la Nube',
    appBlocker: 'Aplicaciones Bloqueadas',
    voiceCoach: 'Estudio de Voz IA',
    backupData: 'Copia de Seguridad',
    aboutArise: 'Acerca de ARISE',
    editProfile: 'Editar Perfil y Avatar',
    settingsTitle: 'Configuración',
    appearance: 'APARIENCIA',
    generalPreferences: 'PREFERENCIAS GENERALES',
    soundEffects: 'Efectos de Sonido',
    soundDesc: 'Sonidos de repeticiones y misiones',
    tactileHaptics: 'Vibración Háptica',
    hapticsDesc: 'Pulsos táctiles en toques y reps',
    languagePreference: 'Preferencia de Idioma',
    languageSub: 'Cambiar idioma de la aplicación',
    dailyBudget: 'Tiempo Diario Permitido',
    budgetSub: 'Bloquea apps detrás de ejercicio',
    systemProtocols: 'PROTOCOLOS DEL SISTEMA',
    permissionsHub: 'Centro de Permisos',
    permissionsSub: 'Acceso de uso y permisos de cámara',
    howToUse: 'Cómo Usar ARISE',
    videoGuide: 'Guía Oficial en Video',
    dataAndCloud: 'DATOS Y NUBE',
    connectGoogle: 'Conectar con Google',
    cloudSyncSub: 'Guarda y restaura tu progreso con seguridad',
    exportBackup: 'Exportar Copia Offline',
    exportSub: 'Guardar archivo de respaldo JSON',
    dangerZone: 'ZONA DE PELIGRO',
    resetPlayer: 'Restablecer Datos',
    resetSub: 'Borrar permanentemente el progreso en este dispositivo',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    save: 'Guardar',
    continue: 'Continuar',
    back: 'Atrás',
    loading: 'Cargando...',
    selectLanguage: 'Seleccionar Idioma',
    active: 'Activo',
    connected: 'Conectado',
  },
};

const LANGUAGE_KV_KEY = '@arise_language';

interface LanguageStore {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  loadLanguage: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: 'hi', // Default to Hindi as preferred by user, or en-US if fallback

  loadLanguage: async () => {
    try {
      // 1. Web LocalStorage check
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(LANGUAGE_KV_KEY);
        if (saved) {
          set({ language: saved as LanguageCode });
          return;
        }
      }

      // 2. SQLite Key-Value check
      try {
        expoDb.runSync(
          'CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)'
        );
        const res = (expoDb as any).getFirstSync(
          'SELECT val FROM arise_kv WHERE key = ?',
          [LANGUAGE_KV_KEY]
        ) as { val: string } | null;
        if (res?.val) {
          set({ language: res.val as LanguageCode });
          return;
        }
      } catch {}
    } catch (e) {
      console.warn('[i18n] Error loading language:', e);
    }
  },

  setLanguage: async (lang: LanguageCode) => {
    set({ language: lang });

    // 1. Persist to web localStorage
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LANGUAGE_KV_KEY, lang);
      } catch {}
    }

    // 2. Persist to SQLite KV
    try {
      expoDb.runSync(
        'CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)'
      );
      expoDb.runSync(
        'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
        [LANGUAGE_KV_KEY, lang]
      );
    } catch (e) {
      console.warn('[i18n] Error saving language:', e);
    }
  },

  t: (key: string, fallback?: string): string => {
    const lang = get().language;
    const baseCode = (lang || 'en').split('-')[0];
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[baseCode] || TRANSLATIONS.en;
    const val = dict?.[key] || TRANSLATIONS.en?.[key] || fallback || key;
    return val;
  },
}));

/**
 * Custom React Hook for components across ARISE
 * Automatically re-renders whenever language is updated in the app!
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = useLanguageStore((s) => s.t);
  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return {
    t,
    language,
    setLanguage,
    currentLangObj,
  };
}

// Auto-initialize on app load
useLanguageStore.getState().loadLanguage().catch(() => {});
