import { ExerciseDefinition } from '../types/gym';

export const EXERCISE_DATABASE: ExerciseDefinition[] = [
  // ==========================================
  // CHEST (22 exercises)
  // ==========================================
  {
    id: 'ch_01',
    name: 'Barbell Flat Bench Press',
    category: 'CHEST',
    primaryMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Triceps', 'Anterior Deltoid'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on the bench with feet planted firmly on the floor.',
      'Grip the bar slightly wider than shoulder-width.',
      'Unrack the bar and lower it under control to your mid-chest.',
      'Press explosively back up to the starting position without bouncing.'
    ],
    safetyNote: 'Keep wrists straight and do not arch your lower back excessively.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_02',
    name: 'Incline Barbell Bench Press',
    category: 'CHEST',
    primaryMuscle: 'Upper Chest',
    secondaryMuscles: ['Front Delts', 'Triceps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Set bench to a 30-45 degree incline.',
      'Grip the bar slightly wider than shoulder-width.',
      'Lower the bar slowly to your upper chest near the collarbone.',
      'Press directly upwards until arms are extended.'
    ],
    safetyNote: 'Avoid inclines higher than 45 degrees to prevent excessive shoulder strain.',
    defaultSets: 3,
    defaultReps: '8-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_03',
    name: 'Standard Push-ups',
    category: 'CHEST',
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Core', 'Front Delts'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Assume a high plank position with hands shoulder-width apart.',
      'Lower your chest until your elbows reach a 90-degree angle.',
      'Maintain a rigid core and neutral spine.',
      'Push forcefully back up to full arm extension.'
    ],
    safetyNote: 'Do not let your lower back sag.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'ch_04',
    name: 'Flat Dumbbell Press',
    category: 'CHEST',
    primaryMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Triceps', 'Front Delts'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Sit on flat bench with dumbbells resting on thighs.',
      'Kick weights back and lie down, pressing weights above chest.',
      'Lower weights out and down until a full chest stretch is felt.',
      'Press together in a smooth converging arc.'
    ],
    safetyNote: 'Control the descent to protect rotator cuffs.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_05',
    name: 'Incline Dumbbell Press',
    category: 'CHEST',
    primaryMuscle: 'Upper Chest',
    secondaryMuscles: ['Anterior Deltoids', 'Triceps'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Set bench to a 30-degree incline.',
      'Press dumbbells overhead with palms facing away from you.',
      'Lower dumbbells slowly to the sides of your upper chest.',
      'Press back up until weights almost touch at the top.'
    ],
    safetyNote: 'Keep elbows at a 45-degree angle to the torso.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_06',
    name: 'Decline Barbell Bench Press',
    category: 'CHEST',
    primaryMuscle: 'Lower Chest',
    secondaryMuscles: ['Triceps', 'Front Delts'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Secure legs in decline bench and lie back.',
      'Unrack barbell and lower towards lower chest.',
      'Press straight up to lockout.'
    ],
    safetyNote: 'Always have a spotter or secure rack hooks on decline.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_07',
    name: 'Standing Cable Flyes',
    category: 'CHEST',
    primaryMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Front Delts'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set pulleys at shoulder height and step forward into a staggered stance.',
      'With slight bend in elbows, bring handles together in front of your chest.',
      'Squeeze chest hard for 1 second at peak contraction.',
      'Return slowly to starting stretch position.'
    ],
    safetyNote: 'Maintain core stability and avoid leaning too far forward.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_08',
    name: 'Low-to-High Cable Flyes',
    category: 'CHEST',
    primaryMuscle: 'Upper Chest',
    secondaryMuscles: ['Front Delts'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set pulleys to the lowest position.',
      'Grab handles with palms facing up, step forward.',
      'Scoop arms upward and together to eye level.',
      'Squeeze upper chest firmly at the top.'
    ],
    safetyNote: 'Do not use excessive weight that forces momentum.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_09',
    name: 'Chest Dips',
    category: 'CHEST',
    primaryMuscle: 'Lower Chest',
    secondaryMuscles: ['Triceps', 'Front Delts'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Grip parallel bars and hoist body up.',
      'Lean torso forward at roughly a 30-degree angle.',
      'Lower body until elbows are at 90 degrees.',
      'Push through palms back to the top.'
    ],
    safetyNote: 'Do not go deeper than 90 degrees if shoulders feel impinged.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_10',
    name: 'Pec Deck Machine Flyes',
    category: 'CHEST',
    primaryMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Front Delts'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Adjust seat so handles align with mid-chest.',
      'Grip handles or rest forearms on pads.',
      'Bring arms together in front of chest, squeezing inner pecs.',
      'Slowly return to starting position with full stretch.'
    ],
    safetyNote: 'Keep back flat against the backrest.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_11',
    name: 'Dumbbell Chest Pullover',
    category: 'CHEST',
    primaryMuscle: 'Chest & Serratus',
    secondaryMuscles: ['Lats', 'Triceps'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Lie perpendicular across a flat bench with shoulders supported.',
      'Hold a single dumbbell overhead with both hands forming a diamond.',
      'Lower the weight back behind head in an arc until chest stretches.',
      'Pull the dumbbell back over chest using pecs and lats.'
    ],
    safetyNote: 'Keep hips lower than shoulders throughout movement.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_12',
    name: 'Diamond Push-ups',
    category: 'CHEST',
    primaryMuscle: 'Inner Chest & Triceps',
    secondaryMuscles: ['Front Delts', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Place hands together forming a diamond with index fingers and thumbs.',
      'Lower chest down to lightly touch hands.',
      'Press back up to full extension.'
    ],
    safetyNote: 'If wrists feel discomfort, angle hands slightly outward.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'ch_13',
    name: 'Incline Push-ups',
    category: 'CHEST',
    primaryMuscle: 'Lower Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Place hands on an elevated bench or box.',
      'Maintain straight body line and lower chest to edge.',
      'Press back up smoothly.'
    ],
    safetyNote: 'Great starting movement for beginners.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'ch_14',
    name: 'Decline Push-ups',
    category: 'CHEST',
    primaryMuscle: 'Upper Chest',
    secondaryMuscles: ['Front Deltoids', 'Triceps'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Elevate feet on a bench and place hands on floor.',
      'Lower chest to floor under control.',
      'Press up forcefully.'
    ],
    safetyNote: 'Engage glutes and abs to avoid lumbar hyperextension.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'ch_15',
    name: 'Hammer Strength Chest Press',
    category: 'CHEST',
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Front Delts'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Adjust seat height so handles line up with mid-chest.',
      'Press handles outward to near lockout.',
      'Slowly return to start position.'
    ],
    safetyNote: 'Do not lock elbows violently at full extension.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_16',
    name: 'Dumbbell Flat Flyes',
    category: 'CHEST',
    primaryMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Front Delts'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat holding dumbbells extended above chest.',
      'Lower arms in a wide hugging arc until chest is stretched.',
      'Squeeze dumbbells back together over chest.'
    ],
    safetyNote: 'Keep slight bend in elbows to avoid joint strain.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_17',
    name: 'Incline Dumbbell Flyes',
    category: 'CHEST',
    primaryMuscle: 'Upper Chest',
    secondaryMuscles: ['Front Delts'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Lie on 30-degree incline bench with dumbbells overhead.',
      'Lower dumbbells laterally in an arc.',
      'Contract upper chest to return to starting position.'
    ],
    safetyNote: 'Avoid excessive depth that strains anterior capsule.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_18',
    name: 'Floor Press (Dumbbell)',
    category: 'CHEST',
    primaryMuscle: 'Mid Chest & Triceps',
    secondaryMuscles: ['Front Delts'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Lie flat on the floor with knees bent and feet flat.',
      'Press dumbbells up until arms are straight.',
      'Lower until upper arms lightly touch the floor, pause, and press up.'
    ],
    safetyNote: 'Great for lifters with shoulder issues.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_19',
    name: 'High-to-Low Cable Flyes',
    category: 'CHEST',
    primaryMuscle: 'Lower Chest',
    secondaryMuscles: ['Front Delts'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set pulleys above head height.',
      'Bring handles down and forward across your pelvis.',
      'Squeeze lower chest at peak contraction.'
    ],
    safetyNote: 'Keep torso still and avoid swinging.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_20',
    name: 'Svend Press (Plate Press)',
    category: 'CHEST',
    primaryMuscle: 'Inner Chest',
    secondaryMuscles: ['Front Delts'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Pinch two light weight plates or a dumbbell between your palms at chest height.',
      'Press straight out while maintaining intense inward pressure.',
      'Pull back into chest and repeat.'
    ],
    safetyNote: 'Focus on constant inward contraction rather than heavy weight.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'ch_21',
    name: 'Wide-Grip Push-ups',
    category: 'CHEST',
    primaryMuscle: 'Outer Chest',
    secondaryMuscles: ['Shoulders', 'Triceps'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Place hands roughly 1.5x shoulder width apart.',
      'Lower chest slowly and push up.'
    ],
    safetyNote: 'Do not flare elbows at a 90-degree angle; keep them tucked at 45 degrees.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'ch_22',
    name: 'Resistance Band Chest Press',
    category: 'CHEST',
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Wrap band around upper back or anchor behind you.',
      'Press handles or ends straight forward.',
      'Squeeze chest at full lockout.'
    ],
    safetyNote: 'Ensure band is securely anchored.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // BACK (24 exercises)
  // ==========================================
  {
    id: 'bk_01',
    name: 'Conventional Barbell Deadlift',
    category: 'BACK',
    primaryMuscle: 'Erector Spinae & Lats',
    secondaryMuscles: ['Hamstrings', 'Glutes', 'Traps', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Stand with mid-foot under barbell, feet hip-width.',
      'Hinge hips back, grip bar just outside knees.',
      'Brace core, flatten spine, pull chest up.',
      'Drive through floor, extending hips and knees simultaneously to lockout.'
    ],
    safetyNote: 'Do not round lower back. Stop immediately if form breaks.',
    defaultSets: 4,
    defaultReps: '5-8',
    defaultRestSeconds: 120,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_02',
    name: 'Wide-Grip Pull-ups',
    category: 'BACK',
    primaryMuscle: 'Latissimus Dorsi',
    secondaryMuscles: ['Biceps', 'Rhomboids', 'Middle Traps'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Hang from bar with overhand grip wider than shoulders.',
      'Depress scapulae and pull chest up toward the bar.',
      'Lower with control until arms are fully extended.'
    ],
    safetyNote: 'Avoid kipping or swinging legs for momentum.',
    defaultSets: 4,
    defaultReps: '6-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_03',
    name: 'Bent-Over Barbell Row',
    category: 'BACK',
    primaryMuscle: 'Upper Back & Lats',
    secondaryMuscles: ['Biceps', 'Rear Delts', 'Spinal Erectors'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Hinge forward at hips with knees slightly bent and back flat (~45 degrees).',
      'Grip bar with overhand grip.',
      'Pull barbell up to lower ribs, squeezing shoulder blades together.',
      'Lower under control without rounding back.'
    ],
    safetyNote: 'Maintain tight abdominal pressure to protect lumbar spine.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_04',
    name: 'Lat Pulldown (Wide Grip)',
    category: 'BACK',
    primaryMuscle: 'Latissimus Dorsi',
    secondaryMuscles: ['Biceps', 'Teres Major', 'Rear Delts'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Sit facing machine with thighs secured under pads.',
      'Grip wide bar with overhand grip.',
      'Pull bar down to upper chest while driving elbows down and back.',
      'Slowly resist bar back up to full stretch.'
    ],
    safetyNote: 'Do not pull the bar behind your neck.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_05',
    name: 'Single-Arm Dumbbell Row',
    category: 'BACK',
    primaryMuscle: 'Latissimus Dorsi',
    secondaryMuscles: ['Rhomboids', 'Biceps', 'Rear Delts'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Place one knee and hand on flat bench for support.',
      'Hold dumbbell in free hand with arm extended.',
      'Pull dumbbell up towards hip crease, keeping elbow close to torso.',
      'Lower dumbbell slowly until lat is stretched.'
    ],
    safetyNote: 'Keep torso parallel to bench and do not twist spine excessively.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_06',
    name: 'Seated Cable Row',
    category: 'BACK',
    primaryMuscle: 'Mid Back (Rhomboids & Traps)',
    secondaryMuscles: ['Lats', 'Biceps'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Sit with feet on footplates, knees slightly bent.',
      'Hold V-handle with arms extended and spine neutral.',
      'Pull handle to abdomen while retracting scapulae.',
      'Extend arms back slowly without rounding shoulders forward.'
    ],
    safetyNote: 'Do not rock backward and forward to heave weight.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_07',
    name: 'T-Bar Row',
    category: 'BACK',
    primaryMuscle: 'Mid Back & Lats',
    secondaryMuscles: ['Traps', 'Biceps', 'Lower Back'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Straddle bar, hinge hips back and grip V-bar attachment.',
      'Pull handle to upper abdomen, contracting shoulder blades.',
      'Lower slowly to full stretch.'
    ],
    safetyNote: 'Keep chest lifted and maintain lumbar arch.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_08',
    name: 'Chin-ups (Underhand Grip)',
    category: 'BACK',
    primaryMuscle: 'Lats & Biceps',
    secondaryMuscles: ['Forearms', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Grip bar with palms facing you, shoulder-width apart.',
      'Pull chin over the bar.',
      'Lower smoothly to a full dead hang.'
    ],
    safetyNote: 'Engage core to prevent hip swinging.',
    defaultSets: 3,
    defaultReps: '6-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_09',
    name: 'Face Pulls (Cable)',
    category: 'BACK',
    primaryMuscle: 'Rear Deltoids & Rotator Cuff',
    secondaryMuscles: ['Rhomboids', 'Traps'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Attach rope to upper pulley.',
      'Pull rope towards face, separating hands and rotating wrists outward.',
      'Squeeze rear shoulders and upper back.',
      'Return slowly to starting position.'
    ],
    safetyNote: 'Focus on external shoulder rotation rather than heavy loading.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_10',
    name: 'Straight-Arm Cable Pushdown',
    category: 'BACK',
    primaryMuscle: 'Latissimus Dorsi',
    secondaryMuscles: ['Teres Major', 'Triceps Long Head'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Stand facing high pulley with straight bar or rope.',
      'With arms almost straight, sweep bar down to thighs.',
      'Squeeze lats hard at bottom, then return slowly to eye level.'
    ],
    safetyNote: 'Keep elbows slightly unlocked and torso stationary.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_11',
    name: 'Chest-Supported Incline Dumbbell Row',
    category: 'BACK',
    primaryMuscle: 'Rhomboids & Mid Traps',
    secondaryMuscles: ['Lats', 'Rear Delts', 'Biceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Lie face down on a 30-degree incline bench with dumbbells hanging.',
      'Row dumbbells up by driving elbows toward ceiling.',
      'Pause and pinch shoulder blades together.',
      'Lower weights to full stretch.'
    ],
    safetyNote: 'Takes all stress off lower back; excellent for spine safety.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_12',
    name: 'Barbell Shrugs',
    category: 'BACK',
    primaryMuscle: 'Upper Trapezius',
    secondaryMuscles: ['Forearms'],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: [
      'Stand tall holding barbell in front with shoulder-width grip.',
      'Elevate shoulders straight up towards ears.',
      'Hold peak squeeze for 1-2 seconds.',
      'Lower smoothly.'
    ],
    safetyNote: 'Do not roll shoulders; move straight up and down.',
    defaultSets: 4,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_13',
    name: 'Dumbbell Shrugs',
    category: 'BACK',
    primaryMuscle: 'Upper Trapezius',
    secondaryMuscles: ['Forearms'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells at sides with neutral grip.',
      'Shrug shoulders up as high as possible.',
      'Hold top contraction, then release under control.'
    ],
    safetyNote: 'Maintain upright posture with neutral neck.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_14',
    name: 'Inverted Bodyweight Row',
    category: 'BACK',
    primaryMuscle: 'Upper Back & Rhomboids',
    secondaryMuscles: ['Biceps', 'Rear Delts'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Set bar at waist height in squat rack or Smith machine.',
      'Lie underneath and grab bar with overhand grip.',
      'Keeping body in straight plank, pull chest to bar.',
      'Lower slowly to full arm hang.'
    ],
    safetyNote: 'Keep glutes squeezed and body rigid.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_15',
    name: 'Hyperextensions / Back Extensions',
    category: 'BACK',
    primaryMuscle: 'Lower Back (Spinal Erectors)',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Position yourself on Roman chair with pad below hip crease.',
      'Cross arms over chest and lower torso forward.',
      'Raise torso back up in line with legs without hyperextending.'
    ],
    safetyNote: 'Do not violently fling upper body backward.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_16',
    name: 'Rack Pulls',
    category: 'BACK',
    primaryMuscle: 'Upper Back, Traps & Erectors',
    secondaryMuscles: ['Forearms', 'Glutes'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Set bar on rack pins just below knee height.',
      'Hinge down, set back flat, and pull bar up to hip lockout.',
      'Lower under control to pins.'
    ],
    safetyNote: 'Avoid bouncing barbell off rack pins.',
    defaultSets: 3,
    defaultReps: '6-8',
    defaultRestSeconds: 120,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_17',
    name: 'Close-Grip Lat Pulldown',
    category: 'BACK',
    primaryMuscle: 'Lower Lats',
    secondaryMuscles: ['Biceps', 'Rhomboids'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Attach V-handle to lat pulldown cable.',
      'Pull handle to upper chest while leaning back slightly.',
      'Squeeze lats down, then return to full overhead stretch.'
    ],
    safetyNote: 'Focus on driving elbows straight down.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_18',
    name: 'Meadows Row (Landmine)',
    category: 'BACK',
    primaryMuscle: 'Lats & Upper Back',
    secondaryMuscles: ['Biceps', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Stand perpendicular to landmine barbell.',
      'Stagger stance and grip the thick end of the sleeve.',
      'Row barbell up leading with elbow.',
      'Lower to deep lat stretch.'
    ],
    safetyNote: 'Use lifting straps if grip fatigues before back.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_19',
    name: 'Kettlebell Swings',
    category: 'BACK',
    primaryMuscle: 'Posterior Chain & Erector Spinae',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'kettlebell',
    difficulty: 'intermediate',
    instructions: [
      'Stand feet shoulder-width, hike kettlebell between legs.',
      'Snap hips forward explosively to swing bell to chest height.',
      'Hinge back cleanly on descent.'
    ],
    safetyNote: 'Movement is a hip hinge, not a squat.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_20',
    name: 'Good Mornings (Barbell)',
    category: 'BACK',
    primaryMuscle: 'Lower Back & Hamstrings',
    secondaryMuscles: ['Glutes', 'Upper Back'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Rest barbell on upper traps as in a back squat.',
      'Hinge hips backward with soft knees until torso is near parallel to floor.',
      'Drive hips forward to return to standing.'
    ],
    safetyNote: 'Use light weight and master form before progressing.',
    defaultSets: 3,
    defaultReps: '8-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_21',
    name: 'Supermans (Prone Back Extension)',
    category: 'BACK',
    primaryMuscle: 'Spinal Erectors',
    secondaryMuscles: ['Glutes', 'Rear Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie face down on floor with arms and legs outstretched.',
      'Simultaneously raise arms, chest, and thighs off the floor.',
      'Hold for 2 seconds, then lower smoothly.'
    ],
    safetyNote: 'Do not hyperextend neck; look at floor.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_22',
    name: 'Resistance Band Pull-Aparts',
    category: 'BACK',
    primaryMuscle: 'Rear Delts & Rhomboids',
    secondaryMuscles: ['Upper Traps'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Hold band at shoulder width with arms straight.',
      'Pull band apart horizontally until it touches chest.',
      'Squeeze shoulder blades together firmly.'
    ],
    safetyNote: 'Great warm-up exercise for shoulder health.',
    defaultSets: 3,
    defaultReps: '20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_23',
    name: 'Machine Seated Lat Row',
    category: 'BACK',
    primaryMuscle: 'Lats & Rhomboids',
    secondaryMuscles: ['Biceps'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Adjust chest pad so arms reach handles with full extension.',
      'Pull handles back towards torso.',
      'Squeeze back muscles and return under control.'
    ],
    safetyNote: 'Keep chest glued to support pad throughout.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bk_24',
    name: 'Renegade Rows (Dumbbell Plank Row)',
    category: 'BACK',
    primaryMuscle: 'Upper Back & Core',
    secondaryMuscles: ['Biceps', 'Shoulders'],
    equipment: 'dumbbells',
    difficulty: 'advanced',
    instructions: [
      'Hold push-up plank position with hands on dumbbells.',
      'Row one dumbbell up to ribcage while stabilizing core.',
      'Lower and repeat on opposite side.'
    ],
    safetyNote: 'Widen feet to prevent hips from rotating.',
    defaultSets: 3,
    defaultReps: '8-10 / side',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // SHOULDERS (20 exercises)
  // ==========================================
  {
    id: 'sh_01',
    name: 'Overhead Barbell Military Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Anterior & Lateral Deltoids',
    secondaryMuscles: ['Triceps', 'Upper Chest', 'Core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand tall with barbell racked on front delts.',
      'Brace core, glutes, and press bar overhead in a vertical path.',
      'Lock out overhead with head pushed slightly through.',
      'Lower with control back to clavicle.'
    ],
    safetyNote: 'Do not arch back excessively to compensate for shoulder tightness.',
    defaultSets: 4,
    defaultReps: '6-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_02',
    name: 'Seated Dumbbell Shoulder Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Front & Side Delts',
    secondaryMuscles: ['Triceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Sit on high-back bench with dumbbells at shoulder level.',
      'Press dumbbells overhead until arms are nearly straight.',
      'Lower slowly back to ear level.'
    ],
    safetyNote: 'Keep back flat against the backrest.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_03',
    name: 'Standing Dumbbell Lateral Raises',
    category: 'SHOULDERS',
    primaryMuscle: 'Lateral Deltoids',
    secondaryMuscles: ['Traps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Stand with dumbbells at sides with slight forward torso tilt.',
      'Raise weights out to sides leading with elbows until parallel with floor.',
      'Pause briefly at top, then lower with control.'
    ],
    safetyNote: 'Do not use body swing. Keep palms facing down/slightly forward.',
    defaultSets: 4,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_04',
    name: 'Cable Lateral Raise',
    category: 'SHOULDERS',
    primaryMuscle: 'Lateral Deltoids',
    secondaryMuscles: ['Traps'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set low pulley and grab handle across body.',
      'Raise arm out to side until shoulder height.',
      'Lower slowly resisting cable tension.'
    ],
    safetyNote: 'Provides continuous tension through full range of motion.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_05',
    name: 'Bent-Over Rear Delt Flyes',
    category: 'SHOULDERS',
    primaryMuscle: 'Posterior Deltoids',
    secondaryMuscles: ['Rhomboids', 'Traps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hinge hips forward until torso is parallel with floor.',
      'With slight bend in elbows, raise dumbbells out to sides.',
      'Squeeze rear shoulders at top, then lower slowly.'
    ],
    safetyNote: 'Keep neck in neutral alignment with spine.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_06',
    name: 'Arnold Dumbbell Press',
    category: 'SHOULDERS',
    primaryMuscle: 'All Deltoid Heads',
    secondaryMuscles: ['Triceps'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Start with dumbbells in front of chest, palms facing you.',
      'As you press upward, rotate wrists so palms face forward at top.',
      'Reverse rotation on the controlled descent.'
    ],
    safetyNote: 'Perform rotation smoothly throughout the press.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_07',
    name: 'Barbell Upright Row',
    category: 'SHOULDERS',
    primaryMuscle: 'Side Delts & Traps',
    secondaryMuscles: ['Biceps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Hold barbell with overhand grip roughly shoulder width.',
      'Pull bar up along body, leading with elbows until elbows reach shoulder height.',
      'Lower slowly.'
    ],
    safetyNote: 'Do not use narrow grip to prevent shoulder impingement.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_08',
    name: 'Front Dumbbell Raises',
    category: 'SHOULDERS',
    primaryMuscle: 'Anterior Deltoids',
    secondaryMuscles: ['Upper Chest'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells in front of thighs.',
      'Raise one or both arms forward to shoulder height.',
      'Lower under control without swinging.'
    ],
    safetyNote: 'Do not raise above eye level.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_09',
    name: 'Reverse Pec Deck Flyes',
    category: 'SHOULDERS',
    primaryMuscle: 'Rear Deltoids',
    secondaryMuscles: ['Rhomboids', 'Traps'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit facing machine with chest on pad.',
      'Grip handles and pull arms backward in a horizontal arc.',
      'Hold rear delt contraction for 1 second, then return slowly.'
    ],
    safetyNote: 'Adjust seat so handles align with shoulders.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_10',
    name: 'Pike Push-ups',
    category: 'SHOULDERS',
    primaryMuscle: 'Anterior Deltoids',
    secondaryMuscles: ['Triceps', 'Upper Chest'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Assume a push-up position and hike hips into a V shape.',
      'Lower crown of head towards floor between hands.',
      'Push back up diagonally to starting pike.'
    ],
    safetyNote: 'Keep core engaged and neck relaxed.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_11',
    name: 'Handstand Push-ups (Wall Supported)',
    category: 'SHOULDERS',
    primaryMuscle: 'Shoulders & Triceps',
    secondaryMuscles: ['Core', 'Upper Chest'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Kick up into a handstand against a wall.',
      'Lower head slowly until lightly touching the floor.',
      'Press explosively back to lockout.'
    ],
    safetyNote: 'Only attempt with adequate shoulder strength and a mat.',
    defaultSets: 3,
    defaultReps: '5-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_12',
    name: 'Landmine Single-Arm Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Anterior Deltoids',
    secondaryMuscles: ['Upper Chest', 'Triceps', 'Core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Hold end of landmine barbell at shoulder height in staggered stance.',
      'Press upward and forward at a natural 45-degree angle.',
      'Lower under control to shoulder.'
    ],
    safetyNote: 'Very shoulder-friendly pressing angle.',
    defaultSets: 3,
    defaultReps: '8-10 / arm',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_13',
    name: 'Cable Front Raise (Rope Attachment)',
    category: 'SHOULDERS',
    primaryMuscle: 'Front Deltoids',
    secondaryMuscles: ['Upper Chest'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Straddle low cable with rope attachment between legs.',
      'Raise rope forward to eye level.',
      'Lower slowly resisting cable tension.'
    ],
    safetyNote: 'Keep torso upright and braced.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_14',
    name: 'Kettlebell Halos',
    category: 'SHOULDERS',
    primaryMuscle: 'Shoulder Mobility & Delts',
    secondaryMuscles: ['Core', 'Upper Back'],
    equipment: 'kettlebell',
    difficulty: 'beginner',
    instructions: [
      'Hold kettlebell upside down by horns at chest height.',
      'Circle kettlebell around head closely and smoothly.',
      'Alternate clockwise and counterclockwise directions.'
    ],
    safetyNote: 'Do not move torso; keep core locked.',
    defaultSets: 3,
    defaultReps: '10 / direction',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_15',
    name: 'Push Press (Barbell)',
    category: 'SHOULDERS',
    primaryMuscle: 'Deltoids & Power Generation',
    secondaryMuscles: ['Triceps', 'Quads', 'Core'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Rack bar on shoulders, dip knees slightly (~3-4 inches).',
      'Drive aggressively through legs and press bar overhead.',
      'Lock out overhead, then lower under control.'
    ],
    safetyNote: 'Coordinate leg drive with shoulder press smoothly.',
    defaultSets: 4,
    defaultReps: '5-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_16',
    name: 'Machine Shoulder Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Anterior & Side Delts',
    secondaryMuscles: ['Triceps'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Adjust seat so handles are at ear level.',
      'Press handles overhead to full arm extension.',
      'Lower smoothly back to start position.'
    ],
    safetyNote: 'Keep elbows directly underneath hands.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_17',
    name: 'Lu Raises (Lateral Raise to Overhead)',
    category: 'SHOULDERS',
    primaryMuscle: 'Side Delts & Traps',
    secondaryMuscles: ['Rotator Cuff'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Hold light dumbbells at sides.',
      'Raise lateral arms all the way overhead until weights tap lightly.',
      'Lower slowly along the same wide circular path.'
    ],
    safetyNote: 'Use very light weights to build healthy shoulder mobility.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_18',
    name: 'Cable Y-Raises',
    category: 'SHOULDERS',
    primaryMuscle: 'Lateral Deltoids & Lower Traps',
    secondaryMuscles: ['Upper Back'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set dual pulleys at bottom, grab opposite cables crosswise.',
      'Raise arms diagonally upward into a Y formation.',
      'Hold peak squeeze, then lower slowly.'
    ],
    safetyNote: 'Great for shoulder stabilization and posture.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_19',
    name: 'Barbell Bradford Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Front & Rear Delts',
    secondaryMuscles: ['Triceps'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Press bar just over head height from front to behind neck.',
      'Immediately press over head back to front.',
      'That is one repetition.'
    ],
    safetyNote: 'Use moderate weight and move smoothly without grazing skull.',
    defaultSets: 3,
    defaultReps: '8-10',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'sh_20',
    name: 'Dumbbell Cuban Press',
    category: 'SHOULDERS',
    primaryMuscle: 'Rotator Cuff & Delts',
    secondaryMuscles: ['Upper Back'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Upright row dumbbells to chest, externally rotate forearms up, then press overhead.',
      'Reverse the sequence smoothly on the way down.'
    ],
    safetyNote: 'Excellent for bulletproofing rotator cuffs.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // BICEPS (18 exercises)
  // ==========================================
  {
    id: 'bi_01',
    name: 'Standing Barbell Bicep Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: [
      'Stand tall holding barbell with shoulder-width underhand grip.',
      'Keep elbows pinned to your ribs.',
      'Curl the barbell up towards your shoulders.',
      'Squeeze biceps at top, then lower with a 3-second negative.'
    ],
    safetyNote: 'Do not swing hips or lean backwards.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_02',
    name: 'Incline Dumbbell Bicep Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Long Head (Peak)',
    secondaryMuscles: ['Brachialis'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Sit on a 45-degree incline bench with dumbbells hanging straight down.',
      'Curl dumbbells up while keeping elbows behind torso line.',
      'Supinate wrists at top for maximum contraction.'
    ],
    safetyNote: 'Do not let shoulders pull forward at bottom stretch.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_03',
    name: 'Standing Dumbbell Hammer Curls',
    category: 'BICEPS',
    primaryMuscle: 'Brachialis & Brachioradialis',
    secondaryMuscles: ['Biceps Short Head'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells at sides with palms facing each other (neutral grip).',
      'Curl weights up while maintaining neutral palm orientation.',
      'Squeeze at top, then lower smoothly.'
    ],
    safetyNote: 'Builds arm thickness and forearm strength.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_04',
    name: 'EZ-Bar Preacher Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Short Head',
    secondaryMuscles: ['Forearms'],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: [
      'Rest armpits over preacher bench pad, holding EZ bar.',
      'Curl bar up toward face.',
      'Lower slowly until arms are near full extension.'
    ],
    safetyNote: 'Do not violently hyperextend elbows at the bottom.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_05',
    name: 'Concentration Curls',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Brachialis'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Sit on bench, brace elbow against inner thigh.',
      'Curl dumbbell upwards with zero torso movement.',
      'Squeeze at top, lower slowly.'
    ],
    safetyNote: 'Isolates bicep completely from shoulder involvement.',
    defaultSets: 3,
    defaultReps: '10-12 / arm',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_06',
    name: 'Standing Cable Bicep Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Forearms'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Attach straight bar or EZ bar to low pulley.',
      'Curl bar up to shoulders, keeping elbows stationary.',
      'Resist the cable tension on the way down.'
    ],
    safetyNote: 'Maintains constant tension across the entire strength curve.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_07',
    name: 'High Cable Bicep Curl (Hercules Curl)',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Peak',
    secondaryMuscles: ['Brachialis'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Stand between dual high pulleys holding stirrup handles.',
      'With arms at shoulder height, curl handles toward ears.',
      'Flex biceps firmly at peak contraction.'
    ],
    safetyNote: 'Keep upper arms parallel to floor throughout.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_08',
    name: 'Reverse Barbell Curl',
    category: 'BICEPS',
    primaryMuscle: 'Brachioradialis & Forearms',
    secondaryMuscles: ['Biceps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Grip barbell with overhand (pronated) grip.',
      'Curl bar up while keeping wrists rigid.',
      'Lower slowly.'
    ],
    safetyNote: 'Builds massive forearm size and grip endurance.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_09',
    name: 'Spider Curls (Chest on Incline)',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Short Head',
    secondaryMuscles: ['Brachialis'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie face down on 45-degree incline bench with arms hanging over front.',
      'Curl EZ bar or dumbbells upward.',
      'Squeeze hard at top without swinging elbows forward.'
    ],
    safetyNote: 'Eliminates shoulder cheat for pure bicep loading.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_10',
    name: 'Zottman Curls',
    category: 'BICEPS',
    primaryMuscle: 'Biceps & Forearms',
    secondaryMuscles: ['Brachialis'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Curl dumbbells up with palms facing up.',
      'At top, rotate wrists so palms face down.',
      'Lower weights with palms-down grip, then rotate back at bottom.'
    ],
    safetyNote: 'Combines standard curl hypertrophy with reverse curl forearm benefits.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_11',
    name: 'Seated Alternating Dumbbell Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Forearms'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Sit tall on flat or upright bench.',
      'Curl one dumbbell while supinating wrist.',
      'Lower and repeat on opposite arm.'
    ],
    safetyNote: 'Focus on full mind-muscle connection per arm.',
    defaultSets: 3,
    defaultReps: '10-12 / arm',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_12',
    name: 'Rope Hammer Cable Curl',
    category: 'BICEPS',
    primaryMuscle: 'Brachialis',
    secondaryMuscles: ['Biceps', 'Forearms'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Attach rope to low pulley.',
      'Curl rope up with neutral grip, spreading ends apart at top.',
      'Lower under control.'
    ],
    safetyNote: 'Great for forearm and elbow tendon health.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_13',
    name: 'Plate Curls',
    category: 'BICEPS',
    primaryMuscle: 'Biceps & Finger Grip',
    secondaryMuscles: ['Forearms'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Grip the rim of a standard weight plate with both hands.',
      'Curl plate up towards chin.',
      'Lower slowly.'
    ],
    safetyNote: 'Use secure grip to avoid dropping plate.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_14',
    name: 'Cross-Body Hammer Curls',
    category: 'BICEPS',
    primaryMuscle: 'Brachialis',
    secondaryMuscles: ['Biceps Long Head'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Curl dumbbell diagonally across torso towards opposite chest.',
      'Lower under control and switch sides.'
    ],
    safetyNote: 'Accentuates upper arm thickness and separation.',
    defaultSets: 3,
    defaultReps: '10-12 / arm',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_15',
    name: 'Machine Bicep Curl',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Brachialis'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in machine, align elbows with pivot point.',
      'Curl handles upward toward face.',
      'Lower under control.'
    ],
    safetyNote: 'Keep upper arms flat against pads.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_16',
    name: 'Drag Curls (Barbell)',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Long Head',
    secondaryMuscles: ['Rear Delts'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand holding bar; pull elbows backward so bar drags straight up torso.',
      'Squeeze biceps hard at top.',
      'Lower along the same path.'
    ],
    safetyNote: 'Focus on keeping the bar in contact with your shirt.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_17',
    name: 'Banded Bicep Curls',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii',
    secondaryMuscles: ['Forearms'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Stand on center of resistance band.',
      'Hold handles with underhand grip and curl up.',
      'Squeeze peak contraction.'
    ],
    safetyNote: 'Tension increases as bicep contracts.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'bi_18',
    name: '21s (Bicep Curl Method)',
    category: 'BICEPS',
    primaryMuscle: 'Biceps Brachii (Endurance & Pump)',
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Perform 7 reps bottom-to-midpoint.',
      'Immediately perform 7 reps midpoint-to-top.',
      'Finish with 7 full-range reps without stopping.'
    ],
    safetyNote: 'Lighten weight by 30-40% compared to standard curls.',
    defaultSets: 2,
    defaultReps: '21',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // TRICEPS (18 exercises)
  // ==========================================
  {
    id: 'tr_01',
    name: 'Cable Tricep Rope Pushdown',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Lateral Head',
    secondaryMuscles: ['Triceps Medial Head'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Stand facing high pulley with rope attachment.',
      'Pin elbows to sides, push rope down until arms are straight.',
      'Flourish rope ends apart at bottom for maximum contraction.',
      'Return slowly to chest height.'
    ],
    safetyNote: 'Do not let elbows drift forward and backward.',
    defaultSets: 4,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_02',
    name: 'Skull Crushers (Lying EZ-Bar Extension)',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Long Head',
    secondaryMuscles: ['Triceps Medial Head'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on bench holding EZ bar with arms extended over chest.',
      'Bending only at elbows, lower bar to forehead or crown of head.',
      'Extend elbows back to starting position.'
    ],
    safetyNote: 'Keep elbows tucked and do not flare excessively.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_03',
    name: 'Close-Grip Barbell Bench Press',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Brachii',
    secondaryMuscles: ['Chest', 'Front Delts'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat with hands shoulder-width apart on barbell.',
      'Lower bar to lower chest while keeping elbows tucked close to ribs.',
      'Press up forcefully through triceps.'
    ],
    safetyNote: 'Do not place hands too close (less than shoulder-width) to protect wrists.',
    defaultSets: 3,
    defaultReps: '8-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_04',
    name: 'Overhead Dumbbell Tricep Extension',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Long Head',
    secondaryMuscles: ['Core'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Sit or stand holding a single dumbbell with both hands overhead.',
      'Lower dumbbell behind head until elbows reach 90 degrees.',
      'Press back up to full overhead lockout.'
    ],
    safetyNote: 'Keep ribs pulled down and core tight.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_05',
    name: 'Tricep Dips on Parallel Bars',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Brachii',
    secondaryMuscles: ['Chest', 'Front Delts'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Hold body upright on parallel bars with torso vertical.',
      'Lower body until elbows are at 90 degrees, keeping elbows tucked back.',
      'Press upward to straight arms.'
    ],
    safetyNote: 'Stay upright to emphasize triceps over chest.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_06',
    name: 'Bench Dips',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Front Delts'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Sit on edge of bench, hands gripping edge beside hips.',
      'Walk feet out and lower hips past the bench edge.',
      'Push up through palms back to lockout.'
    ],
    safetyNote: 'Keep back close to bench to avoid forward shoulder torque.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_07',
    name: 'Single-Arm Cable Tricep Kickback',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Lateral Head',
    secondaryMuscles: ['Rear Delts'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Hinge forward holding low cable without attachment.',
      'Extend arm straight back parallel to torso.',
      'Squeeze tricep firmly for 1 second, then return slowly.'
    ],
    safetyNote: 'Maintain upper arm parallel to the floor.',
    defaultSets: 3,
    defaultReps: '12-15 / arm',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_08',
    name: 'Overhead Cable Rope Extension',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Long Head',
    secondaryMuscles: ['Core'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Face away from cable pulley with rope behind head in split stance.',
      'Extend arms forward and overhead.',
      'Spread rope ends at full extension, return slowly.'
    ],
    safetyNote: 'Keep elbows pointed forward, not flared wide.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_09',
    name: 'Straight Bar Cable Pushdown',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Lateral & Medial Heads',
    secondaryMuscles: ['Forearms'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Grip straight bar on high pulley with overhand grip.',
      'Push down until arms lock out straight.',
      'Control the return to 90 degrees.'
    ],
    safetyNote: 'Keep wrists straight and rigid.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_10',
    name: 'Reverse-Grip Cable Pushdown',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Medial Head',
    secondaryMuscles: ['Forearms'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Grip bar with palms facing upward (underhand).',
      'Push down smoothly to lockout.',
      'Lower slowly.'
    ],
    safetyNote: 'Use lighter weight to maintain secure underhand grip.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_11',
    name: 'Dumbbell Skull Crushers',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Long & Lateral Heads',
    secondaryMuscles: ['Forearms'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Lie flat with neutral grip on dumbbells.',
      'Lower dumbbells beside ears by bending elbows.',
      'Extend back to starting vertical position.'
    ],
    safetyNote: 'Gentle on wrists compared to barbell versions.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_12',
    name: 'Tate Press (Dumbbell Tricep Press)',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Lateral Head',
    secondaryMuscles: ['Chest'],
    equipment: 'dumbbells',
    difficulty: 'advanced',
    instructions: [
      'Lie on flat bench with dumbbells extended, palms facing feet.',
      'Bend elbows outward, lowering dumbbells to touch center of chest.',
      'Press out and lock out triceps.'
    ],
    safetyNote: 'Great for bench press lockout strength.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_13',
    name: 'Diamond Push-ups (Tricep Focus)',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Brachii',
    secondaryMuscles: ['Chest', 'Front Delts'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Place hands together forming diamond under chest.',
      'Lower chest to touch hands, keeping elbows close to body.',
      'Push back up explosively.'
    ],
    safetyNote: 'Drop to knees if full push-up form breaks.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'tr_14',
    name: 'Single-Arm Dumbbell Overhead Extension',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Long Head',
    secondaryMuscles: ['Core'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbell overhead in one arm.',
      'Lower behind head and press straight back up.'
    ],
    safetyNote: 'Keeps muscle balance equal between arms.',
    defaultSets: 3,
    defaultReps: '10-12 / arm',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_15',
    name: 'Machine Tricep Dip',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Chest'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in machine and grip handles.',
      'Push down to full extension.',
      'Return slowly to 90 degrees.'
    ],
    safetyNote: 'Allows safe overload with strict posture.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_16',
    name: 'Banded Tricep Pushdowns',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Forearms'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Anchor band high, grip band and push down to lockout.',
      'Squeeze triceps at bottom.'
    ],
    safetyNote: 'Excellent for high rep burnout sets.',
    defaultSets: 3,
    defaultReps: '20-25',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_17',
    name: 'JM Press (Smith Machine or Barbell)',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps Medial & Lateral Heads',
    secondaryMuscles: ['Chest'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Hybrid between close-grip bench and skull crusher.',
      'Lower bar in straight line towards upper chest/neck junction.',
      'Press up through triceps.'
    ],
    safetyNote: 'Use lighter weights while learning bar trajectory.',
    defaultSets: 3,
    defaultReps: '8-10',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'tr_18',
    name: 'Bodyweight Tricep Extension (Plank to Pushup)',
    category: 'TRICEPS',
    primaryMuscle: 'Triceps & Core',
    secondaryMuscles: ['Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Start in forearm plank.',
      'Push through palms to lift elbows off floor into push-up position.',
      'Lower back to forearms with control.'
    ],
    safetyNote: 'Perform on a yoga mat to protect elbows.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // LEGS (28 exercises)
  // ==========================================
  {
    id: 'lg_01',
    name: 'Barbell Back Squat',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps & Glutes',
    secondaryMuscles: ['Hamstrings', 'Core', 'Calves', 'Spinal Erectors'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Rest barbell across upper traps, feet shoulder-width, toes slightly out.',
      'Brace core, sit hips down and back until thighs are parallel to floor or lower.',
      'Drive through mid-foot and heels to return to standing.'
    ],
    safetyNote: 'Keep knees tracking in line with toes; avoid knee cave.',
    defaultSets: 4,
    defaultReps: '6-10',
    defaultRestSeconds: 120,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_02',
    name: 'Standard Bodyweight Air Squats',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Stand feet shoulder-width, arms out for balance.',
      'Squat down until thighs reach parallel with floor.',
      'Stand up fully and squeeze glutes.'
    ],
    safetyNote: 'Keep chest up and heels pinned to the floor.',
    defaultSets: 3,
    defaultReps: '20-25',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'lg_03',
    name: 'Leg Press (45-Degree Machine)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in machine, place feet shoulder-width on platform.',
      'Lower platform under control until knees reach 90 degrees.',
      'Press through full foot back to starting position without locking knees.'
    ],
    safetyNote: 'Never lock out knees forcefully at top of leg press.',
    defaultSets: 4,
    defaultReps: '10-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_04',
    name: 'Romanian Deadlift (Barbell)',
    category: 'LEGS',
    primaryMuscle: 'Hamstrings & Glutes',
    secondaryMuscles: ['Lower Back', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Hold barbell at hip level with soft knees.',
      'Hinge hips backward while sliding bar down along thighs/shins.',
      'Stop when hamstrings are fully stretched and spine is flat.',
      'Drive hips forward to return to standing.'
    ],
    safetyNote: 'Do not bend knees like a squat; hinge at hips.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_05',
    name: 'Bulgarian Split Squats (Dumbbell)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps & Glutes',
    secondaryMuscles: ['Hamstrings', 'Calves', 'Core'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Place rear foot on bench behind you, front foot 2-3 feet forward.',
      'Hold dumbbells at sides and lower back knee towards floor.',
      'Drive through front heel to return to top.'
    ],
    safetyNote: 'Maintain upright posture; do not let front knee collapse inward.',
    defaultSets: 3,
    defaultReps: '8-10 / leg',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_06',
    name: 'Walking Dumbbell Lunges',
    category: 'LEGS',
    primaryMuscle: 'Quads & Glutes',
    secondaryMuscles: ['Hamstrings', 'Calves'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Step forward into a deep lunge, back knee nearly touching floor.',
      'Push through front heel to step directly into next forward lunge.'
    ],
    safetyNote: 'Maintain steady balance with chest proud.',
    defaultSets: 3,
    defaultReps: '12-16 total steps',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_07',
    name: 'Front Squat (Barbell)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Upper Back', 'Core', 'Glutes'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Rack bar across anterior deltoids with clean grip or crossed arms.',
      'Keep elbows high and chest vertical.',
      'Squat deep and drive straight up.'
    ],
    safetyNote: 'If elbows drop, the bar will roll forward.',
    defaultSets: 4,
    defaultReps: '6-8',
    defaultRestSeconds: 120,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_08',
    name: 'Goblet Squat (Dumbbell/Kettlebell)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Core'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Hold weight vertically against chest with elbows pointing down.',
      'Squat down between knees, pushing knees out.',
      'Stand back up and squeeze glutes.'
    ],
    safetyNote: 'Superb exercise for learning proper squat depth.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'lg_09',
    name: 'Lying Leg Curl Machine',
    category: 'LEGS',
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Calves'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Lie face down on machine with roller pad against lower calves.',
      'Curl heels toward glutes in a smooth arc.',
      'Hold peak squeeze for 1 second, then lower slowly.'
    ],
    safetyNote: 'Keep hips pressed into bench throughout.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_10',
    name: 'Seated Leg Curl Machine',
    category: 'LEGS',
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Calves'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit with thigh pad secured and roller behind ankles.',
      'Pull heels down and under seat.',
      'Resist slowly on the return stretch.'
    ],
    safetyNote: 'Deep hamstring stretch under hip flexion.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_11',
    name: 'Leg Extension Machine',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps (Rectus Femoris)',
    secondaryMuscles: [],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Align knee joints with machine pivot point.',
      'Extend legs until knees are straight.',
      'Squeeze quads for 1 second at top, then lower with control.'
    ],
    safetyNote: 'Do not kick weight up with sudden momentum.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_12',
    name: 'Standing Calf Raises (Machine or Dumbbell)',
    category: 'LEGS',
    primaryMuscle: 'Gastrocnemius (Calves)',
    secondaryMuscles: ['Soleus'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Place balls of feet on block with heels hanging off.',
      'Lower heels deep for a full calf stretch.',
      'Raise up as high as possible on toes, pausing at top.'
    ],
    safetyNote: 'Avoid bouncing at bottom stretch.',
    defaultSets: 4,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_13',
    name: 'Seated Calf Raise',
    category: 'LEGS',
    primaryMuscle: 'Soleus (Deep Calf)',
    secondaryMuscles: [],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit with pads over lower thighs, balls of feet on platform.',
      'Lower heels deep, then press up high on toes.'
    ],
    safetyNote: 'Crucial for lower leg width.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_14',
    name: 'Hack Squat (Machine)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes'],
    equipment: 'machine',
    difficulty: 'intermediate',
    instructions: [
      'Place shoulders under pads, back flat against backrest.',
      'Squat down until knees hit 90 degrees.',
      'Drive through feet back to start.'
    ],
    safetyNote: 'Keep lower back firmly in contact with pad.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_15',
    name: 'Dumbbell Step-Ups',
    category: 'LEGS',
    primaryMuscle: 'Quads & Glutes',
    secondaryMuscles: ['Hamstrings', 'Calves'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Step one foot onto a sturdy box/bench.',
      'Drive through front heel to lift body up without bouncing off back foot.',
      'Step down slowly and repeat.'
    ],
    safetyNote: 'Focus all work on the top working leg.',
    defaultSets: 3,
    defaultReps: '10-12 / leg',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_16',
    name: 'Wall Sit Hold',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps (Isometric)',
    secondaryMuscles: ['Glutes', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Press back flat against wall and slide down until thighs are parallel to floor.',
      'Hold position with knees at 90 degrees for target duration.'
    ],
    safetyNote: 'Do not rest hands on knees.',
    defaultSets: 3,
    defaultReps: '45-60 sec',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'lg_17',
    name: 'Sumo Squat (Dumbbell)',
    category: 'LEGS',
    primaryMuscle: 'Adductors (Inner Thighs) & Glutes',
    secondaryMuscles: ['Quads'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Take a wide stance with toes pointed outward at 45 degrees.',
      'Hold dumbbell between legs and squat deep.',
      'Press up through heels.'
    ],
    safetyNote: 'Keep knees pushed out over toes.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'lg_18',
    name: 'Nordic Hamstring Curl',
    category: 'LEGS',
    primaryMuscle: 'Hamstrings (Eccentric)',
    secondaryMuscles: ['Glutes', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Kneel on mat with feet anchored securely behind you.',
      'Lower torso forward slowly resisting gravity with hamstrings.',
      'Catch yourself with hands and push back up.'
    ],
    safetyNote: 'One of the most effective hamstring injury-prevention movements.',
    defaultSets: 3,
    defaultReps: '5-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_19',
    name: 'Single-Leg Romanian Deadlift (Dumbbell)',
    category: 'LEGS',
    primaryMuscle: 'Hamstrings & Balance',
    secondaryMuscles: ['Glutes', 'Ankles'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Stand on one leg, hinge forward lifting rear leg straight behind you.',
      'Lower dumbbell toward floor while keeping back flat.',
      'Return to standing.'
    ],
    safetyNote: 'Keep hips square to the floor.',
    defaultSets: 3,
    defaultReps: '10 / leg',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_20',
    name: 'Jump Squats (Plyometric)',
    category: 'LEGS',
    primaryMuscle: 'Quads & Fast-Twitch Power',
    secondaryMuscles: ['Glutes', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Squat down to quarter or half depth.',
      'Explode upward jumping off floor as high as possible.',
      'Land softly on balls of feet and absorb into next squat.'
    ],
    safetyNote: 'Land softly to protect knee joints.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'lg_21',
    name: 'Zercher Squat (Barbell in Elbows)',
    category: 'LEGS',
    primaryMuscle: 'Quads & Core',
    secondaryMuscles: ['Upper Back', 'Glutes'],
    equipment: 'barbell',
    difficulty: 'advanced',
    instructions: [
      'Cradle barbell in the crooks of your elbows against chest.',
      'Squat deep with upright torso, driving knees out.',
      'Stand back up.'
    ],
    safetyNote: 'Builds incredible core and postural strength.',
    defaultSets: 3,
    defaultReps: '6-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_22',
    name: 'Sissy Squat (Bodyweight / Machine)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps (Isolated Rectus Femoris)',
    secondaryMuscles: ['Core'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Lean torso back while bending knees forward onto toes.',
      'Lower until deep quad stretch is achieved.',
      'Push through balls of feet back up.'
    ],
    safetyNote: 'Start with bodyweight assist if knees are unconditioned.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_23',
    name: 'Box Jumps',
    category: 'LEGS',
    primaryMuscle: 'Lower Body Explosive Power',
    secondaryMuscles: ['Quads', 'Glutes', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Stand in front of a plyo box.',
      'Dip down and explode onto top of box landing softly.',
      'Step down one foot at a time.'
    ],
    safetyNote: 'Do not jump backwards off box to protect Achilles tendon.',
    defaultSets: 4,
    defaultReps: '8-10',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_24',
    name: 'Curtsy Lunges',
    category: 'LEGS',
    primaryMuscle: 'Glute Medius & Quads',
    secondaryMuscles: ['Inner Thighs'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Step one leg back and across behind your front leg.',
      'Lower hips until front thigh is parallel to floor.',
      'Return to start and alternate.'
    ],
    safetyNote: 'Keep front foot firmly planted.',
    defaultSets: 3,
    defaultReps: '12 / leg',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_25',
    name: 'Tibialis Raises',
    category: 'LEGS',
    primaryMuscle: 'Tibialis Anterior (Shins)',
    secondaryMuscles: ['Ankles'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Stand with back against wall, heels 12 inches out.',
      'Pull toes up toward shins as high as possible.',
      'Lower slowly.'
    ],
    safetyNote: 'Prevents shin splints and strengthens knee deceleration.',
    defaultSets: 3,
    defaultReps: '20-25',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_26',
    name: 'Lateral Cossack Squats',
    category: 'LEGS',
    primaryMuscle: 'Adductors, Quads & Mobility',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Stand in ultra-wide stance.',
      'Squat deep onto one leg while keeping other leg straight with toe pointed up.',
      'Shift smoothly across to other side.'
    ],
    safetyNote: 'Work within your available hip mobility range.',
    defaultSets: 3,
    defaultReps: '8-10 / side',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_27',
    name: 'Belt Squats (Machine / Dip Belt)',
    category: 'LEGS',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes'],
    equipment: 'machine',
    difficulty: 'intermediate',
    instructions: [
      'Attach belt around hips loaded with weight.',
      'Squat down cleanly without any spine axial loading.',
      'Stand up.'
    ],
    safetyNote: 'Zero spinal compression; ideal for lower back rehab.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'lg_28',
    name: 'Reverse Lunges',
    category: 'LEGS',
    primaryMuscle: 'Quads & Glutes',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Step backward into a lunge.',
      'Lower back knee and push through front heel to return.'
    ],
    safetyNote: 'Easier on knees than forward lunges.',
    defaultSets: 3,
    defaultReps: '10-12 / leg',
    defaultRestSeconds: 60,
    aiTrackable: true,
    trackingMode: 'ai'
  },

  // ==========================================
  // GLUTES (14 exercises)
  // ==========================================
  {
    id: 'gl_01',
    name: 'Barbell Hip Thrust',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Sit on floor with upper back against bench and barbell across hips.',
      'Feet flat on floor, drive through heels to lift hips until thighs and torso align.',
      'Squeeze glutes hard at top for 2 seconds, then lower under control.'
    ],
    safetyNote: 'Use a barbell pad across pelvis for comfort.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_02',
    name: 'Bodyweight Glute Bridges',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with knees bent, feet flat on floor.',
      'Drive hips up towards ceiling, squeezing glutes.',
      'Lower slowly.'
    ],
    safetyNote: 'Do not hyperextend lower back at the top.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_03',
    name: 'Cable Glute Kickbacks',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Attach ankle strap to low pulley.',
      'Kick leg straight back while squeezing glute.',
      'Lower with control.'
    ],
    safetyNote: 'Keep torso still; avoid overarching spine.',
    defaultSets: 3,
    defaultReps: '12-15 / leg',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_04',
    name: 'Seated Hip Abduction Machine',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Medius & Minimus',
    secondaryMuscles: ['Tensor Fasciae Latae'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in machine with pads against outer knees.',
      'Push knees outward against resistance.',
      'Pause at full abduction and return slowly.'
    ],
    safetyNote: 'Lean slightly forward to target upper glutes.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_05',
    name: 'Single-Leg Hip Thrust',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Support upper back on bench, lift one leg off floor.',
      'Thrust hips up with working leg.',
      'Lower and repeat.'
    ],
    safetyNote: 'Fixes glute strength imbalances.',
    defaultSets: 3,
    defaultReps: '10-12 / leg',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_06',
    name: 'Frog Pumps',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with soles of feet pressed together (butterfly legs).',
      'Bridge hips up while keeping knees flared out.',
      'Squeeze glutes at top.'
    ],
    safetyNote: 'Great for high-rep glute burnouts.',
    defaultSets: 3,
    defaultReps: '20-25',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_07',
    name: 'Banded Lateral Monster Walks',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Medius',
    secondaryMuscles: ['Abductors'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Place mini-band around ankles or above knees.',
      'Get into quarter squat, take wide lateral steps side-to-side.'
    ],
    safetyNote: 'Keep constant tension on band; do not let knees cave.',
    defaultSets: 3,
    defaultReps: '15 steps each way',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_08',
    name: 'Hyperextensions (Glute-Biased 45-Degree)',
    category: 'GLUTES',
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Round upper back slightly, flare toes out at 45 degrees.',
      'Hinge forward, then squeeze glutes to pull torso up.'
    ],
    safetyNote: 'Upper back rounding prevents lower back takeover.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_09',
    name: 'B-Stance Romanian Deadlift (Glute Focus)',
    category: 'GLUTES',
    primaryMuscle: 'Glutes & Hamstrings',
    secondaryMuscles: ['Lower Back'],
    equipment: 'dumbbells',
    difficulty: 'intermediate',
    instructions: [
      'Place one foot slightly back on ball of foot as kickstand.',
      'Hinge hips back over front working glute.',
      'Drive through front heel.'
    ],
    safetyNote: '90% of weight stays on front leg.',
    defaultSets: 3,
    defaultReps: '10-12 / leg',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_10',
    name: 'Cable Pull-Throughs',
    category: 'GLUTES',
    primaryMuscle: 'Glutes & Hamstrings',
    secondaryMuscles: ['Lower Back'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Face away from low pulley with rope between legs.',
      'Hinge back, then drive hips forward to lockout.'
    ],
    safetyNote: 'Squeeze glutes hard at full hip extension.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_11',
    name: 'Fire Hydrants',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Medius',
    secondaryMuscles: ['Core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'On hands and knees, lift one knee out to the side.',
      'Hold at top, lower slowly.'
    ],
    safetyNote: 'Do not tilt hips or lean to one side.',
    defaultSets: 3,
    defaultReps: '15 / leg',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_12',
    name: 'Donkey Kicks',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Maximus',
    secondaryMuscles: ['Hamstrings'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'On all fours, kick heel straight up towards ceiling.',
      'Squeeze glute at top, lower slowly.'
    ],
    safetyNote: 'Keep 90-degree knee bend throughout.',
    defaultSets: 3,
    defaultReps: '15 / leg',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_13',
    name: 'Dumbbell Sumo Deadlift',
    category: 'GLUTES',
    primaryMuscle: 'Glutes & Adductors',
    secondaryMuscles: ['Hamstrings', 'Quads'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Wide stance, hold heavy dumbbell vertically.',
      'Hinge and squat down, drive through heels to stand.'
    ],
    safetyNote: 'Keep chest upright.',
    defaultSets: 3,
    defaultReps: '10-12',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'gl_14',
    name: 'Side-Lying Clamshells',
    category: 'GLUTES',
    primaryMuscle: 'Gluteus Medius',
    secondaryMuscles: ['Hip External Rotators'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on side with knees bent at 90 degrees.',
      'Keeping feet glued together, open top knee like a clamshell.',
      'Hold at top, lower slowly.'
    ],
    safetyNote: 'Add a mini-band above knees for increased resistance.',
    defaultSets: 3,
    defaultReps: '20 / side',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // CORE (20 exercises)
  // ==========================================
  {
    id: 'co_01',
    name: 'Standard Forearm Plank',
    category: 'CORE',
    primaryMuscle: 'Rectus Abdominis & Transverse Abdominis',
    secondaryMuscles: ['Shoulders', 'Glutes', 'Lower Back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Rest on forearms and toes with body in a straight line.',
      'Engage core, squeeze glutes, and hold position steadily.',
      'Breathe rhythmically throughout hold.'
    ],
    safetyNote: 'Do not allow lower back to arch or hips to hike up.',
    defaultSets: 3,
    defaultReps: '45-60 sec',
    defaultRestSeconds: 45,
    aiTrackable: true,
    trackingMode: 'timer'
  },
  {
    id: 'co_02',
    name: 'Hanging Leg Raises',
    category: 'CORE',
    primaryMuscle: 'Lower Rectus Abdominis & Hip Flexors',
    secondaryMuscles: ['Forearms', 'Lats'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Hang from pull-up bar with arms straight.',
      'Raise straight legs until parallel to floor or higher.',
      'Lower under control without swinging.'
    ],
    safetyNote: 'Bend knees if straight-leg raises cause swinging.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_03',
    name: 'Ab Wheel Rollouts',
    category: 'CORE',
    primaryMuscle: 'Transverse Abdominis & Anterior Core',
    secondaryMuscles: ['Lats', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Kneel on mat holding ab wheel with both hands.',
      'Roll wheel forward extending body as far as possible.',
      'Pull back with abs to return to start.'
    ],
    safetyNote: 'Maintain posterior pelvic tilt; stop before back arches.',
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_04',
    name: 'Cable Woodchoppers',
    category: 'CORE',
    primaryMuscle: 'Obliques & Rotational Core',
    secondaryMuscles: ['Shoulders'],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Set cable at high position, grip with both hands in athletic stance.',
      'Rotate torso diagonally down across body to opposite hip.',
      'Return slowly resisting cable.'
    ],
    safetyNote: 'Rotate through thoracic spine and hips, not lumbar.',
    defaultSets: 3,
    defaultReps: '12 / side',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_05',
    name: 'Russian Twists',
    category: 'CORE',
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Rectus Abdominis'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Sit on floor with knees bent and feet elevated.',
      'Rotate torso side to side, tapping hands on floor.'
    ],
    safetyNote: 'Keep spine tall, do not slouch.',
    defaultSets: 3,
    defaultReps: '20-30 total twists',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_06',
    name: 'Bicycle Crunches',
    category: 'CORE',
    primaryMuscle: 'Obliques & Rectus Abdominis',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with hands behind head, legs in tabletop.',
      'Bring opposite elbow to knee while extending other leg.',
      'Alternate smoothly in a pedaling motion.'
    ],
    safetyNote: 'Do not pull on neck with hands.',
    defaultSets: 3,
    defaultReps: '20-30 reps',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_07',
    name: 'Standard Floor Sit-ups',
    category: 'CORE',
    primaryMuscle: 'Rectus Abdominis',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with knees bent, feet flat.',
      'Curl torso up all the way to sitting position.',
      'Lower back down under control.'
    ],
    safetyNote: 'Cross arms across chest to avoid neck strain.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'co_08',
    name: 'Side Plank Hold',
    category: 'CORE',
    primaryMuscle: 'Obliques & QL',
    secondaryMuscles: ['Shoulders', 'Glute Medius'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on side supported on one forearm with feet stacked.',
      'Raise hips until body forms a straight diagonal line.',
      'Hold position steadily.'
    ],
    safetyNote: 'Keep hips stacked vertically.',
    defaultSets: 3,
    defaultReps: '30-45 sec / side',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'co_09',
    name: 'Deadbugs',
    category: 'CORE',
    primaryMuscle: 'Deep Core & Anti-Extension',
    secondaryMuscles: ['Hip Flexors', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with arms straight up and knees at 90 degrees.',
      'Simultaneously lower opposite arm and leg toward floor.',
      'Return to start and switch sides.'
    ],
    safetyNote: 'Keep lower back glued to floor throughout.',
    defaultSets: 3,
    defaultReps: '12-16 total reps',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_10',
    name: 'Bird Dog',
    category: 'CORE',
    primaryMuscle: 'Spinal Stabilizers & Glutes',
    secondaryMuscles: ['Shoulders', 'Erectors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'On hands and knees, extend opposite arm forward and leg backward.',
      'Hold 2 seconds, return and switch sides.'
    ],
    safetyNote: 'Keep pelvis level with floor.',
    defaultSets: 3,
    defaultReps: '12 / side',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_11',
    name: 'Cable Kneeling Crunch',
    category: 'CORE',
    primaryMuscle: 'Rectus Abdominis',
    secondaryMuscles: [],
    equipment: 'cables',
    difficulty: 'intermediate',
    instructions: [
      'Kneel below high cable holding rope behind neck.',
      'Flex spine downward, curling elbows toward knees.',
      'Squeeze abs hard at bottom, return slowly.'
    ],
    safetyNote: 'Crunch with spine flexion, do not sit back on heels.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_12',
    name: 'L-Sit Hold (Parallelettes / Dip Bars)',
    category: 'CORE',
    primaryMuscle: 'Rectus Abdominis & Hip Flexors',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Support body on dip bars and raise straight legs parallel to floor.',
      'Hold the L shape steadily.'
    ],
    safetyNote: 'Bend knees to tuck position if full L-sit is too strenuous.',
    defaultSets: 3,
    defaultReps: '15-30 sec',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'co_13',
    name: 'Pallof Press (Anti-Rotation)',
    category: 'CORE',
    primaryMuscle: 'Transverse Abdominis & Obliques',
    secondaryMuscles: ['Shoulders'],
    equipment: 'cables',
    difficulty: 'beginner',
    instructions: [
      'Stand perpendicular to cable, hold handle at chest with both hands.',
      'Press arms straight out in front, resisting rotational pull.',
      'Hold 2 seconds and return to chest.'
    ],
    safetyNote: 'Keep hips and shoulders square forward.',
    defaultSets: 3,
    defaultReps: '10-12 / side',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_14',
    name: 'Captain’s Chair Knee Raises',
    category: 'CORE',
    primaryMuscle: 'Lower Abdominals',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Support forearms on pads with back against rest.',
      'Pull knees up to chest, rounding pelvis upward.',
      'Lower with control.'
    ],
    safetyNote: 'Avoid swinging legs.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_15',
    name: 'Hollow Body Hold',
    category: 'CORE',
    primaryMuscle: 'Anterior Core',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Lie flat, press lower back to floor.',
      'Lift arms and legs 6 inches off floor into shallow banana shape.',
      'Hold position rigidly.'
    ],
    safetyNote: 'Lower back must remain in contact with floor.',
    defaultSets: 3,
    defaultReps: '30-45 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'co_16',
    name: 'Mountain Climbers',
    category: 'CORE',
    primaryMuscle: 'Core & Cardiovascular',
    secondaryMuscles: ['Shoulders', 'Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'In high plank, drive one knee towards chest.',
      'Quickly switch legs in continuous running motion.'
    ],
    safetyNote: 'Keep hips down in line with shoulders.',
    defaultSets: 3,
    defaultReps: '30-40 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'co_17',
    name: 'Flutter Kicks',
    category: 'CORE',
    primaryMuscle: 'Lower Abs',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie on back with hands under glutes.',
      'Flutter legs up and down in small, rapid alternating movements.'
    ],
    safetyNote: 'Keep abdominal wall drawn in.',
    defaultSets: 3,
    defaultReps: '30-45 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'co_18',
    name: 'V-Ups',
    category: 'CORE',
    primaryMuscle: 'Rectus Abdominis',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    instructions: [
      'Lie flat, simultaneously raise torso and straight legs into a V shape.',
      'Touch toes at top, lower slowly.'
    ],
    safetyNote: 'Control the eccentric phase.',
    defaultSets: 3,
    defaultReps: '10-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_19',
    name: 'Decline Bench Crunches',
    category: 'CORE',
    primaryMuscle: 'Upper Rectus Abdominis',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Secure feet in decline bench.',
      'Curl torso upward, squeezing upper abs.',
      'Lower with control.'
    ],
    safetyNote: 'Do not pull on head.',
    defaultSets: 3,
    defaultReps: '15-20',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'co_20',
    name: 'Windshield Wipers (Floor)',
    category: 'CORE',
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Lower Abs'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Lie on back with arms out to sides, legs straight up.',
      'Lower legs to right without touching floor, then to left in a wiper arc.'
    ],
    safetyNote: 'Keep shoulder blades flat on the floor.',
    defaultSets: 3,
    defaultReps: '10-12 / side',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },

  // ==========================================
  // FULL BODY, CARDIO & MOBILITY (20 exercises)
  // ==========================================
  {
    id: 'fb_01',
    name: 'Full Burpees',
    category: 'FULL_BODY',
    primaryMuscle: 'Full Body Conditioning',
    secondaryMuscles: ['Chest', 'Quads', 'Core', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'From standing, drop into squat and kick feet back to push-up plank.',
      'Lower chest to floor, press up and jump feet back under hips.',
      'Explode upward into jump with hands overhead.'
    ],
    safetyNote: 'Pace your breathing rhythmically.',
    defaultSets: 3,
    defaultReps: '12-15',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_02',
    name: 'Jumping Jacks',
    category: 'CARDIO',
    primaryMuscle: 'Cardiovascular & Calves',
    secondaryMuscles: ['Shoulders', 'Adductors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Jump feet outward while clapping hands overhead.',
      'Jump back to starting stance smoothly.'
    ],
    safetyNote: 'Land softly on the balls of your feet.',
    defaultSets: 3,
    defaultReps: '30-50 reps',
    defaultRestSeconds: 45,
    aiTrackable: true,
    trackingMode: 'ai'
  },
  {
    id: 'fb_03',
    name: 'High Knees Running in Place',
    category: 'CARDIO',
    primaryMuscle: 'Hip Flexors & Cardio',
    secondaryMuscles: ['Calves', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Run in place lifting knees to hip height rapidly.',
      'Pump arms in sync.'
    ],
    safetyNote: 'Maintain upright posture.',
    defaultSets: 3,
    defaultReps: '30-45 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_04',
    name: 'Jump Rope',
    category: 'CARDIO',
    primaryMuscle: 'Calves & Cardiovascular',
    secondaryMuscles: ['Forearms', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Turn rope with wrists, jumping 1-2 inches off floor.',
      'Stay light on feet.'
    ],
    safetyNote: 'Maintain steady tempo.',
    defaultSets: 3,
    defaultReps: '60 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_05',
    name: 'Dumbbell Thrusters (Squat to Overhead Press)',
    category: 'FULL_BODY',
    primaryMuscle: 'Quads & Shoulders',
    secondaryMuscles: ['Triceps', 'Glutes', 'Core'],
    equipment: 'dumbbells',
    difficulty: 'advanced',
    instructions: [
      'Hold dumbbells at shoulders, squat to full depth.',
      'Drive up explosively and press dumbbells directly overhead.'
    ],
    safetyNote: 'Transfer leg power directly into overhead press.',
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_06',
    name: 'Man Makers (Dumbbell Complex)',
    category: 'FULL_BODY',
    primaryMuscle: 'Full Body Endurance',
    secondaryMuscles: ['Chest', 'Back', 'Shoulders', 'Quads'],
    equipment: 'dumbbells',
    difficulty: 'advanced',
    instructions: [
      'Push-up on dumbbells -> Row left -> Row right -> Jump feet to hands -> Clean dumbbells -> Thruster overhead.'
    ],
    safetyNote: 'Use moderate dumbbells to preserve form throughout sequence.',
    defaultSets: 3,
    defaultReps: '6-8',
    defaultRestSeconds: 90,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_07',
    name: 'Bear Crawls',
    category: 'FULL_BODY',
    primaryMuscle: 'Core & Shoulder Stability',
    secondaryMuscles: ['Quads', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'On all fours with knees hovering 2 inches off floor.',
      'Crawl forward moving opposite hand and foot simultaneously.'
    ],
    safetyNote: 'Keep hips low and level.',
    defaultSets: 3,
    defaultReps: '30-45 sec',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_08',
    name: 'World’s Greatest Stretch',
    category: 'MOBILITY',
    primaryMuscle: 'Thoracic Spine, Hip Flexors & Hamstrings',
    secondaryMuscles: ['Glutes', 'Groin'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lunge forward, place inside hand on floor.',
      'Reach opposite arm up to ceiling, rotating thoracic spine.',
      'Hold 3 seconds and switch.'
    ],
    safetyNote: 'Excellent dynamic warm-up movement.',
    defaultSets: 2,
    defaultReps: '5 / side',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_09',
    name: 'Cat-Cow Spinal Flow',
    category: 'MOBILITY',
    primaryMuscle: 'Spine & Core Flexibility',
    secondaryMuscles: ['Neck', 'Upper Back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'On all fours, inhale and arch back (Cow).',
      'Exhale and round spine upward pulling navel in (Cat).'
    ],
    safetyNote: 'Move with your natural breath cycle.',
    defaultSets: 2,
    defaultReps: '10 cycles',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_10',
    name: 'Pigeon Pose (Hip Mobility)',
    category: 'MOBILITY',
    primaryMuscle: 'Piriformis & Glutes',
    secondaryMuscles: ['Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Bring one knee forward and shin angled across mat.',
      'Extend rear leg straight behind you, sink hips down.',
      'Hold stretch and breathe deeply.'
    ],
    safetyNote: 'Do not twist knee if hip tightness restricts depth.',
    defaultSets: 2,
    defaultReps: '45-60 sec / side',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_11',
    name: 'Deep Squat Pry / Hold',
    category: 'MOBILITY',
    primaryMuscle: 'Hips, Ankles & Groin',
    secondaryMuscles: ['Lower Back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Sit into deep squat, press elbows against inner knees.',
      'Rock gently side to side opening ankles and hips.'
    ],
    safetyNote: 'Keep heels flat on floor (elevate slightly if needed).',
    defaultSets: 2,
    defaultReps: '45-60 sec',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_12',
    name: 'Shoulder Dislocates (PVC Pipe or Band)',
    category: 'MOBILITY',
    primaryMuscle: 'Shoulder Capsule & Chest Stretch',
    secondaryMuscles: ['Upper Back'],
    equipment: 'bands',
    difficulty: 'beginner',
    instructions: [
      'Hold wide grip on band in front of thighs.',
      'Keeping arms straight, bring band overhead and all the way behind back.',
      'Return to front.'
    ],
    safetyNote: 'Widen grip if shoulders feel pinched.',
    defaultSets: 2,
    defaultReps: '12-15',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_13',
    name: 'Shadow Boxing',
    category: 'CARDIO',
    primaryMuscle: 'Cardio & Rotational Core',
    secondaryMuscles: ['Shoulders', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'In boxing stance, throw jab-cross-hook combinations.',
      'Stay light on balls of feet, slip and bob.'
    ],
    safetyNote: 'Do not hyperextend elbows on punches.',
    defaultSets: 3,
    defaultReps: '60 sec',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_14',
    name: 'Cobra Stretch',
    category: 'MOBILITY',
    primaryMuscle: 'Abdominals & Spine Extension',
    secondaryMuscles: ['Chest'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie face down, press palms to floor beside ribs.',
      'Push chest upward while keeping pelvis on floor.',
      'Gaze forward and breathe.'
    ],
    safetyNote: 'Keep shoulders pulled down away from ears.',
    defaultSets: 2,
    defaultReps: '30-45 sec',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_15',
    name: 'Kettlebell Clean & Press',
    category: 'FULL_BODY',
    primaryMuscle: 'Full Body Power',
    secondaryMuscles: ['Hips', 'Shoulders', 'Upper Back'],
    equipment: 'kettlebell',
    difficulty: 'advanced',
    instructions: [
      'Hike kettlebell, clean to rack position at shoulder.',
      'Press overhead to lockout, then return smoothly.'
    ],
    safetyNote: 'Rotate hand around bell smoothly on clean.',
    defaultSets: 3,
    defaultReps: '8 / side',
    defaultRestSeconds: 75,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_16',
    name: 'Skater Jumps (Lateral Bounds)',
    category: 'CARDIO',
    primaryMuscle: 'Lateral Power & Glutes',
    secondaryMuscles: ['Ankles', 'Quads'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Bound laterally from right foot to left foot.',
      'Sweep rear leg behind and absorb landing softly.'
    ],
    safetyNote: 'Stabilize each landing for a split second.',
    defaultSets: 3,
    defaultReps: '20 total bounds',
    defaultRestSeconds: 45,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_17',
    name: 'Thoracic Spine Foam Rolling / Extension',
    category: 'MOBILITY',
    primaryMuscle: 'Thoracic Mobility',
    secondaryMuscles: ['Upper Back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Lie with foam roller across upper back, hands behind head.',
      'Gently extend over roller, taking deep breaths.'
    ],
    safetyNote: 'Do not roll onto lumbar spine or neck.',
    defaultSets: 2,
    defaultReps: '60 sec',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'timer'
  },
  {
    id: 'fb_18',
    name: 'Farmer’s Walk',
    category: 'FULL_BODY',
    primaryMuscle: 'Grip, Traps & Core Bracing',
    secondaryMuscles: ['Forearms', 'Calves'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    instructions: [
      'Pick up heavy dumbbells or kettlebells at sides.',
      'Walk forward with tall posture and rigid core.'
    ],
    safetyNote: 'Do not allow weights to pull shoulders into slouch.',
    defaultSets: 3,
    defaultReps: '40-60 meters',
    defaultRestSeconds: 60,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_19',
    name: 'Dynamic Leg Swings (Front to Back)',
    category: 'MOBILITY',
    primaryMuscle: 'Hamstring & Hip Flexor Warm-Up',
    secondaryMuscles: ['Glutes'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Hold wall for balance, swing one leg freely forward and back.',
      'Gradually increase range of motion.'
    ],
    safetyNote: 'Keep torso upright without excessive lumbar arching.',
    defaultSets: 2,
    defaultReps: '15 / leg',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'manual'
  },
  {
    id: 'fb_20',
    name: '90/90 Hip Flow',
    category: 'MOBILITY',
    primaryMuscle: 'Internal & External Hip Rotation',
    secondaryMuscles: ['Glutes', 'Groin'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    instructions: [
      'Sit on floor with both knees bent at 90 degrees.',
      'Rotate knees side-to-side through center without lifting heels off floor.'
    ],
    safetyNote: 'Essential warm-up for deep squatting and athletic agility.',
    defaultSets: 2,
    defaultReps: '10 cycles',
    defaultRestSeconds: 30,
    aiTrackable: false,
    trackingMode: 'manual'
  }
];

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISE_DATABASE.find((e) => e.id === id);
}

export function getExercisesByCategory(category: string): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter((e) => e.category === category);
}

export function getExercisesByEquipment(equipment: string): ExerciseDefinition[] {
  if (equipment === 'full_gym') return EXERCISE_DATABASE;
  return EXERCISE_DATABASE.filter(
    (e) => e.equipment === equipment || e.equipment === 'bodyweight'
  );
}

export function getAITrackableExercises(): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter((e) => e.aiTrackable);
}
