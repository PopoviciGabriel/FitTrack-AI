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

export interface Workout {
  id: string;
  date: string;
  title: string;
  entries: ExerciseEntry[];
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
  category: "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Abs" | "Cardio";
  description?: string;
}

export const PRESET_EXERCISES: Exercise[] = [
  // Chest
  { id: "bench-press", name: "Barbell Bench Press", category: "Chest" },
  { id: "db-bench-press", name: "Dumbbell Bench Press", category: "Chest" },
  { id: "incline-bench", name: "Incline Barbell Bench Press", category: "Chest" },
  { id: "db-incline-bench", name: "Incline Dumbbell Bench Press", category: "Chest" },
  { id: "decline-bench", name: "Decline Bench Press", category: "Chest" },
  { id: "chest-fly", name: "Dumbbell Flys", category: "Chest" },
  { id: "cable-fly", name: "Cable Crossover / Fly", category: "Chest" },
  { id: "push-ups", name: "Push-ups", category: "Chest" },
  { id: "dips-chest", name: "Chest Dips", category: "Chest" },
  { id: "peck-deck", name: "Pec Deck Machine", category: "Chest" },

  // Back
  { id: "deadlift", name: "Conventional Deadlift", category: "Back" },
  { id: "sumo-deadlift", name: "Sumo Deadlift", category: "Back" },
  { id: "pull-up", name: "Pull-ups", category: "Back" },
  { id: "chin-up", name: "Chin-ups", category: "Back" },
  { id: "lat-pulldown", name: "Lat Pulldown (Wide Grip)", category: "Back" },
  { id: "seated-row", name: "Seated Cable Row", category: "Back" },
  { id: "bent-over-row", name: "Bent Over Barbell Row", category: "Back" },
  { id: "one-arm-db-row", name: "Single Arm Dumbbell Row", category: "Back" },
  { id: "t-bar-row", name: "T-Bar Row", category: "Back" },
  { id: "hyperextensions", name: "Hyperextensions", category: "Back" },
  { id: "face-pulls", name: "Face Pulls", category: "Back" },

  // Legs
  { id: "squat", name: "Back Squat (Barbell)", category: "Legs" },
  { id: "front-squat", name: "Front Squat", category: "Legs" },
  { id: "leg-press", name: "Leg Press", category: "Legs" },
  { id: "leg-extension", name: "Leg Extensions", category: "Legs" },
  { id: "leg-curl", name: "Leg Curls", category: "Legs" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "Legs" },
  { id: "lunges", name: "Lunges (Dumbbell/Barbell)", category: "Legs" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "Legs" },
  { id: "hack-squat", name: "Hack Squat", category: "Legs" },
  { id: "calf-raise-standing", name: "Standing Calf Raises", category: "Legs" },
  { id: "calf-raise-seated", name: "Seated Calf Raises", category: "Legs" },
  { id: "hip-thrust", name: "Barbell Hip Thrust", category: "Legs" },

  // Shoulders
  { id: "overhead-press", name: "Military Press (Barbell)", category: "Shoulders" },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", category: "Shoulders" },
  { id: "arnold-press", name: "Arnold Press", category: "Shoulders" },
  { id: "lateral-raise", name: "Dumbbell Lateral Raises", category: "Shoulders" },
  { id: "front-raise", name: "Dumbbell Front Raises", category: "Shoulders" },
  { id: "reverse-fly", name: "Reverse Pec Deck / Fly", category: "Shoulders" },
  { id: "upright-row", name: "Upright Row", category: "Shoulders" },
  { id: "shrugs", name: "Barbell/Dumbbell Shrugs", category: "Shoulders" },

  // Arms
  { id: "bicep-curl", name: "Barbell Curls", category: "Arms" },
  { id: "db-bicep-curl", name: "Dumbbell Curls", category: "Arms" },
  { id: "hammer-curl", name: "Hammer Curls", category: "Arms" },
  { id: "preacher-curl", name: "Preacher Curls", category: "Arms" },
  { id: "tricep-pushdown", name: "Cable Tricep Pushdowns", category: "Arms" },
  { id: "overhead-tricep-ext", name: "Overhead Tricep Extension", category: "Arms" },
  { id: "skull-crusher", name: "Skull Crushers", category: "Arms" },
  { id: "close-grip-bench", name: "Close Grip Bench Press", category: "Arms" },

  // Abs
  { id: "plank", name: "Plank", category: "Abs" },
  { id: "crunch", name: "Abdominal Crunches", category: "Abs" },
  { id: "leg-raise", name: "Hanging Leg Raises", category: "Abs" },
  { id: "russian-twist", name: "Russian Twists", category: "Abs" },
  { id: "ab-roller", name: "Ab Wheel Rollouts", category: "Abs" },

  // Cardio
  { id: "running", name: "Running (Treadmill)", category: "Cardio" },
  { id: "cycling", name: "Cycling / Spinning", category: "Cardio" },
  { id: "rowing", name: "Rowing Machine", category: "Cardio" },
  { id: "stairmaster", name: "Stairmaster", category: "Cardio" },
  { id: "elliptical", name: "Elliptical", category: "Cardio" },
  { id: "swimming", name: "Swimming", category: "Cardio" },
  { id: "box-jumps", name: "Box Jumps", category: "Cardio" },
  { id: "burpees", name: "Burpees", category: "Cardio" },

  // Added More
  { id: "good-mornings", name: "Good Mornings", category: "Back" },
  { id: "lat-pullover", name: "Lat Pullover (Cable/DB)", category: "Back" },
  { id: "trap-bar-deadlift", name: "Trap Bar Deadlift", category: "Back" },
  { id: "glute-bridge", name: "Glute Bridge", category: "Legs" },
  { id: "step-ups", name: "Step-ups", category: "Legs" },
  { id: "sissy-squat", name: "Sissy Squat", category: "Legs" },
  { id: "behind-neck-press", name: "Behind the Neck Press", category: "Shoulders" },
  { id: "lu-raises", name: "Lu Raises", category: "Shoulders" },
  { id: "concentration-curl", name: "Concentration Curl", category: "Arms" },
  { id: "zottman-curl", name: "Zottman Curl", category: "Arms" },
  { id: "diamond-pushups", name: "Diamond Push-ups", category: "Arms" },
  { id: "bench-dips", name: "Bench Dips", category: "Arms" },
  { id: "bicycle-crunch", name: "Bicycle Crunch", category: "Abs" },
  { id: "v-ups", name: "V-ups", category: "Abs" },
  { id: "deadbug", name: "Deadbug", category: "Abs" },
  { id: "mountain-climbers", name: "Mountain Climbers", category: "Abs" },
  { id: "hanging-knee-raise", name: "Hanging Knee Raise", category: "Abs" },
  { id: "barbell-rollout", name: "Barbell Rollout", category: "Abs" },
  { id: "cable-crunch", name: "Cable Crunch", category: "Abs" },
  { id: "side-plank", name: "Side Plank", category: "Abs" },

  // Chest Addition
  { id: "svend-press", name: "Svend Press", category: "Chest" },
  { id: "cable-fly-low-to-high", name: "Cable Fly (Low to High)", category: "Chest" },
  { id: "cable-fly-high-to-low", name: "Cable Fly (High to Low)", category: "Chest" },
  { id: "weighted-push-up", name: "Weighted Push-up", category: "Chest" },
  { id: "landmine-press", name: "Landmine Press", category: "Chest" },

  // Back Addition
  { id: "lat-pulldown-v-bar", name: "Lat Pulldown (V-Bar)", category: "Back" },
  { id: "lat-pulldown-behind-neck", name: "Lat Pulldown (Behind Neck)", category: "Back" },
  { id: "kroc-row", name: "Kroc Row", category: "Back" },
  { id: "pendlay-row", name: "Pendlay Row", category: "Back" },
  { id: "straight-arm-pulldown", name: "Straight Arm Pulldown", category: "Back" },
  { id: "rack-pull", name: "Rack Pull", category: "Back" },

  // Legs Addition
  { id: "goblet-squat", name: "Goblet Squat", category: "Legs" },
  { id: "pistir-squat", name: "Pistol Squat", category: "Legs" },
  { id: "walking-lunges", name: "Walking Lunges", category: "Legs" },
  { id: "curtsy-lunge", name: "Curtsy Lunge", category: "Legs" },
  { id: "glute-ham-raise", name: "Glute Ham Raise", category: "Legs" },
  { id: "nordic-curl", name: "Nordic Curl", category: "Legs" },
  { id: "single-leg-leg-press", name: "Single Leg Leg Press", category: "Legs" },
  { id: "box-squat", name: "Box Squat", category: "Legs" },

  // Shoulders Addition
  { id: "military-press", name: "Military Press", category: "Shoulders" },
  { id: "seated-db-lateral-raise", name: "Seated DB Lateral Raise", category: "Shoulders" },
  { id: "cable-lateral-raise", name: "Cable Lateral Raise", category: "Shoulders" },
  { id: "barbell-front-raise", name: "Barbell Front Raise", category: "Shoulders" },
  { id: "rear-delt-fly-db", name: "Rear Delt Fly (Dumbbell)", category: "Shoulders" },
  { id: "rear-delt-row-barbell", name: "Rear Delt Row (Barbell)", category: "Shoulders" },

  // Arms Addition
  { id: "ez-bar-curl", name: "EZ Bar Curl", category: "Arms" },
  { id: "cable-bicep-curl", name: "Cable Bicep Curl", category: "Arms" },
  { id: "spider-curl", name: "Spider Curl", category: "Arms" },
  { id: "incline-db-curl", name: "Incline DB Curl", category: "Arms" },
  { id: "tricep-kickback", name: "Tricep Kickback", category: "Arms" },
  { id: "dips-triceps", name: "Tricep Dips (Parallel Bars)", category: "Arms" },
  { id: "tate-press", name: "Tate Press", category: "Arms" },
  { id: "forearm-curl", name: "Barbell Forearm Curl", category: "Arms" },
];
