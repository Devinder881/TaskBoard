'use client'
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faPlay,
  faPause,
  faChevronUp,
  faChevronDown,
  faTrash,
  faRotateRight,
  faCheck,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { playSound, playRandomSound } from "./utils/playSound";

const STORAGE_KEY = "taskboard-tasks";


const clampUnit = (n) => Math.min(59, Math.max(0, Number.isNaN(n) ? 0 : n));
const clampHour = (n) => Math.min(23, Math.max(0, Number.isNaN(n) ? 0 : n));
const clampDay = (n) => Math.min(365, Math.max(0, Number.isNaN(n) ? 0 : n));
const toDHMS = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    d: clampDay(Math.floor(s / 86400)),
    h: clampHour(Math.floor((s % 86400) / 3600)),
    m: clampUnit(Math.floor((s % 3600) / 60)),
    s: clampUnit(s % 60),
  };
};

const toSeconds = ({ d, h, m, s }) => d * 86400 + h * 3600 + m * 60 + s;

const colorStops = [
  { at: 100, color: [31, 255, 31] },
  { at: 70, color: [248, 255, 34] },
  { at: 33, color: [255, 168, 28] },
  { at: 0, color: [255, 23, 23] },
];


function getBarColor(percent) {
  const p = Math.max(0, Math.min(100, percent));

  for (let i = 0; i < colorStops.length - 1; i++) {

    const a = colorStops[i];
    const b = colorStops[i + 1];

    if (p <= a.at && p >= b.at) {
      const t = (a.at - p) / (a.at - b.at || 1);

      const mix = a.color.map((c, idx) =>
        Math.round(c + (b.color[idx] - c) * t)
      );

      return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
    }
  }

  return `rgb(${colorStops.at(-1).color.join(", ")})`;
}


const PRIORITY_CONFIG = {
  basic: { label: "Basic", color: "156, 156, 156", flash: false, speed: null },
  normal: { label: "Normal", color: "34, 197, 94", flash: true, speed: "2.2s" },
  moderate: { label: "Moderate", color: "234, 179, 8", flash: true, speed: "1.1s" },
  severe: { label: "Severe", color: "239, 68, 68", flash: true, speed: "0.45s" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "basic", label: "Basic" },
  { key: "normal", label: "Normal" },
  { key: "moderate", label: "Moderate" },
  { key: "severe", label: "Severe" },
];

function PriorityIndicator({ priority, paused }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.basic;
  const bgColor = paused ? "#27272a" : ""
  return (
    <div className='flex items-center gap-2 transition-colors duration-150'
      style={{ backgroundColor: bgColor }}>
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{
          backgroundColor: `rgb(${cfg.color})`,
          animation: cfg.flash ? `priorityPulse ${cfg.speed} ease-in-out infinite` : "none",
        }}
      />
      <span className="text-xs bg-transparent font-semibold uppercase tracking-wide" style={{ color: `rgb(${cfg.color})` }}>
        {cfg.label}
      </span>
    </div>
  );
}


function TimeUnit({ value, uName, onChange, disabled, max = 59, digits = 2 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value).padStart(digits, "0"));
  const clamp = (n) => Math.min(max, Math.max(0, Number.isNaN(n) ? 0 : n));
  const commit = () => { onChange(clamp(Number(draft))); setEditing(false); };
  const widthClass = digits === 3 ? "w-14" : "w-10";

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value + 1))}
        className="text-zinc-500 hover:text-[rgb(58,255,58)] disabled:opacity-30">
        <FontAwesomeIcon icon={faChevronUp} size="xs" />
      </button>
      <div>{uName}</div>
      {editing ? (
        <input autoFocus value={draft} disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, digits))}
          onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()}
          className={`${widthClass} h-8 text-center bg-zinc-900 border border-[rgb(58,255,58)] rounded text-lg outline-none`} />
      ) : (
        <button type="button" disabled={disabled}
          onClick={() => { setDraft(String(value).padStart(digits, "0")); setEditing(true); }}
          className={`${widthClass} h-8 text-center bg-zinc-900 border border-zinc-700 rounded text-lg disabled:opacity-50`}>
          {String(value).padStart(digits, "0")}
        </button>
      )}
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value - 1))}
        className="text-zinc-500 hover:text-[rgb(58,255,58)] disabled:opacity-30">
        <FontAwesomeIcon icon={faChevronDown} size="xs" />
      </button>
    </div>
  );
}

function TimeInput({ d, h, m, s, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg">
      <TimeUnit value={d} uName={'D'} max={365} digits={3} disabled={disabled} onChange={(v) => onChange({ d: v, h, m, s })} />

      <TimeUnit value={h} uName={'H'} max={23} disabled={disabled} onChange={(v) => onChange({ d, h: v, m, s })} />

      <TimeUnit value={m} uName={'M'} disabled={disabled} onChange={(v) => onChange({ d, h, m: v, s })} />

      <TimeUnit value={s} uName={'S'} disabled={disabled} onChange={(v) => onChange({ d, h, m, s: v })} />
    </div>
  );
}


function EditModal({ task, onSave, onCancel }) {
  const [taskName, setTaskName] = useState(task.Task);
  const [disc, setDisc] = useState(task.Disc);
  const [priority, setPriority] = useState(task.priority || "basic");
  const [time, setTime] = useState(toDHMS(task.remainingAtLastEdit));

  const handleSave = () => {
    if (!taskName.trim()) return;
    onSave({ Task: taskName, Disc: disc, priority, newRemainingSeconds: toSeconds(time) });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white">Edit task</h2>
        <input value={taskName} onChange={(e) => setTaskName(e.target.value)}
          className="h-11 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-none focus:border-[rgb(58,255,58)]"
          placeholder="Task name" />
        <textarea value={disc} onChange={(e) => setDisc(e.target.value)}
          className="flex-1 min-w-0 h-12 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-lg text-white placeholder-zinc-500 outline-none resize-none focus:border-[rgb(58,255,58)] overflow-hidden "
          placeholder="Description" />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="h-11 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-none focus:border-[rgb(58,255,58)]">
          <option value="basic" style={{ color: "rgb(156,156,156)" }}>Basic</option>
          <option value="normal" style={{ color: "rgb(34,197,94)" }}>-- Normal</option>
          <option value="moderate" style={{ color: "rgb(234,179,8)" }}>-- Moderate</option>
          <option value="severe" style={{ color: "rgb(239,68,68)" }}>-- Severe</option>
        </select>

        <div className="flex justify-center">
          <TimeInput d={time.d} h={time.h} m={time.m} s={time.s} onChange={setTime} />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-900">Cancel</button>
          <button type="button" onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[rgb(58,255,58)] text-black font-bold hover:bg-white">Save changes</button>
        </div>
      </div>
    </div>
  );
}


function TaskItem({ task, onDelete, setTaskBoard }) {
  const [displayRemaining, setDisplayRemaining] = useState(task.remainingAtLastEdit);
  const [showEdit, setShowEdit] = useState(false);
  const intervalRef = useRef(null);
  const prevStateRef = useRef({ paused: task.paused, completed: task.completed, overdue: task.overdue });

  useEffect(() => {
    if (task.paused || task.completed) { setDisplayRemaining(task.remainingAtLastEdit); return; }
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - task.startedAt) / 1000;
      const remaining = Math.max(0, task.remainingAtLastEdit - elapsed);
      setDisplayRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setTaskBoard((prev) => prev.map((t) =>
          t.id === task.id ? { ...t, completed: true, paused: true, remainingAtLastEdit: 0, overdue: true } : t
          //                                                                                  ^^^^^^^^^^^^^ NEW
        ));
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [task.paused, task.completed, task.startedAt, task.remainingAtLastEdit, task.id, setTaskBoard]);


  useEffect(() => {
    const prev = prevStateRef.current;

    if (task.overdue && !prev.overdue) {
      playRandomSound("overdue");
    } else if (task.completed && !task.overdue && !prev.completed) {
      playRandomSound("complete");
    } else if (task.paused && !prev.paused) {
      playSound("/sounds/play-n-pause.mp3");
    } else if (!task.paused && prev.paused && !task.completed) {
      playSound("/sounds/play-n-pause.mp3");
    }

    prevStateRef.current = { paused: task.paused, completed: task.completed, overdue: task.overdue };
  }, [task.paused, task.completed, task.overdue]);


  const percent = task.totalDuration > 0 ? (displayRemaining / task.totalDuration) * 100 : 0;
  const { d, h, m, s } = toDHMS(displayRemaining);

  const togglePause = () => {
    setTaskBoard((prev) => prev.map((t) => {
      if (t.id !== task.id) return t;
      if (t.paused) return { ...t, paused: false, startedAt: Date.now() };
      const elapsed = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
      const remaining = Math.max(0, t.remainingAtLastEdit - elapsed);
      return { ...t, paused: true, remainingAtLastEdit: remaining, startedAt: null };
    }));
  };

  const openEdit = () => {
    setTaskBoard((prev) => prev.map((t) => {
      if (t.id !== task.id) return t;
      const elapsed = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
      const remaining = Math.max(0, t.remainingAtLastEdit - elapsed);
      return { ...t, paused: true, remainingAtLastEdit: remaining, startedAt: null };
    }));
    setShowEdit(true);
  };

  const saveEdit = ({ Task, Disc, priority, newRemainingSeconds }) => {
    setTaskBoard((prev) => prev.map((t) => {
      if (t.id !== task.id) return t;
      const extendsPastOriginal = newRemainingSeconds > t.totalDuration;
      return {
        ...t, Task, Disc, priority,
        completed: false, paused: false, startedAt: Date.now(),
        remainingAtLastEdit: newRemainingSeconds,
        totalDuration: extendsPastOriginal ? newRemainingSeconds : t.totalDuration,
      };
    }));
    setShowEdit(false);
  };


  const completeTask = () => {
    setTaskBoard((prev) => prev.map((t) =>
      t.id === task.id ? { ...t, completed: true, paused: true, remainingAtLastEdit: 0, overdue: false } : t
    ));
  };

  const reloadTask = () => {
    setTaskBoard((prev) => prev.map((t) =>
      t.id === task.id
        ? { ...t, completed: false, paused: false, overdue: false, startedAt: Date.now(), remainingAtLastEdit: t.totalDuration }
        : t
    ));
  };

  const barColor = task.overdue ? "rgb(239, 68, 68)" : task.completed ? "rgb(58, 255, 58)" : getBarColor(percent);
  const cardBg = task.overdue ? "rgb(220, 38, 38)" : task.completed ? "rgb(58, 255, 58)" : task.paused ? "#27272a" : "#000000";
  const cardText = (task.completed || task.overdue) ? "#000000" : "#ffffff";



  return (
    <li className="flex justify-between items-center">
      <div className="p-5 mb-5 flex flex-col justify-between rounded-md border border-x-white flex-1 transition-colors"
        style={{ backgroundColor: cardBg, color: cardText }}>

        <div className="flex justify-between items-start" style={{ backgroundColor: "transparent" }}>
          <div className="w-full" style={{ backgroundColor: "transparent" }}>
            <h4 className="font-bold text-3xl text-wrap" style={{ color: cardText, backgroundColor: "transparent" }}>
              {task.Task}
            </h4>
            {!task.completed && !task.overdue && (
              <div className="mt-1"><PriorityIndicator priority={task.priority} paused={task.paused} /></div>
            )}
            <p
              className="w-full text-xl mt-1"
              style={{ color: cardText, backgroundColor: "transparent", whiteSpace: "pre-wrap" }}
            >
              {task.Disc}
            </p>
          </div>

          <div className="flex gap-3 pl-4" style={{ backgroundColor: "transparent" }}>
            {task.completed ? (
              <button
                type="button"
                onClick={reloadTask}
                style={{
                  color: "black",
                  backgroundColor: task.overdue ? "rgb(220, 38, 38)" : "rgb(58, 255, 58)",
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full"
                title="Restart task"
              >
                <FontAwesomeIcon
                  icon={faRotateRight}
                  size="lg"
                  className="arrow-icon"
                />
              </button>
            ) : (
              <>
                <button type="button" onClick={openEdit} className="text-zinc-400 hover:text-[rgb(58,255,58)]" title="Edit">
                  <FontAwesomeIcon icon={faPen} className="bg-transparent" size="md" />
                </button>
                <button type="button" onClick={togglePause} className="text-zinc-400 hover:text-[rgb(58,255,58)]" title={task.paused ? "Resume" : "Pause"}>
                  <FontAwesomeIcon icon={task.paused ? faPlay : faPause} className="bg-transparent" size="md" />
                </button>
                <button type="button" onClick={completeTask} className="text-zinc-400 hover:text-[#3aff3a]" title="Mark complete">
                  <FontAwesomeIcon icon={faCheck} className="bg-transparent" size="md" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2" style={{ backgroundColor: "transparent" }}>
          <span
            className="text-sm font-mono"
            style={{ color: (task.completed || task.overdue) ? "black" : "#a1a1aa", backgroundColor: "transparent" }}
          >
            {String(d).padStart(3, "0")}:{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
        </div>

        <div className="mt-2" style={{ width: "100%", height: "10px", border: "1px solid black", borderRadius: "10px", backgroundColor: "rgb(255,255,255)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            width: (task.completed || task.overdue) ? "100%" : `${percent}%`,
            backgroundColor: task.overdue ? "rgb(220,38,38)" : task.completed ? "rgb(58,255,58)" : getBarColor(percent),
            borderRadius: "10px",
            transition: "width 200ms linear, background-color 200ms linear",
          }}></div>
        </div>
      </div>

      <button className="w-20 h-12 px-4 py-2 mx-5 bg-red-600 text-white font-bold rounded-md flex items-center justify-center"
        onClick={() => {
          onDelete(task.id);
          playSound("/sounds/play-n-pause.mp3");
        }}>
        <FontAwesomeIcon className="bg-transparent" icon={faTrash} />
      </button>

      {showEdit && <EditModal task={task} onSave={saveEdit} onCancel={() => setShowEdit(false)} />}
    </li>

  );
}


const Page = () => {
  const [TaskBoard, setTaskBoard] = useState([]);
  const [input, setInput] = useState({ Task: "", Disc: "", Priority: "basic" });
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [hasLoaded, setHasLoaded] = useState(false);
  const taskBoardRef = useRef(TaskBoard);
  const [formVisible, setFormVisible] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("all");




  useEffect(() => { taskBoardRef.current = TaskBoard; }, [TaskBoard]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored = parsed.map((t) =>
          !t.paused && !t.completed ? { ...t, startedAt: Date.now() } : t
        );
        setTaskBoard(restored);
      }
    } catch (err) {
      console.error("Failed to load saved tasks:", err);
    } finally {
      setHasLoaded(true);
    }
  }, []);


  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(TaskBoard));
    } catch (err) {
      console.error("Failed to save tasks:", err);
    }
  }, [TaskBoard, hasLoaded]);


  useEffect(() => {
    const freezeAndSave = () => {
      const frozen = taskBoardRef.current.map((t) => {
        if (t.paused || t.completed || !t.startedAt) return t;
        const elapsed = (Date.now() - t.startedAt) / 1000;
        const remaining = Math.max(0, t.remainingAtLastEdit - elapsed);
        return { ...t, remainingAtLastEdit: remaining, startedAt: Date.now() };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(frozen));
      } catch (err) {
        console.error("Failed to save on close:", err);
      }
    };

    window.addEventListener("pagehide", freezeAndSave);

    const safetyInterval = setInterval(freezeAndSave, 5000);

    return () => {
      window.removeEventListener("pagehide", freezeAndSave);
      clearInterval(safetyInterval);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInput((values) => ({ ...values, [name]: value }));
  };

  const deleteHandler = (id) => {
    setTaskBoard((prev) => prev.filter((task) => task.id !== id));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!input.Task.trim()) return;
    const totalSeconds = toSeconds(time);
    if (totalSeconds <= 0) return;

    setTaskBoard((prev) => [
      ...prev,
      {
        id: Date.now(),
        Task: input.Task,
        Disc: input.Disc,
        priority: input.Priority,
        totalDuration: totalSeconds,
        remainingAtLastEdit: totalSeconds,
        startedAt: Date.now(),
        paused: false,
        completed: false,
      },
    ]);
    playSound("/sounds/play-n-pause.mp3");

    setInput({ Task: "", Disc: "", Priority: "basic" });
    setTime({ d: 0, h: 0, m: 0, s: 0 });
  };


  const visibleTasks =
    priorityFilter === "all"
      ? TaskBoard
      : TaskBoard.filter((task) => (task.priority || "basic") === priorityFilter);

  const counts = TaskBoard.reduce(
    (acc, task) => {
      const key = task.priority || "basic";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { all: TaskBoard.length }
  );

  return (
    <>
      <h1 className="w-full bg-black text-white text-4xl text-center p-5 font-bold">TASKBOARD</h1>
      <hr className="border-gray-700" />

      <div
        className="w-full overflow-hidden bg-zinc-950 border-b border-zinc-800 transition-all duration-300 ease-in-out"
        style={{ height: formVisible ? "auto" : "48px" }}
      >
        {formVisible ? (
          <form
            onSubmit={onSubmit}
            className="w-full flex flex-col md:flex-row items-stretch md:items-center gap-3 px-6 py-5"
          >
            <input type="text" name="Task" placeholder="Task name" value={input.Task} onChange={handleChange}
              className="flex-1 min-w-0 h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-b-sm text-lg text-white placeholder-zinc-500 outline-none focus:border-[rgb(58,255,58)]" />
            <textarea
              name="Disc"
              placeholder="Description"
              value={input.Disc}
              onChange={handleChange}
              rows={1}
              className="flex-1 min-w-0 h-12 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-lg text-white placeholder-zinc-500 outline-none resize-none focus:border-[rgb(58,255,58)] overflow-hidden "
            />

            <select name="Priority" value={input.Priority} onChange={handleChange}
              className="h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-b-sm text-lg text-white outline-none focus:border-[rgb(58,255,58)]">
              <option value="basic" style={{ color: "rgb(156,156,156)" }}>Basic</option>
              <option value="normal" style={{ color: "rgb(34,197,94)" }}>Normal</option>
              <option value="moderate" style={{ color: "rgb(234,179,8)" }}>Moderate</option>
              <option value="severe" style={{ color: "rgb(239,68,68)" }}>Severe</option>
            </select>

            <TimeInput d={time.d} h={time.h} m={time.m} s={time.s} onChange={setTime} />

            <button type="submit" className="h-12 px-6 bg-[rgb(58,255,58)] text-black text-lg font-bold rounded-lg hover:bg-white">
              Add task
            </button>

            <button
              type="button"
              onClick={() => {
                setFormVisible(false)
                playSound("/sounds/play-n-pause.mp3")
              }}
              className="h-12 w-12 flex items-center justify-center text-zinc-400 hover:text-[rgb(58,255,58)]"
              title="Hide form"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          </form>
        ) : (
          <div className="w-full h-10 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setFormVisible(true);
                playSound("/sounds/play-n-pause.mp3");
              }}
              className="h-12 w-12 flex items-center justify-center text-zinc-400 hover:text-[rgb(58,255,58)]"
              title="Show form"
            >
              <FontAwesomeIcon icon={faEyeSlash} />
            </button>
          </div>
        )}
      </div >



      <hr className="border-gray-700" />

      <div className="p-8 bg-black text-white">

        <div className="flex flex-wrap justify-end gap-2 mb-6">
          {FILTER_OPTIONS.map(({ key, label }) => {
            const isActive = priorityFilter === key;
            const color = key === "all" ? "58, 255, 58" : PRIORITY_CONFIG[key].color;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setPriorityFilter(key)}
                className="px-4 py-1.5 rounded-lg border text-base font-semibold transition-colors"
                style={{
                  color: isActive ? "#000000" : `rgb(${color})`,
                  backgroundColor: isActive ? `rgb(${color})` : "transparent",
                  borderColor: `rgb(${color})`,
                }}
              >
                {label} <span style={{
                  color: isActive ? "#000000" : `rgb(${color})`,
                  backgroundColor: "transparent",
                  opacity: isActive ? 1 : 0.8,
                  marginLeft: '10px',
                  transition: "all 0.3s ease"
                }}>
                  {counts[key] || 0}</span>
              </button>
            );
          })}
        </div>

        <ul>
          {TaskBoard.length === 0 ? (
            <h3 className="h-screen">No Task Available Yet!</h3>
          ) : visibleTasks.length === 0 ? (
            <h3 className="py-10 text-zinc-500">No {priorityFilter} tasks right now.</h3>
          ) : (
            visibleTasks.map((task) => (
              <TaskItem key={task.id} task={task} onDelete={deleteHandler} setTaskBoard={setTaskBoard} />
            ))
          )}
        </ul>
      </div>
    </>
  );
};

export default Page;
