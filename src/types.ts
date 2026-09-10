export interface Set {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  name: string;
  sets: Set[];
  notes?: string;
}

export interface WorkoutSnapshot {
  date: string;
  entries: ExerciseEntry[];
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  entries: ExerciseEntry[];
  history?: WorkoutSnapshot[];
}

export interface ProgressEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: 
    | "Chest (Piept)"
    | "Back (Spate)"
    | "Shoulders (Umeri)"
    | "Biceps"
    | "Triceps"
    | "Quadriceps (Cvadricepși)"
    | "Hamstrings (Femurali)"
    | "Glutes (Fesieri)"
    | "Calves & Tibialis (Gambe și Tibie)"
    | "Forearms & Grip (Antebrațe)"
    | "Core & Abs (Abdomen)"
    | "Olympic & Full Body";
  description?: string;
}

export const PRESET_EXERCISES: Exercise[] = [
  // 1) Chest (Piept)
  // Barbell & Dumbbell
  { id: "barbell-bench-press", name: "Barbell Bench Press", category: "Chest (Piept)" },
  { id: "flat-dumbbell-press", name: "Flat Dumbbell Press", category: "Chest (Piept)" },
  { id: "incline-barbell-bench-press", name: "Incline Barbell Bench Press", category: "Chest (Piept)" },
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "Chest (Piept)" },
  { id: "decline-barbell-bench-press", name: "Decline Barbell Bench Press", category: "Chest (Piept)" },
  { id: "decline-dumbbell-press", name: "Decline Dumbbell Press", category: "Chest (Piept)" },
  { id: "reverse-grip-barbell-bench-press", name: "Reverse-Grip Barbell Bench Press", category: "Chest (Piept)" },
  { id: "guillotine-press", name: "Guillotine Press", category: "Chest (Piept)" },
  { id: "flat-dumbbell-flyes", name: "Flat Dumbbell Flyes", category: "Chest (Piept)" },
  { id: "incline-dumbbell-flyes", name: "Incline Dumbbell Flyes", category: "Chest (Piept)" },
  { id: "decline-dumbbell-flyes", name: "Decline Dumbbell Flyes", category: "Chest (Piept)" },
  { id: "dumbbell-pullover", name: "Dumbbell Pullover", category: "Chest (Piept)" },
  { id: "dumbbell-floor-press", name: "Dumbbell Floor Press", category: "Chest (Piept)" },
  { id: "barbell-floor-press", name: "Barbell Floor Press", category: "Chest (Piept)" },
  { id: "hex-press-dumbbell-squeeze-press", name: "Hex Press (Dumbbell Squeeze Press)", category: "Chest (Piept)" },
  // Cables & Machines
  { id: "cable-crossovers-high-to-low", name: "Cable Crossovers (High to Low)", category: "Chest (Piept)" },
  { id: "cable-crossovers-low-to-high", name: "Cable Crossovers (Low to High)", category: "Chest (Piept)" },
  { id: "cable-crossovers-mid-chest", name: "Cable Crossovers (Mid-Chest)", category: "Chest (Piept)" },
  { id: "flat-cable-press", name: "Flat Cable Press", category: "Chest (Piept)" },
  { id: "incline-cable-press", name: "Incline Cable Press", category: "Chest (Piept)" },
  { id: "pec-deck-fly", name: "Pec Deck Fly", category: "Chest (Piept)" },
  { id: "machine-chest-press-seated", name: "Machine Chest Press (Seated)", category: "Chest (Piept)" },
  { id: "incline-machine-chest-press", name: "Incline Machine Chest Press", category: "Chest (Piept)" },
  { id: "decline-machine-chest-press", name: "Decline Machine Chest Press", category: "Chest (Piept)" },
  { id: "smith-machine-bench-press", name: "Smith Machine Bench Press", category: "Chest (Piept)" },
  { id: "smith-machine-incline-press", name: "Smith Machine Incline Press", category: "Chest (Piept)" },
  { id: "smith-machine-decline-press", name: "Smith Machine Decline Press", category: "Chest (Piept)" },
  // Bodyweight
  { id: "push-ups", name: "Push-Ups", category: "Chest (Piept)" },
  { id: "weighted-push-ups", name: "Weighted Push-Ups", category: "Chest (Piept)" },
  { id: "decline-push-ups", name: "Decline Push-Ups", category: "Chest (Piept)" },
  { id: "incline-push-ups", name: "Incline Push-Ups", category: "Chest (Piept)" },
  { id: "deficit-push-ups", name: "Deficit Push-Ups", category: "Chest (Piept)" },
  { id: "chest-dips", name: "Chest Dips", category: "Chest (Piept)" },
  { id: "weighted-chest-dips", name: "Weighted Chest Dips", category: "Chest (Piept)" },

  // 2) Back (Spate)
  // Deadlifts & Variations
  { id: "conventional-deadlift", name: "Conventional Deadlift", category: "Back (Spate)" },
  { id: "sumo-deadlift", name: "Sumo Deadlift", category: "Back (Spate)" },
  { id: "trap-bar-deadlift", name: "Trap Bar Deadlift", category: "Back (Spate)" },
  { id: "deficit-deadlift", name: "Deficit Deadlift", category: "Back (Spate)" },
  { id: "snatch-grip-deadlift", name: "Snatch-Grip Deadlift", category: "Back (Spate)" },
  { id: "rack-pulls", name: "Rack Pulls", category: "Back (Spate)" },
  { id: "block-pulls", name: "Block Pulls", category: "Back (Spate)" },
  // Rows
  { id: "barbell-bent-over-row", name: "Barbell Bent-Over Row", category: "Back (Spate)" },
  { id: "yates-row", name: "Yates Row", category: "Back (Spate)" },
  { id: "pendlay-row", name: "Pendlay Row", category: "Back (Spate)" },
  { id: "t-bar-row", name: "T-Bar Row", category: "Back (Spate)" },
  { id: "chest-supported-t-bar-row", name: "Chest-Supported T-Bar Row", category: "Back (Spate)" },
  { id: "one-arm-dumbbell-row", name: "One-Arm Dumbbell Row", category: "Back (Spate)" },
  { id: "kroc-rows", name: "Kroc Rows", category: "Back (Spate)" },
  { id: "meadows-row", name: "Meadows Row", category: "Back (Spate)" },
  { id: "seal-row", name: "Seal Row", category: "Back (Spate)" },
  { id: "renegade-row", name: "Renegade Row", category: "Back (Spate)" },
  { id: "helms-row", name: "Helms Row", category: "Back (Spate)" },
  { id: "seated-cable-row-v-grip", name: "Seated Cable Row (V-Grip)", category: "Back (Spate)" },
  { id: "seated-cable-row-wide-grip", name: "Seated Cable Row (Wide Grip)", category: "Back (Spate)" },
  { id: "seated-cable-row-single-arm", name: "Seated Cable Row (Single Arm)", category: "Back (Spate)" },
  { id: "machine-row", name: "Machine Row", category: "Back (Spate)" },
  { id: "chest-supported-dumbbell-row", name: "Chest-Supported Dumbbell Row", category: "Back (Spate)" },
  { id: "inverted-row", name: "Inverted Row", category: "Back (Spate)" },
  { id: "weighted-inverted-row", name: "Weighted Inverted Row", category: "Back (Spate)" },
  // Vertical Pulls
  { id: "pull-ups", name: "Pull-Ups", category: "Back (Spate)" },
  { id: "weighted-pull-ups", name: "Weighted Pull-Ups", category: "Back (Spate)" },
  { id: "chin-ups", name: "Chin-Ups", category: "Back (Spate)" },
  { id: "weighted-chin-ups", name: "Weighted Chin-Ups", category: "Back (Spate)" },
  { id: "neutral-grip-pull-ups", name: "Neutral-Grip Pull-Ups", category: "Back (Spate)" },
  { id: "lat-pulldown-wide-grip", name: "Lat Pulldown (Wide Grip)", category: "Back (Spate)" },
  { id: "lat-pulldown-close-grip-v-bar", name: "Lat Pulldown (Close Grip/V-Bar)", category: "Back (Spate)" },
  { id: "lat-pulldown-reverse-grip", name: "Lat Pulldown (Reverse Grip)", category: "Back (Spate)" },
  { id: "lat-pulldown-single-arm", name: "Lat Pulldown (Single Arm)", category: "Back (Spate)" },
  { id: "straight-arm-cable-pulldown", name: "Straight-Arm Cable Pulldown", category: "Back (Spate)" },
  { id: "machine-lat-pulldown", name: "Machine Lat Pulldown", category: "Back (Spate)" },
  // Lower Back
  { id: "good-mornings", name: "Good Mornings", category: "Back (Spate)" },
  { id: "seated-good-mornings", name: "Seated Good Mornings", category: "Back (Spate)" },
  { id: "back-extensions-hyperextensions", name: "Back Extensions (Hyperextensions)", category: "Back (Spate)" },
  { id: "weighted-back-extensions", name: "Weighted Back Extensions", category: "Back (Spate)" },
  { id: "reverse-hyperextensions", name: "Reverse Hyperextensions", category: "Back (Spate)" },

  // 3) Shoulders (Umeri)
  // Presses
  { id: "overhead-press-strict-military-press", name: "Overhead Press (Strict Military Press)", category: "Shoulders (Umeri)" },
  { id: "push-press", name: "Push Press", category: "Shoulders (Umeri)" },
  { id: "seated-barbell-overhead-press", name: "Seated Barbell Overhead Press", category: "Shoulders (Umeri)" },
  { id: "seated-dumbbell-press", name: "Seated Dumbbell Press", category: "Shoulders (Umeri)" },
  { id: "arnold-press", name: "Arnold Press", category: "Shoulders (Umeri)" },
  { id: "z-press", name: "Z-Press", category: "Shoulders (Umeri)" },
  { id: "bradford-press", name: "Bradford Press", category: "Shoulders (Umeri)" },
  { id: "savickas-press", name: "Savickas Press", category: "Shoulders (Umeri)" },
  { id: "machine-shoulder-press", name: "Machine Shoulder Press", category: "Shoulders (Umeri)" },
  { id: "smith-machine-overhead-press", name: "Smith Machine Overhead Press", category: "Shoulders (Umeri)" },
  { id: "landmine-press-single-arm", name: "Landmine Press (Single Arm)", category: "Shoulders (Umeri)" },
  // Lateral & Front
  { id: "dumbbell-lateral-raises", name: "Dumbbell Lateral Raises", category: "Shoulders (Umeri)" },
  { id: "cable-lateral-raises", name: "Cable Lateral Raises", category: "Shoulders (Umeri)" },
  { id: "machine-lateral-raises", name: "Machine Lateral Raises", category: "Shoulders (Umeri)" },
  { id: "leaning-cable-lateral-raises", name: "Leaning Cable Lateral Raises", category: "Shoulders (Umeri)" },
  { id: "front-raises-dumbbell", name: "Front Raises (Dumbbell)", category: "Shoulders (Umeri)" },
  { id: "front-raises-barbell", name: "Front Raises (Barbell)", category: "Shoulders (Umeri)" },
  { id: "front-raises-cable", name: "Front Raises (Cable)", category: "Shoulders (Umeri)" },
  { id: "front-raises-plate", name: "Front Raises (Plate)", category: "Shoulders (Umeri)" },
  { id: "egyptian-lateral-raises", name: "Egyptian Lateral Raises", category: "Shoulders (Umeri)" },
  { id: "lu-raises", name: "Lu Raises", category: "Shoulders (Umeri)" },
  // Rear Delts & Traps
  { id: "dumbbell-rear-delt-flyes", name: "Dumbbell Rear Delt Flyes", category: "Shoulders (Umeri)" },
  { id: "reverse-pec-deck-fly-shoulder", name: "Reverse Pec Deck Fly", category: "Shoulders (Umeri)" },
  { id: "cable-face-pulls", name: "Cable Face Pulls", category: "Shoulders (Umeri)" },
  { id: "cable-rear-delt-pull-aparts", name: "Cable Rear Delt Pull-Aparts", category: "Shoulders (Umeri)" },
  { id: "upright-row-barbell", name: "Upright Row (Barbell)", category: "Shoulders (Umeri)" },
  { id: "upright-row-cable", name: "Upright Row (Cable)", category: "Shoulders (Umeri)" },
  { id: "barbell-shrugs", name: "Barbell Shrugs", category: "Shoulders (Umeri)" },
  { id: "dumbbell-shrugs", name: "Dumbbell Shrugs", category: "Shoulders (Umeri)" },
  { id: "cable-shrugs", name: "Cable Shrugs", category: "Shoulders (Umeri)" },
  { id: "trap-bar-shrugs", name: "Trap Bar Shrugs", category: "Shoulders (Umeri)" },
  { id: "smith-machine-shrugs", name: "Smith Machine Shrugs", category: "Shoulders (Umeri)" },

  // 4) Biceps
  { id: "barbell-bicep-curl", name: "Barbell Bicep Curl", category: "Biceps" },
  { id: "ez-bar-curl", name: "EZ-Bar Curl", category: "Biceps" },
  { id: "dumbbell-curl-alternating-bilateral", name: "Dumbbell Curl (Alternating / Bilateral)", category: "Biceps" },
  { id: "hammer-curl", name: "Hammer Curl", category: "Biceps" },
  { id: "cross-body-hammer-curl", name: "Cross-Body Hammer Curl", category: "Biceps" },
  { id: "preacher-curl-barbell-ez-bar", name: "Preacher Curl (Barbell / EZ-Bar)", category: "Biceps" },
  { id: "dumbbell-preacher-curl-single-arm", name: "Dumbbell Preacher Curl (Single Arm)", category: "Biceps" },
  { id: "machine-preacher-curl", name: "Machine Preacher Curl", category: "Biceps" },
  { id: "concentration-curl", name: "Concentration Curl", category: "Biceps" },
  { id: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", category: "Biceps" },
  { id: "spider-curl", name: "Spider Curl", category: "Biceps" },
  { id: "drag-curl", name: "Drag Curl", category: "Biceps" },
  { id: "cable-curl-straight-bar-rope", name: "Cable Curl (Straight Bar / Rope)", category: "Biceps" },
  { id: "high-cable-curl-crucifix-curls", name: "High Cable Curl (Crucifix Curls)", category: "Biceps" },
  { id: "bayesian-cable-curl", name: "Bayesian Cable Curl", category: "Biceps" },
  { id: "reverse-barbell-curl", name: "Reverse Barbell Curl", category: "Biceps" },
  { id: "zottman-curl", name: "Zottman Curl", category: "Biceps" },

  // 5) Triceps
  { id: "close-grip-bench-press", name: "Close-Grip Bench Press", category: "Triceps" },
  { id: "skullcrushers-ez-bar-barbell", name: "Skullcrushers (EZ-Bar / Barbell)", category: "Triceps" },
  { id: "dumbbell-skullcrushers", name: "Dumbbell Skullcrushers", category: "Triceps" },
  { id: "decline-skullcrushers", name: "Decline Skullcrushers", category: "Triceps" },
  { id: "triceps-pushdown-rope", name: "Triceps Pushdown (Rope)", category: "Triceps" },
  { id: "triceps-pushdown-straight-bar-v-bar", name: "Triceps Pushdown (Straight Bar / V-Bar)", category: "Triceps" },
  { id: "triceps-pushdown-reverse-grip", name: "Triceps Pushdown (Reverse-Grip)", category: "Triceps" },
  { id: "overhead-dumbbell-triceps-extension-single-arm-bilateral", name: "Overhead Dumbbell Triceps Extension (Single Arm / Bilateral)", category: "Triceps" },
  { id: "overhead-cable-triceps-extension", name: "Overhead Cable Triceps Extension", category: "Triceps" },
  { id: "overhead-ez-bar-triceps-extension", name: "Overhead EZ-Bar Triceps Extension", category: "Triceps" },
  { id: "katana-extensions-cable", name: "Katana Extensions (Cable)", category: "Triceps" },
  { id: "triceps-kickbacks-dumbbell", name: "Triceps Kickbacks (Dumbbell)", category: "Triceps" },
  { id: "triceps-kickbacks-cable", name: "Triceps Kickbacks (Cable)", category: "Triceps" },
  { id: "jm-press", name: "JM Press", category: "Triceps" },
  { id: "tate-press", name: "Tate Press", category: "Triceps" },
  { id: "weighted-triceps-dips", name: "Weighted Triceps Dips", category: "Triceps" },
  { id: "bench-dips", name: "Bench Dips", category: "Triceps" },
  { id: "machine-triceps-extension", name: "Machine Triceps Extension", category: "Triceps" },

  // 6) Quadriceps (Cvadricepși)
  { id: "barbell-back-squat-high-bar-low-bar", name: "Barbell Back Squat (High Bar / Low Bar)", category: "Quadriceps (Cvadricepși)" },
  { id: "barbell-front-squat", name: "Barbell Front Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "zercher-squat", name: "Zercher Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "overhead-squat", name: "Overhead Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "hack-squat-machine-barbell", name: "Hack Squat (Machine / Barbell)", category: "Quadriceps (Cvadricepși)" },
  { id: "leg-press", name: "Leg Press", category: "Quadriceps (Cvadricepși)" },
  { id: "sissy-squat", name: "Sissy Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "weighted-sissy-squat", name: "Weighted Sissy Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "bulgarian-split-squat-dumbbell-barbell", name: "Bulgarian Split Squat (Dumbbell / Barbell)", category: "Quadriceps (Cvadricepși)" },
  { id: "walking-lunges-quad", name: "Walking Lunges", category: "Quadriceps (Cvadricepși)" },
  { id: "reverse-lunges", name: "Reverse Lunges", category: "Quadriceps (Cvadricepși)" },
  { id: "forward-lunges", name: "Forward Lunges", category: "Quadriceps (Cvadricepși)" },
  { id: "deficit-reverse-lunges", name: "Deficit Reverse Lunges", category: "Quadriceps (Cvadricepși)" },
  { id: "weighted-step-ups", name: "Weighted Step-Ups", category: "Quadriceps (Cvadricepși)" },
  { id: "leg-extensions", name: "Leg Extensions", category: "Quadriceps (Cvadricepși)" },
  { id: "goblet-squat-dumbbell-kettlebell", name: "Goblet Squat (Dumbbell / Kettlebell)", category: "Quadriceps (Cvadricepși)" },
  { id: "smith-machine-squat", name: "Smith Machine Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "spanish-squat", name: "Spanish Squat", category: "Quadriceps (Cvadricepși)" },
  { id: "anderson-squat", name: "Anderson Squat", category: "Quadriceps (Cvadricepși)" },

  // 7) Hamstrings (Femurali)
  { id: "romanian-deadlift-rdl-barbell-dumbbell", name: "Romanian Deadlift (RDL - Barbell / Dumbbell)", category: "Hamstrings (Femurali)" },
  { id: "single-leg-rdl-barbell-dumbbell", name: "Single-Leg RDL (Barbell / Dumbbell)", category: "Hamstrings (Femurali)" },
  { id: "b-stance-rdl", name: "B-Stance RDL", category: "Hamstrings (Femurali)" },
  { id: "stiff-legged-deadlift", name: "Stiff-Legged Deadlift", category: "Hamstrings (Femurali)" },
  { id: "lying-leg-curls", name: "Lying Leg Curls", category: "Hamstrings (Femurali)" },
  { id: "seated-leg-curls", name: "Seated Leg Curls", category: "Hamstrings (Femurali)" },
  { id: "standing-single-leg-curl", name: "Standing Single-Leg Curl", category: "Hamstrings (Femurali)" },
  { id: "glute-ham-raise-ghr", name: "Glute-Ham Raise (GHR)", category: "Hamstrings (Femurali)" },
  { id: "nordic-hamstring-curl", name: "Nordic Hamstring Curl", category: "Hamstrings (Femurali)" },

  // 8) Glutes (Fesieri)
  { id: "barbell-hip-thrust", name: "Barbell Hip Thrust", category: "Glutes (Fesieri)" },
  { id: "dumbbell-hip-thrust", name: "Dumbbell Hip Thrust", category: "Glutes (Fesieri)" },
  { id: "machine-hip-thrust", name: "Machine Hip Thrust", category: "Glutes (Fesieri)" },
  { id: "single-leg-hip-thrust", name: "Single-Leg Hip Thrust", category: "Glutes (Fesieri)" },
  { id: "glute-bridge-fesieri", name: "Glute Bridge", category: "Glutes (Fesieri)" },
  { id: "weighted-glute-bridge", name: "Weighted Glute Bridge", category: "Glutes (Fesieri)" },
  { id: "cable-pull-throughs", name: "Cable Pull-Throughs", category: "Glutes (Fesieri)" },
  { id: "cable-glute-kickbacks", name: "Cable Glute Kickbacks", category: "Glutes (Fesieri)" },
  { id: "machine-glute-kickbacks", name: "Machine Glute Kickbacks", category: "Glutes (Fesieri)" },
  { id: "machine-hip-abduction", name: "Machine Hip Abduction", category: "Glutes (Fesieri)" },
  { id: "machine-hip-adduction", name: "Machine Hip Adduction", category: "Glutes (Fesieri)" },
  { id: "kettlebell-swings", name: "Kettlebell Swings", category: "Glutes (Fesieri)" },
  { id: "frog-pumps", name: "Frog Pumps", category: "Glutes (Fesieri)" },
  { id: "deficit-curtsy-lunges", name: "Deficit Curtsy Lunges", category: "Glutes (Fesieri)" },

  // 9) Calves & Tibialis (Gambe și Tibie)
  { id: "standing-machine-calf-raises", name: "Standing Machine Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "standing-barbell-calf-raises", name: "Standing Barbell Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "seated-calf-raises", name: "Seated Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "leg-press-calf-raises", name: "Leg Press Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "smith-machine-calf-raises", name: "Smith Machine Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "donkey-calf-raises", name: "Donkey Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "dumbbell-single-leg-calf-raises", name: "Dumbbell Single-Leg Calf Raises", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "tibialis-raises-bodyweight-machine", name: "Tibialis Raises (Bodyweight / Machine)", category: "Calves & Tibialis (Gambe și Tibie)" },
  { id: "kettlebell-tibialis-raises", name: "Kettlebell Tibialis Raises", category: "Calves & Tibialis (Gambe și Tibie)" },

  // 10) Forearms & Grip (Antebrațe)
  { id: "barbell-wrist-curls", name: "Barbell Wrist Curls", category: "Forearms & Grip (Antebrațe)" },
  { id: "dumbbell-wrist-curls", name: "Dumbbell Wrist Curls", category: "Forearms & Grip (Antebrațe)" },
  { id: "reverse-barbell-wrist-curls", name: "Reverse Barbell Wrist Curls", category: "Forearms & Grip (Antebrațe)" },
  { id: "behind-the-back-barbell-wrist-curls", name: "Behind-the-Back Barbell Wrist Curls", category: "Forearms & Grip (Antebrațe)" },
  { id: "farmers-walk-dumbbell-trap-bar", name: "Farmer's Walk (Dumbbell / Trap Bar)", category: "Forearms & Grip (Antebrațe)" },
  { id: "suitcase-carry", name: "Suitcase Carry", category: "Forearms & Grip (Antebrațe)" },
  { id: "plate-pinches", name: "Plate Pinches", category: "Forearms & Grip (Antebrațe)" },
  { id: "wrist-roller", name: "Wrist Roller", category: "Forearms & Grip (Antebrațe)" },
  { id: "dead-hangs-weighted", name: "Dead Hangs (Weighted)", category: "Forearms & Grip (Antebrațe)" },

  // 11) Core & Abs (Abdomen)
  { id: "cable-crunches", name: "Cable Crunches", category: "Core & Abs (Abdomen)" },
  { id: "weighted-hanging-leg-raises", name: "Weighted Hanging Leg Raises", category: "Core & Abs (Abdomen)" },
  { id: "weighted-hanging-knee-raises", name: "Weighted Hanging Knee Raises", category: "Core & Abs (Abdomen)" },
  { id: "weighted-russian-twists", name: "Weighted Russian Twists", category: "Core & Abs (Abdomen)" },
  { id: "dumbbell-side-bends", name: "Dumbbell Side Bends", category: "Core & Abs (Abdomen)" },
  { id: "cable-woodchoppers-high-to-low", name: "Cable Woodchoppers (High-to-Low)", category: "Core & Abs (Abdomen)" },
  { id: "cable-woodchoppers-low-to-high", name: "Cable Woodchoppers (Low-to-High)", category: "Core & Abs (Abdomen)" },
  { id: "weighted-decline-crunches", name: "Weighted Decline Crunches", category: "Core & Abs (Abdomen)" },
  { id: "ab-machine-crunch", name: "Ab Machine Crunch", category: "Core & Abs (Abdomen)" },
  { id: "landmine-rotations-landmine-180s", name: "Landmine Rotations (Landmine 180s)", category: "Core & Abs (Abdomen)" },
  { id: "weighted-plank", name: "Weighted Plank", category: "Core & Abs (Abdomen)" },
  { id: "ab-wheel-rollout", name: "Ab Wheel Rollout", category: "Core & Abs (Abdomen)" },
  { id: "pallof-press-cable-band", name: "Pallof Press (Cable / Band)", category: "Core & Abs (Abdomen)" },
  { id: "dragon-flags", name: "Dragon Flags", category: "Core & Abs (Abdomen)" },
  { id: "suitcase-deadlift", name: "Suitcase Deadlift", category: "Core & Abs (Abdomen)" },
  { id: "turkish-get-up", name: "Turkish Get-Up", category: "Core & Abs (Abdomen)" },

  // 12) Olympic & Full Body
  { id: "power-clean", name: "Power Clean", category: "Olympic & Full Body" },
  { id: "hang-clean", name: "Hang Clean", category: "Olympic & Full Body" },
  { id: "squat-clean", name: "Squat Clean", category: "Olympic & Full Body" },
  { id: "clean-and-jerk", name: "Clean and Jerk", category: "Olympic & Full Body" },
  { id: "power-snatch", name: "Power Snatch", category: "Olympic & Full Body" },
  { id: "hang-snatch", name: "Hang Snatch", category: "Olympic & Full Body" },
  { id: "squat-snatch", name: "Squat Snatch", category: "Olympic & Full Body" },
  { id: "push-jerk", name: "Push Jerk", category: "Olympic & Full Body" },
  { id: "split-jerk", name: "Split Jerk", category: "Olympic & Full Body" },
  { id: "high-pulls-snatch-grip", name: "High Pulls (Snatch Grip)", category: "Olympic & Full Body" },
  { id: "high-pulls-clean-grip", name: "High Pulls (Clean Grip)", category: "Olympic & Full Body" },
  { id: "barbell-thrusters", name: "Barbell Thrusters", category: "Olympic & Full Body" },
  { id: "dumbbell-thrusters", name: "Dumbbell Thrusters", category: "Olympic & Full Body" },
  { id: "kettlebell-snatches", name: "Kettlebell Snatches", category: "Olympic & Full Body" },
  { id: "devil-press", name: "Devil Press", category: "Olympic & Full Body" },
];