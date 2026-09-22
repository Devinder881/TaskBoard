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
} from "@fortawesome/free-solid-svg-icons";

// ---------- shared time helpers ----------
const clampUnit = (n) => Math.min(59, Math.max(0, Number.isNaN(n) ? 0 : n));

const toHMS = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    h: clampUnit(Math.floor(s / 3600)),
    m: clampUnit(Math.floor((s % 3600) / 60)),
    s: clampUnit(s % 60),
  };
};

const toSeconds = ({ h, m, s }) => h * 3600 + m * 60 + s;

// reuses your own drain-animation stops as the color lookup table
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
      const range = a.at - b.at || 1;
      const t = (a.at - p) / range;
      const mix = a.color.map((c, idx) => Math.round(c + (b.color[idx] - c) * t));
      return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
    }
  }
  return `rgb(${colorStops[colorStops.length - 1].color.join(", ")})`;
}

// ---------- TimeUnit: one clickable/scrollable H, M, or S box ----------
function TimeUnit({ value, onChange, disabled }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value).padStart(2, "0"));

  const commit = () => {
    onChange(clampUnit(Number(draft)));
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(clampUnit(value + 1))}
        className="text-zinc-500 hover:text-[rgb(58,255,58)] disabled:opacity-30 disabled:hover:text-zinc-500"
      >
        <FontAwesomeIcon icon={faChevronUp} size="xs" />
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-10 h-8 text-center bg-zinc-900 border border-[rgb(58,255,58)] rounded text-lg outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDraft(String(value).padStart(2, "0"));
            setEditing(true);
          }}
          className="w-10 h-8 text-center bg-zinc-900 border border-zinc-700 rounded text-lg disabled:opacity-50"
        >
          {String(value).padStart(2, "0")}
        </button>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(clampUnit(value - 1))}
        className="text-zinc-500 hover:text-[rgb(58,255,58)] disabled:opacity-30 disabled:hover:text-zinc-500"
      >
        <FontAwesomeIcon icon={faChevronDown} size="xs" />
      </button>
    </div>
  );
}

// ---------- TimeInput: H : M : S grouped together ----------
function TimeInput({ h, m, s, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg">
      <TimeUnit value={h} disabled={disabled} onChange={(v) => onChange({ h: v, m, s })} />
      <span className="text-zinc-600 text-xl pb-6">:</span>
      <TimeUnit value={m} disabled={disabled} onChange={(v) => onChange({ h, m: v, s })} />
      <span className="text-zinc-600 text-xl pb-6">:</span>
      <TimeUnit value={s} disabled={disabled} onChange={(v) => onChange({ h, m, s: v })} />
    </div>
  );
}

// ---------- Edit Modal ----------
function EditModal({ task, onSave, onCancel }) {
  const [taskName, setTaskName] = useState(task.Task);
  const [disc, setDisc] = useState(task.Disc);
  const [time, setTime] = useState(toHMS(task.remainingAtLastEdit));

  const handleSave = () => {
    if (!taskName.trim()) return;
    onSave({ Task: taskName, Disc: disc, newRemainingSeconds: toSeconds(time) });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded-xl p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white">Edit task</h2>

        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          className="h-11 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-none focus:border-[rgb(58,255,58)]"
          placeholder="Task name"
        />
        <input
          value={disc}
          onChange={(e) => setDisc(e.target.value)}
          className="h-11 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white outline-none focus:border-[rgb(58,255,58)]"
          placeholder="Description"
        />

        <div className="flex justify-center">
          <TimeInput h={time.h} m={time.m} s={time.s} onChange={setTime} />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[rgb(58,255,58)] text-black font-bold hover:bg-white"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- TaskItem ----------
function TaskItem({ task, onDelete, setTaskBoard }) {
  const [displayRemaining, setDisplayRemaining] = useState(task.remainingAtLastEdit);
  const [showEdit, setShowEdit] = useState(false);
  const intervalRef = useRef(null);

  // live ticking while running
  useEffect(() => {
    if (task.paused || task.completed) {
      setDisplayRemaining(task.remainingAtLastEdit);
      return;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - task.startedAt) / 1000;
      const remaining = Math.max(0, task.remainingAtLastEdit - elapsed);
      setDisplayRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setTaskBoard((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, completed: true, paused: true, remainingAtLastEdit: 0 } : t
          )
        );
      }
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [task.paused, task.completed, task.startedAt, task.remainingAtLastEdit, task.id, setTaskBoard]);

  const percent = task.totalDuration > 0 ? (displayRemaining / task.totalDuration) * 100 : 0;
  const { h, m, s } = toHMS(displayRemaining);

  const togglePause = () => {
    setTaskBoard((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        if (t.paused) {
          // resume: restart the clock from wherever remaining currently sits
          return { ...t, paused: false, startedAt: Date.now() };
        }
        // pause: freeze remaining at its current live value
        const elapsed = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
        const remaining = Math.max(0, t.remainingAtLastEdit - elapsed);
        return { ...t, paused: true, remainingAtLastEdit: remaining, startedAt: null };
      })
    );
  };

  const openEdit = () => {
    // pause first, exactly as the moment we open we want a frozen, accurate remaining value
    setTaskBoard((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        const elapsed = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
        const remaining = Math.max(0, t.remainingAtLastEdit - elapsed);
        return { ...t, paused: true, remainingAtLastEdit: remaining, startedAt: null };
      })
    );
    setShowEdit(true);
  };

  const saveEdit = ({ Task, Disc, newRemainingSeconds }) => {
    setTaskBoard((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;

        const extendsPastOriginal = newRemainingSeconds > t.totalDuration;

        return {
          ...t,
          Task,
          Disc,
          completed: false,
          paused: false,
          startedAt: Date.now(),
          remainingAtLastEdit: newRemainingSeconds,
          // fresh bar if the new time exceeds the original total; otherwise
          // keep the original total so the percent stays proportional
          totalDuration: extendsPastOriginal ? newRemainingSeconds : t.totalDuration,
        };
      })
    );
    setShowEdit(false);
  };

  const barColor = task.completed ? "rgb(255, 23, 23)" : getBarColor(percent);

  return (
    <li className="flex justify-between items-center">
      <div
        className={`p-5 mb-5 flex flex-col justify-between rounded-md border border-x-white flex-1 transition-colors ${task.completed
          ? "bg-red-500 text-black"
          : task.paused
            ? "bg-zinc-800 text-white grayscale-60"
            : "bg-black text-white"
          }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-3xl text-wrap">{task.Task}</h4>
            <p className={`text-xl text-wrap ${task.completed ? "text-black" : "text-stone-500"}`}>
              {task.Disc}
            </p>
          </div>

          <div className="flex gap-3 pl-4">
            <button
              type="button"
              onClick={openEdit}
              disabled={task.completed}
              className="text-zinc-400 hover:text-[rgb(58,255,58)] disabled:opacity-30"
              title="Edit"
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              type="button"
              onClick={togglePause}
              disabled={task.completed}
              className="text-zinc-400 hover:text-[rgb(58,255,58)] disabled:opacity-30"
              title={task.paused ? "Resume" : "Pause"}
            >
              <FontAwesomeIcon icon={task.paused ? faPlay : faPause} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-zinc-400 font-mono">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
        </div>

        <div
          className="mt-2"
          style={{
            width: "100%",
            height: "10px",
            border: "1px solid black",
            borderRadius: "10px",
            backgroundColor: "rgb(255, 255, 255)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${percent}%`,
              backgroundColor: barColor,
              borderRadius: "10px",
              transition: "width 200ms linear, background-color 200ms linear",
            }}
          ></div>
        </div>
      </div>

      <button
        className="w-20 h-12 px-4 py-2 mx-5 bg-red-600 hover:bg-red-800 text-white font-bold rounded-md flex items-center justify-center cursor-pointer"
        onClick={() => onDelete(task.id)}
      >
        <FontAwesomeIcon icon={faTrash} />
      </button>

      {showEdit && (
        <EditModal task={task} onSave={saveEdit} onCancel={() => setShowEdit(false)} />
      )}
    </li>
  );
}

// ---------- Page ----------
const Page = () => {
  const [TaskBoard, setTaskBoard] = useState([]);
  const [input, setInput] = useState({ Task: "", Disc: "" });
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });

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
        totalDuration: totalSeconds,
        remainingAtLastEdit: totalSeconds,
        startedAt: Date.now(),
        paused: false,
        completed: false,
      },
    ]);

    setInput({ Task: "", Disc: "" });
    setTime({ h: 0, m: 0, s: 0 });
  };

  return (
    <>
      <h1 className="w-full bg-black text-gray-200 text-4xl text-center p-5 font-bold">
        TASKBOARD
      </h1>
      <hr className="border-gray-700" />

      <form
        onSubmit={onSubmit}
        className="w-full flex flex-col md:flex-row items-stretch md:items-center gap-3 px-6 py-5 bg-zinc-950 border-b border-zinc-800"
      >
        <input
          type="text"
          name="Task"
          placeholder="Task name"
          value={input.Task}
          onChange={handleChange}
          className="flex-1 min-w-0 h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-lg  text-gray-200  placeholder-zinc-500 outline-none transition-colors focus:border-[rgb(58,255,58)]"
        />
        
        <input
          type="text"
          name="Disc"
          placeholder="Description"
          value={input.Disc}
          onChange={handleChange}
          className="flex-1 min-w-0 h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-lg  text-gray-200  placeholder-zinc-500 outline-none transition-colors focus:border-[rgb(58,255,58)]"
        />

        <TimeInput h={time.h} m={time.m} s={time.s} onChange={setTime} />

        <button
          type="submit"
          className="h-12 px-6 bg-[rgb(0,184,0)] text-black text-lg font-bold rounded-lg transition-colors hover:bg-[rgb(0,77,0)]"
        >
          Add task
        </button>
      </form>

      <hr className="border-gray-700" />

      <div className="p-8 bg-black text-white">
        <ul>
          {TaskBoard.length === 0 ? (
            <h3 className="h-screen">No Task Available Yet!</h3>
          ) : (
            TaskBoard.map((task) => (
              <TaskItem key={task.id} task={task} onDelete={deleteHandler} setTaskBoard={setTaskBoard} />
            ))
          )}
        </ul>
      </div>
    </>
  );
};

export default Page;