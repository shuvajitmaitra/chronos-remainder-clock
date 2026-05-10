"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Plus, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type TimerStatus = "running" | "paused" | "done";

interface TimerData {
  id: string;
  title: string;
  duration: number;
  remaining: number;
  status: TimerStatus;
  alarmEnabled: boolean;
  isRinging: boolean;
}

class AlarmController {
  private alarmAudio: HTMLAudioElement | null = null;

  init() {
    if (!this.alarmAudio) {
      this.alarmAudio = new Audio("/alarm.mp3");
      this.alarmAudio.preload = "auto";
      this.alarmAudio.loop = true;
    }
  }

  start() {
    if (typeof window === "undefined") return;
    this.init();
    if (!this.alarmAudio) return;
    this.alarmAudio.currentTime = 0;
    void this.alarmAudio.play().catch(() => {});
  }

  stop() {
    if (!this.alarmAudio) return;
    this.alarmAudio.pause();
    this.alarmAudio.currentTime = 0;
  }
}

const alarmController = typeof window !== "undefined" ? new AlarmController() : null;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const generateId = () => Math.floor(Math.random() * 10000).toString(16).padStart(4, "0");

const buildTimer = (id: string, minutes: number): TimerData => ({
  id,
  title: "Timer",
  duration: minutes * 60,
  remaining: minutes * 60,
  status: "paused",
  alarmEnabled: true,
  isRinging: false,
});

export default function Page() {
  const lastRingingIdsRef = useRef<string[]>([]);
  const [timers, setTimers] = useState<TimerData[]>([
    buildTimer("8691", 1),
    buildTimer("8695", 5),
    buildTimer("869a", 10),
    buildTimer("869f", 15),
    buildTimer("869b", 30),
  ]);

  useEffect(() => {
    const handleInteraction = () => {
      alarmController?.init();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => {
          if (timer.status !== "running" || timer.remaining <= 0) {
            return timer;
          }

          const nextRemaining = timer.remaining - 1;
          if (nextRemaining === 0) {
            return {
              ...timer,
              remaining: 0,
              status: "done",
              isRinging: true,
            };
          }

          return {
            ...timer,
            remaining: nextRemaining,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasRunningTimers = timers.some((timer) => timer.status === "running");

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasRunningTimers) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [timers]);

  useEffect(() => {
    const ringingTimers = timers.filter((timer) => timer.isRinging);
    const runningTimers = timers.filter((timer) => timer.status === "running");

    if (ringingTimers.length > 0) {
      document.title = `${ringingTimers.length} Alarm${ringingTimers.length > 1 ? "s" : ""} - Chronos`;
      return;
    }

    if (runningTimers.length > 0) {
      const minTimer = runningTimers.reduce((prev, curr) =>
        prev.remaining < curr.remaining ? prev : curr
      );
      document.title = `${formatTime(minTimer.remaining)} - Chronos`;
      return;
    }

    document.title = "Chronos Remainder Clock";
  }, [timers]);

  const hasAudibleAlarm = timers.some((timer) => timer.isRinging && timer.alarmEnabled);

  useEffect(() => {
    if (hasAudibleAlarm) {
      alarmController?.start();
    } else {
      alarmController?.stop();
    }
  }, [hasAudibleAlarm]);

  useEffect(() => {
    return () => {
      alarmController?.stop();
    };
  }, []);

  useEffect(() => {
    const ringingTimers = timers.filter((timer) => timer.isRinging);
    const ringingIds = ringingTimers.map((timer) => timer.id);
    const newRingingTimers = ringingTimers.filter(
      (timer) => !lastRingingIdsRef.current.includes(timer.id)
    );

    if (newRingingTimers.length > 0 && typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([250, 150, 250, 150, 400]);
    }

    if (newRingingTimers.length > 0 && "Notification" in window && Notification.permission === "granted") {
      newRingingTimers.forEach((timer) => {
        new Notification(timer.title || "Timer", {
          body: `${formatTime(timer.duration)} timer finished.`,
          silent: !timer.alarmEnabled,
        });
      });
    }

    lastRingingIdsRef.current = ringingIds;
  }, [timers]);

  const addTimer = (durationMins = 15) => {
    const newTimer: TimerData = buildTimer(generateId(), durationMins);
    setTimers((prev) => [...prev, newTimer]);
  };

  const removeTimer = (id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  };

  const toggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        if (timer.status === "done") return timer;

        return {
          ...timer,
          status: timer.status === "running" ? "paused" : "running",
          isRinging: false,
        };
      })
    );
  };

  const resetTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return {
          ...timer,
          remaining: timer.duration,
          status: "paused",
          isRinging: false,
        };
      })
    );
  };

  const addOneMinute = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;

        const nextBase = timer.status === "done" ? timer.duration : timer.remaining;
        const newDuration = timer.duration + 60;

        return {
          ...timer,
          duration: newDuration,
          remaining: nextBase + 60,
          status: "paused",
          isRinging: false,
        };
      })
    );
  };

  const subOneMinute = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;

        const newDuration = Math.max(60, timer.duration - 60);
        const nextBase = timer.status === "done" ? timer.duration : timer.remaining;
        const newRemaining = Math.max(0, nextBase - 60);

        if (newRemaining === 0) {
          return {
            ...timer,
            duration: newDuration,
            remaining: 0,
            status: "done",
            isRinging: true,
          };
        }

        return {
          ...timer,
          duration: newDuration,
          remaining: newRemaining,
          status: "paused",
          isRinging: false,
        };
      })
    );
  };

  const updateDuration = (id: string, newDuration: number) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return {
          ...timer,
          duration: newDuration,
          remaining: newDuration,
          status: "paused",
          isRinging: false,
        };
      })
    );
  };

  const updateTitle = (id: string, newTitle: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return { ...timer, title: newTitle };
      })
    );
  };

  const toggleAlarm = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return { ...timer, alarmEnabled: !timer.alarmEnabled };
      })
    );
  };

  const stopRinging = (id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return {
          ...timer,
          remaining: timer.duration,
          status: "paused",
          isRinging: false,
        };
      })
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0A0C] text-neutral-100 flex flex-col font-sans selection:bg-purple-500/30">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#9d00ff]/5 blur-[150px] rounded-full pointer-events-none" />

      <header className="relative z-10 w-full max-w-[1400px] mx-auto p-12 flex justify-between items-center">
        <div>
          <h1 className="text-[2.5rem] leading-none font-normal tracking-wide flex items-baseline text-white">
            CHRONOS<span className="text-[#2962ff] font-bold">.</span>
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.4em] text-neutral-500 mt-3 uppercase">
            Remainder Clock
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#111116] border border-white/5 pl-5 pr-6 py-2.5 rounded-full text-[11px] font-mono tracking-widest text-[#a1a1aa]">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
            SYNCED TO DB
          </div>
          <button
            onClick={() => addTimer(15)}
            className="bg-[#2962ff] hover:bg-[#2051db] transition-colors text-white text-[13px] font-bold tracking-wide px-8 py-3.5 rounded-full shadow-[0_0_20px_rgba(41,98,255,0.25)] flex items-center justify-center gap-1.5"
          >
            + NEW TIMER
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-12 pb-12">
        <div className="flex flex-wrap gap-8 items-stretch pt-6">
          <AnimatePresence mode="popLayout">
            {timers.map((timer) => (
              <motion.div
                key={timer.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                transition={{ duration: 0.3, type: "spring", bounce: 0 }}
              >
                <TimerCard
                  timer={timer}
                  onRemove={() => removeTimer(timer.id)}
                  onToggle={() => toggleTimer(timer.id)}
                  onReset={() => resetTimer(timer.id)}
                  onAddOneMin={() => addOneMinute(timer.id)}
                  onSubOneMin={() => subOneMinute(timer.id)}
                  onDurationChange={(newDuration) => updateDuration(timer.id, newDuration)}
                  onTitleChange={(newTitle) => updateTitle(timer.id, newTitle)}
                  onToggleAlarm={() => toggleAlarm(timer.id)}
                  onStopRinging={() => stopRinging(timer.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div layout>
            <div className="w-[320px] h-[480px] rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-6 hover:bg-white/[0.015] hover:border-white/20 transition-all group">
              <button
                onClick={() => addTimer(15)}
                className="flex flex-col items-center gap-6 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-[#52525b] group-hover:text-white group-hover:border-white/30 transition-all group-hover:scale-105">
                  <Plus className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="text-[11px] font-bold tracking-[0.2em] text-[#52525b] group-hover:text-[#a1a1aa] transition-colors uppercase">
                  Create New Task
                </span>
              </button>
              <div className="flex gap-2 flex-wrap items-center justify-center px-8 mt-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all">
                {[1, 5, 10, 15, 30].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => addTimer(minutes)}
                    className="text-[11px] font-mono tracking-wider text-[#a1a1aa] hover:text-white bg-[#18181b] border border-white/5 hover:border-white/20 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TimerCard({
  timer,
  onRemove,
  onToggle,
  onReset,
  onAddOneMin,
  onSubOneMin,
  onDurationChange,
  onTitleChange,
  onToggleAlarm,
  onStopRinging,
}: {
  timer: TimerData;
  onRemove: () => void;
  onToggle: () => void;
  onReset: () => void;
  onAddOneMin: () => void;
  onSubOneMin: () => void;
  onDurationChange: (newDuration: number) => void;
  onTitleChange: (newTitle: string) => void;
  onToggleAlarm: () => void;
  onStopRinging: () => void;
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [inputTime, setInputTime] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inputTitle, setInputTitle] = useState("");

  const handleTitleEditOpen = () => {
    setIsEditingTitle(true);
    setInputTitle(timer.title);
  };

  const handleTitleEditSave = () => {
    if (inputTitle.trim() && inputTitle.trim() !== timer.title) {
      onTitleChange(inputTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleEditOpen = () => {
    if (timer.status === "running") return;
    setIsEditingTime(true);
    setInputTime(formatTime(timer.remaining));
  };

  const handleEditSave = () => {
    const parts = inputTime.split(":");
    let newTotal = timer.duration;

    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
        newTotal = minutes * 60 + seconds;
      }
    } else if (parts.length === 1) {
      const minutes = parseInt(parts[0], 10);
      if (!Number.isNaN(minutes)) {
        newTotal = minutes * 60;
      }
    }

    if (newTotal > 0 && newTotal !== timer.remaining) {
      onDurationChange(newTotal);
    }

    setIsEditingTime(false);
  };

  const isDone = timer.status === "done";
  const progress = isDone ? 100 : ((timer.duration - timer.remaining) / timer.duration) * 100;
  const ringColor = timer.isRinging ? "#ef4444" : "#8f00ff";

  return (
    <div className="w-[320px] h-[480px] bg-[#121216] rounded-[32px] border border-white/5 p-8 flex flex-col relative group shadow-2xl">
      <div className="flex justify-between items-center mb-10 gap-4">
        {isEditingTitle ? (
          <input
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            onBlur={handleTitleEditSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleEditSave()}
            className="w-full bg-transparent text-[17px] font-medium text-white tracking-wide outline-none border-b border-[#9d00ff]"
            autoFocus
          />
        ) : (
          <h3
            onClick={handleTitleEditOpen}
            className="text-[17px] font-medium text-[#e4e4e7] tracking-wide hover:text-white cursor-pointer transition-colors truncate"
            title="Click to edit title"
          >
            {timer.title}
          </h3>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleAlarm}
            className="text-[#52525b] hover:text-[#e4e4e7] transition-colors flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase mr-1"
            title="Toggle Alarm"
          >
            {timer.alarmEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {timer.alarmEnabled ? "alarm on" : "alarm off"}
          </button>
          <span className="text-[11px] text-[#52525b] font-mono">#{timer.id}</span>
          <button
            onClick={onRemove}
            className="text-[#52525b] hover:text-[#e4e4e7] transition-colors -mr-1"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-[240px] h-[240px] -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={isDone ? "#18181b" : "#201c2b"}
              strokeWidth="4"
            />
            {!isDone && (
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={ringColor}
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 340" }}
                animate={{
                  strokeDasharray: `${(progress / 100) * 339.29} 339.29`,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            )}
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {isEditingTime ? (
            <input
              type="text"
              value={inputTime}
              onChange={(e) => setInputTime(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              className="w-40 bg-transparent text-center text-5xl font-mono tracking-wider font-semibold text-white outline-none border-b-2 border-[#9d00ff] pb-1"
              autoFocus
            />
          ) : (
            <span
              onClick={handleEditOpen}
              className={`text-5xl font-mono tracking-wider font-semibold text-white ${timer.status !== "running" ? "hover:text-neutral-300 transition-colors cursor-pointer" : ""}`}
              title={timer.status !== "running" ? "Click to edit" : undefined}
            >
              {formatTime(timer.remaining)}
            </span>
          )}

          <span className="text-[10px] font-bold tracking-[0.25em] text-[#71717a] mt-4 uppercase">
            {timer.isRinging ? "alarm" : timer.status}
          </span>
        </div>
      </div>

      <div className="h-[80px] flex items-center justify-center gap-3 mt-6">
        {timer.isRinging ? (
          <button
            onClick={onStopRinging}
            className="w-full h-14 rounded-full bg-[#ef4444] hover:bg-[#dc2626] shadow-[0_0_25px_rgba(239,68,68,0.3)] flex items-center justify-center transition-all text-white font-bold tracking-widest uppercase text-[13px]"
          >
            Dismiss Alarm
          </button>
        ) : isDone ? (
          <button
            onClick={onReset}
            className="w-14 h-14 rounded-full bg-[#18181b] hover:bg-[#27272a] border border-white/5 flex items-center justify-center transition-colors text-[#a1a1aa] hover:text-white"
          >
            <RotateCcw className="w-5 h-5 stroke-[1.5]" />
          </button>
        ) : (
          <>
            <button
              onClick={onSubOneMin}
              className="w-[42px] h-[42px] rounded-full border border-white/10 flex items-center justify-center transition-colors text-[#a1a1aa] hover:text-white hover:border-white/20 text-[11px] font-mono shrink-0"
            >
              -1m
            </button>
            <button
              onClick={onToggle}
              className="w-16 h-16 rounded-full bg-[#9d00ff] hover:bg-[#a814ff] shadow-[0_0_25px_rgba(157,0,255,0.4)] flex items-center justify-center transition-all text-white overflow-hidden shrink-0"
            >
              {timer.status === "running" ? (
                <div className="flex gap-1.5 items-center justify-center w-full h-full">
                  <div className="w-[3px] h-4 bg-white rounded-full"></div>
                  <div className="w-[3px] h-4 bg-white rounded-full"></div>
                </div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="ml-1">
                  <path d="M6 4L20 12L6 20V4Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              onClick={onAddOneMin}
              className="w-[42px] h-[42px] rounded-full border border-white/10 flex items-center justify-center transition-colors text-[#a1a1aa] hover:text-white hover:border-white/20 text-[11px] font-mono shrink-0"
            >
              +1m
            </button>
            <button
              onClick={onReset}
              className="w-[42px] h-[42px] rounded-full border border-white/10 flex items-center justify-center transition-colors text-[#a1a1aa] hover:text-white hover:border-white/20 shrink-0"
            >
              <RotateCcw className="w-[14px] h-[14px] stroke-[1.5]" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
