import { useState, useRef, useEffect } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { CalibrationScreen } from "./components/CalibrationScreen";
import { WorkoutScreen } from "./components/WorkoutScreen";
import { SummaryScreen } from "./components/SummaryScreen";
import { ReplayScreen } from "./components/ReplayScreen";
import { LoginScreen } from "./components/LoginScreen";
import { SignUpScreen } from "./components/SignUpScreen";
import { ForgotPasswordScreen } from "./components/ForgotPasswordScreen";
import { UserProfileScreen } from "./components/UserProfileScreen";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { exercises, ExerciseConfig } from "./config/exercises";
import { BodyType } from "./services/bodyTypeEngine";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import { initializeAutoSync } from "./services/workoutSyncService";
import HistoryPage from "./HistoryPage";
import "./styles/auth.css";
import "./styles/app.css";

type Screen =
  | "login"
  | "signup"
  | "forgot-password"
  | "welcome"
  | "calibration"
  | "workout"
  | "summary"
  | "replay"
  | "history"
  | "profile";

interface WorkoutStats {
  reps: number;
  totalReps: number;
  correctReps: number;
  repScores: number[];
  duration: number;
  accuracy: number;
  exerciseName: string;
  mistakes: Record<string, number>;
  bestStreak: number;
  tags?: string[];
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // If user is already authenticated, start with welcome screen
    // Otherwise, start with login screen
    return "login";
  });
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig>(
    exercises.squat,
  );
  const [bodyType, setBodyType] = useState<BodyType>("scanning");
  const [stats, setStats] = useState<WorkoutStats>({
    reps: 0,
    totalReps: 0,
    correctReps: 0,
    repScores: [],
    duration: 0,
    accuracy: 0,
    exerciseName: exercises.squat.name,
    mistakes: {},
    bestStreak: 0,
  });
  const lastSwitchTime = useRef<number>(0);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // Auto-navigate to welcome screen when user logs in
  useEffect(() => {
    if (user && currentScreen === "login") {
      setCurrentScreen("welcome");
    }
  }, [user]);

  // Initialize auto-sync when user logs in
  useEffect(() => {
    if (user?.uid) {
      console.log("🔄 Initializing auto-sync for user:", user.uid);
      initializeAutoSync(user.uid);
    }
  }, [user?.uid]);

  const handleWorkoutEnd = (
    finalStats: Omit<WorkoutStats, "exerciseName"> & { tags?: string[] },
  ) => {
    setStats({ ...finalStats, exerciseName: selectedExercise.name });
    navigateTo("summary");
  };

  const handleAutoDetect = (exerciseKey: string) => {
    const now = Date.now();
    // 5-second cooldown
    if (now - lastSwitchTime.current < 5000) return;

    if (exercises[exerciseKey] && selectedExercise.key !== exerciseKey) {
      console.log(`CLIP: Auto-switching to ${exerciseKey.toUpperCase()}`);
      lastSwitchTime.current = now;
      setSelectedExercise(exercises[exerciseKey]);
    }
  };

  const handleSelectExercise = (key: string) => {
    if (exercises[key]) {
      setSelectedExercise(exercises[key]);
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If not authenticated, show auth screens
  if (!user) {
    return (
      <main className="spectrax-app">
        {currentScreen === "login" && (
          <LoginScreen
            onLoginSuccess={() => navigateTo("welcome")}
            onSignUpClick={() => navigateTo("signup")}
            onForgotPasswordClick={() => navigateTo("forgot-password")}
          />
        )}
        {currentScreen === "signup" && (
          <SignUpScreen
            onSignUpSuccess={() => navigateTo("welcome")}
            onLoginClick={() => navigateTo("login")}
          />
        )}
        {currentScreen === "forgot-password" && (
          <ForgotPasswordScreen onBack={() => navigateTo("login")} />
        )}
      </main>
    );
  }

  // If authenticated, show main app with theme toggle and workout screens
  return (
    <main
      className="spectrax-app"
      style={{ background: "var(--bg-primary)", minHeight: "100vh" }}
    >
      <button
        onClick={toggleTheme}

        className="theme-toggle"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☾ Dark Mode" : "☀ Light Mode"}
      </button>

      {/* Profile Button */}
      <button
        onClick={() => navigateTo("profile")}
        className="profile-button"
        aria-label="View profile"
        title="View profile"
        className={`theme-toggle ${currentScreen === 'workout' ? 'workout-active' : ''}`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        👤
      </button>

      <ProtectedRoute
        fallback={
          <LoginScreen
            onLoginSuccess={() => navigateTo("welcome")}
            onSignUpClick={() => navigateTo("signup")}
            onForgotPasswordClick={() => navigateTo("forgot-password")}
          />
        }
      >
        {currentScreen === "welcome" && (
          <WelcomeScreen
            onStart={() => navigateTo("calibration")}
            onViewHistory={() => navigateTo("history")}
          />
        )}

        {currentScreen === "calibration" && (
          <CalibrationScreen
            selectedExercise={selectedExercise}
            onSelectExercise={handleSelectExercise}
            onNext={() => navigateTo("workout")}
            onBack={() => navigateTo("welcome")}
            onBodyTypeDetected={setBodyType}
          />
        )}

        {currentScreen === "workout" && (
          <WorkoutScreen
            exercise={selectedExercise}
            onEnd={handleWorkoutEnd}
            onAutoDetect={handleAutoDetect}
            bodyType={bodyType}
          />
        )}

        {currentScreen === "summary" && (
          <SummaryScreen
            stats={stats}
            onRestart={() => navigateTo("welcome")}
            onViewReplay={() => navigateTo("replay")}
          />
        )}

        {currentScreen === "replay" && (
          <ReplayScreen onBack={() => navigateTo("summary")} stats={stats} />
        )}

        {currentScreen === "history" && (
          <HistoryPage onBack={() => navigateTo("welcome")} />
        )}

        {currentScreen === "profile" && (
          <UserProfileScreen onLogout={() => navigateTo("login")} />
        )}
      </ProtectedRoute>
    </main>
  );
}

export default App;
