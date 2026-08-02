import { useCallback, useEffect, useMemo, useState } from "react";
import * as FeatherIcons from "react-icons/fi";

const ICON_COMPONENTS = {
  Activity: "FiActivity", AppWindow: "FiSquare", BatteryCharging: "FiBatteryCharging",
  BatteryMedium: "FiBattery", BellOff: "FiBellOff", Bluetooth: "FiBluetooth", Bookmark: "FiBookmark",
  Bot: "FiCpu", CalendarDays: "FiCalendar", Camera: "FiCamera", Check: "FiCheck",
  ChevronLeft: "FiChevronLeft", ChevronRight: "FiChevronRight", Chrome: "FiGlobe", Circle: "FiCircle",
  CircleAlert: "FiAlertCircle", CircleCheck: "FiCheckCircle", Clipboard: "FiClipboard", Cpu: "FiCpu",
  ExternalLink: "FiExternalLink", Globe2: "FiGlobe", HardDrive: "FiHardDrive", House: "FiHome",
  Info: "FiInfo", Layers3: "FiLayers", Link2: "FiLink2", LoaderCircle: "FiLoader", Mail: "FiMail",
  MemoryStick: "FiServer", MessageCircle: "FiMessageCircle", MessageSquareMore: "FiMessageSquare",
  MessagesSquare: "FiMessageSquare", Mic: "FiMic", Monitor: "FiMonitor", Moon: "FiMoon",
  Music2: "FiMusic", Network: "FiWifi", PanelsTopLeft: "FiGrid", Pause: "FiPause", Play: "FiPlay",
  Plus: "FiPlus", Presentation: "FiPieChart", RefreshCw: "FiRefreshCw", Search: "FiSearch",
  Send: "FiSend", Settings: "FiSettings", Sheet: "FiGrid", Shield: "FiShield", ShieldCheck: "FiShield",
  Shuffle: "FiShuffle", SkipBack: "FiSkipBack", SkipForward: "FiSkipForward", Smartphone: "FiSmartphone",
  Sparkles: "FiZap", Sun: "FiSun", Trash2: "FiTrash2", UsersRound: "FiUsers", Volume2: "FiVolume2",
  Wifi: "FiWifi", X: "FiX",
};

const API_BASE = import.meta.env.VITE_API_BASE || "";

const CONTROL_META = {
  wifi: { label: "Wi-Fi", detail: "HomeNet 5G", icon: "Wifi" },
  bluetooth: { label: "Bluetooth", detail: "On", icon: "Bluetooth" },
  focus: { label: "Focus", detail: "Off", icon: "Moon" },
  "night-light": { label: "Night light", detail: "On until 7:00 AM", icon: "Sun" },
  microphone: { label: "Mic privacy", detail: "Allowed", icon: "Mic" },
  "battery-saver": { label: "Battery saver", detail: "Off", icon: "BatteryCharging" },
};

const CONTROL_ORDER = ["wifi", "bluetooth", "focus", "night-light", "microphone", "battery-saver"];

const FALLBACK_SYSTEM = {
  host: {
    name: "LOCAL-DESKTOP",
    user: "Local user",
    os: "Windows 11 Pro",
    osVersion: "24H2",
    architecture: "x64",
    javaVersion: 21,
  },
  resources: {
    cpuPercent: 12,
    memoryUsedBytes: 15.3 * 1024 ** 3,
    memoryTotalBytes: 32 * 1024 ** 3,
    storageUsedBytes: 405 * 1024 ** 3,
    storageTotalBytes: 1000 * 1024 ** 3,
    network: { name: "Ethernet", address: "Connected", connected: true },
    battery: { available: true, percent: 78, detail: "Charging" },
  },
  controls: CONTROL_ORDER.map((id) => ({
    id,
    label: CONTROL_META[id].label,
    enabled: ["wifi", "bluetooth", "night-light", "microphone"].includes(id),
    available: true,
    detail: "Opens Windows settings after approval",
  })),
};

const FALLBACK_APPS = [
  { id: "code", name: "Visual Studio Code", detail: "Working file: app.tsx", icon: "code", running: true, age: "10m ago" },
  { id: "figma", name: "Figma", detail: "Design review", icon: "figma", running: true, age: "25m ago" },
  { id: "msedge", name: "Microsoft Edge", detail: "Live Desktop – research", icon: "edge", running: true, age: "1h ago" },
  { id: "excel", name: "Microsoft Excel", detail: "Budget_2026.xlsx", icon: "excel", running: true, age: "2h ago" },
  { id: "powerpnt", name: "PowerPoint", detail: "Q3 Planning Deck.pptx", icon: "powerpoint", running: true, age: "3h ago" },
];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "House" },
  { id: "approvals", label: "Approvals", icon: "ShieldCheck" },
  { id: "memories", label: "Memories", icon: "Bookmark" },
  { id: "conversations", label: "Conversations", icon: "MessagesSquare" },
];

const APP_ICON_ASSETS = {
  code: "/assets/app-vscode.svg",
  figma: "/assets/app-figma.svg",
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return payload;
}

function Icon({ name, size = 20, strokeWidth = 1.8, className = "" }) {
  const Component = FeatherIcons[ICON_COMPONENTS[name]] || FeatherIcons.FiCircle;
  return <span className={`icon ${className}`} aria-hidden="true"><Component size={size} strokeWidth={strokeWidth} /></span>;
}

function AppLogo({ small = false }) {
  return (
    <span className={`app-logo ${small ? "app-logo--small" : ""}`} aria-hidden="true">
      <Icon name="Sparkles" size={small ? 18 : 22} strokeWidth={2.2} />
    </span>
  );
}

function Toggle({ enabled, pending, disabled, onClick, label }) {
  return (
    <button
      className={`toggle ${enabled ? "toggle--on" : ""}`}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}: ${enabled ? "on" : "off"}. Open Windows setting`}
      disabled={disabled || pending}
      onClick={onClick}
    >
      <span className="toggle__thumb">{pending ? <Icon name="LoaderCircle" size={11} className="spin" /> : null}</span>
    </button>
  );
}

function formatBytes(value, digits = 1) {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? digits : 0)} ${units[index]}`;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

function MeterSparkline({ value = 40 }) {
  return <meter className="resource-meter" min="0" max="100" value={Math.max(0, Math.min(100, value))}>{value}%</meter>;
}

function BrandIcon({ app }) {
  if (APP_ICON_ASSETS[app.icon]) {
    return <img className="brand-icon" src={APP_ICON_ASSETS[app.icon]} alt="" />;
  }
  const names = {
    edge: "Globe2",
    chrome: "Chrome",
    excel: "Sheet",
    powerpoint: "Presentation",
    "apple-music": "Music2",
    slack: "MessageSquareMore",
    teams: "UsersRound",
  };
  return (
    <span className={`brand-icon brand-icon--${app.icon || app.id}`}>
      <Icon name={names[app.icon] || "AppWindow"} size={20} />
    </span>
  );
}

function SystemHealth({ system, connected, configured }) {
  const resources = system.resources;
  const memoryPercent = percent(resources.memoryUsedBytes, resources.memoryTotalBytes);
  const storagePercent = percent(resources.storageUsedBytes, resources.storageTotalBytes);
  const rows = [
    {
      icon: "Cpu",
      label: "CPU",
      main: `${resources.cpuPercent ?? 0}%`,
      detail: system.host.architecture,
      value: resources.cpuPercent,
      spark: true,
    },
    {
      icon: "MemoryStick",
      label: "Memory",
      main: `${memoryPercent}%`,
      detail: `${formatBytes(resources.memoryUsedBytes)} / ${formatBytes(resources.memoryTotalBytes)}`,
      value: memoryPercent,
      spark: true,
    },
    {
      icon: "HardDrive",
      label: "Storage",
      main: `${storagePercent}%`,
      detail: `${formatBytes(Math.max(0, resources.storageTotalBytes - resources.storageUsedBytes))} free`,
      value: storagePercent,
      spark: true,
    },
    {
      icon: "Wifi",
      label: "Network",
      main: resources.network.connected ? "Online" : "Offline",
      detail: resources.network.name,
      value: resources.network.connected ? 62 : 0,
      spark: true,
    },
    {
      icon: "BatteryMedium",
      label: "Battery",
      main: resources.battery.available ? `${resources.battery.percent}%` : "AC power",
      detail: resources.battery.detail,
      value: resources.battery.percent || 100,
      spark: resources.battery.available,
    },
  ];

  return (
    <section className="health-column" aria-labelledby="health-title">
      <div className="column-title-row">
        <h3 id="health-title">System health</h3>
        <span className={`status-label ${connected ? "status-label--good" : "status-label--warn"}`}>
          <Icon name={connected ? "CircleCheck" : "CircleAlert"} size={14} />
          {connected ? "All good" : "Offline preview"}
        </span>
      </div>
      <div className="metric-list">
        {rows.map((row) => (
          <div className="metric-row" key={row.label}>
            <Icon name={row.icon} size={21} className="metric-icon" />
            <div className="metric-copy">
              <strong>{row.label}</strong>
              <span>{row.detail}</span>
            </div>
            <b>{row.main}</b>
            {row.spark ? <MeterSparkline value={row.value} /> : <span className="metric-space" />}
          </div>
        ))}
      </div>
      <div className="device-list">
        <InfoLine icon="PanelsTopLeft" label="Windows" value={`${system.host.os} ${system.host.osVersion}`} />
        <InfoLine icon="Monitor" label="Device" value={system.host.name} />
        <InfoLine icon="Layers3" label="Backend" value={connected ? "Local API connected" : "Unavailable"} healthy={connected} />
        <InfoLine icon="Bot" label="OpenAI" value={configured ? "Connected" : "API key needed"} healthy={configured} />
      </div>
      <button className="text-action" type="button" onClick={() => document.getElementById("system-controls")?.focus()}>
        System details <Icon name="ChevronRight" size={15} />
      </button>
    </section>
  );
}

function InfoLine({ icon, label, value, healthy }) {
  return (
    <div className="info-line">
      <Icon name={icon} size={19} />
      <strong>{label}</strong>
      <span title={value}>{value}</span>
      {healthy !== undefined ? <i className={`status-dot ${healthy ? "status-dot--good" : "status-dot--warn"}`} /> : null}
    </div>
  );
}

function RecentApps({ apps }) {
  const displayApps = apps.length ? apps.slice(0, 5).map((app, index) => ({ ...app, age: index ? `${index * 12 + 1}m ago` : "Now" })) : FALLBACK_APPS;
  return (
    <section className="activity-column" aria-labelledby="activity-title">
      <div className="column-title-row">
        <h3 id="activity-title">Recent activity</h3>
        <button type="button" className="text-action">View all</button>
      </div>
      <div className="app-list">
        {displayApps.map((app) => (
          <button className="app-row" type="button" key={app.id} onClick={() => {}}>
            <BrandIcon app={app} />
            <span>
              <strong>{app.name}</strong>
              <small>{app.detail}</small>
            </span>
            <time>{app.age}</time>
          </button>
        ))}
      </div>
      <button className="text-action show-more" type="button">Show more <Icon name="ChevronRight" size={15} /></button>
    </section>
  );
}

function CalendarAndMedia() {
  const [playing, setPlaying] = useState(true);
  return (
    <section className="calendar-column" aria-labelledby="calendar-title">
      <div className="column-title-row">
        <div>
          <h3 id="calendar-title">Calendar</h3>
          <p>August 2, 2026</p>
        </div>
        <div className="calendar-nav">
          <button type="button" aria-label="Previous day"><Icon name="ChevronLeft" size={18} /></button>
          <button type="button">Today</button>
          <button type="button" aria-label="Next day"><Icon name="ChevronRight" size={18} /></button>
        </div>
      </div>
      <div className="agenda">
        <AgendaItem time="10:00 AM" title="Design sync" detail="Microsoft Teams" duration="30m" active />
        <AgendaItem time="1:00 PM" title="Project review" detail="Conf Room 3 / Teams" duration="1h" active />
        <AgendaItem time="3:30 PM" title="Focus time" detail="No meetings" duration="2h" />
      </div>
      <button className="text-action" type="button">Open Calendar <Icon name="ExternalLink" size={14} /></button>
      <div className="media-widget">
        <div className="media-label"><img src="/assets/app-apple-music.svg" alt="" /> Listening on Apple Music</div>
        <div className="track">
          <img src="/assets/album-cover.png" alt="Blurred album cover" />
          <div><strong>Ataraxia</strong><span>Kiasmos</span><small>Blurred</small></div>
        </div>
        <div className="progress"><i style={{ width: playing ? "42%" : "32%" }} /></div>
        <div className="track-time"><span>1:42</span><span>5:28</span></div>
        <div className="media-controls">
          <button type="button" aria-label="Shuffle"><Icon name="Shuffle" size={17} /></button>
          <button type="button" aria-label="Previous"><Icon name="SkipBack" size={18} /></button>
          <button className="play-button" type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)}>
            <Icon name={playing ? "Pause" : "Play"} size={20} />
          </button>
          <button type="button" aria-label="Next"><Icon name="SkipForward" size={18} /></button>
          <button type="button" aria-label="Volume"><Icon name="Volume2" size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function AgendaItem({ time, title, detail, duration, active }) {
  return (
    <div className="agenda-item">
      <time>{time}</time>
      <i className={active ? "agenda-dot agenda-dot--active" : "agenda-dot"} />
      <div><strong>{title}</strong><span>{detail}</span></div>
      <small>{duration}</small>
    </div>
  );
}

function PhonePanel({ phone, onOpen, busy }) {
  const ready = phone?.installed;
  return (
    <aside className="phone-panel" aria-labelledby="phone-title">
      <div className="phone-title-row">
        <div><Icon name="Smartphone" size={18} /><h2 id="phone-title">Your phone</h2></div>
        <button type="button" aria-label="Phone Link connection"><Icon name="Link2" size={20} /></button>
      </div>
      <div className="phone-device">
        <img src="/assets/phone-device.png" alt="Connected Android phone" />
        <div>
          <h3>{ready ? "Android phone" : "Connect your phone"}</h3>
          <span className={ready ? "connected" : "muted"}><i /> {phone?.detail || "Phone Link setup available"}</span>
        </div>
      </div>
      <div className="phone-section-title">
        <strong>Notifications <b>{phone?.running ? "3" : "0"}</b></strong>
        <span>Last sync: {phone?.running ? "just now" : "not connected"}</span>
      </div>
      <div className="notification-list">
        {phone?.running ? (
          <>
            <Notification icon="Mail" color="blue" label="Messages" detail="2 new messages" time="9:16 AM" />
            <Notification icon="MessageCircle" color="green" label="Phone Link" detail="Device is connected" time="8:54 AM" />
          </>
        ) : (
          <div className="phone-empty">
            <Icon name="BellOff" size={22} />
            <span>Notifications will appear after Phone Link is connected.</span>
          </div>
        )}
      </div>
      <button className="text-action phone-notification-link" type="button" onClick={onOpen} disabled={busy || !ready}>
        {ready ? "See phone notifications" : "Set up Phone Link"} <Icon name="ChevronRight" size={15} />
      </button>
      <div className="phone-actions">
        <strong>Quick actions</strong>
        <div>
          <PhoneAction icon="Send" label="Send files" onClick={onOpen} disabled={!ready || busy} />
          <PhoneAction icon="Camera" label="Take photo" onClick={onOpen} disabled={!ready || busy} />
          <PhoneAction icon="Clipboard" label="Share clipboard" onClick={onOpen} disabled={!ready || busy} />
          <PhoneAction icon="Smartphone" label="Open phone" onClick={onOpen} disabled={!ready || busy} />
        </div>
      </div>
      <button className="text-action phone-settings" type="button" onClick={onOpen} disabled={!ready || busy}>
        Phone Link settings <Icon name="ExternalLink" size={14} />
      </button>
    </aside>
  );
}

function Notification({ icon, color, label, detail, time }) {
  return (
    <div className="notification-row">
      <span className={`notification-icon notification-icon--${color}`}><Icon name={icon} size={17} /></span>
      <div><strong>{label}</strong><span>{detail}</span></div>
      <time>{time}</time>
    </div>
  );
}

function PhoneAction({ icon, label, onClick, disabled }) {
  return <button type="button" onClick={onClick} disabled={disabled}><Icon name={icon} size={18} /><span>{label}</span></button>;
}

function AssistantBar({ onSubmit, busy }) {
  const [value, setValue] = useState("");
  const submit = (event) => {
    event.preventDefault();
    const message = value.trim();
    if (!message || busy) return;
    onSubmit(message);
    setValue("");
  };
  return (
    <form className="assistant-bar" onSubmit={submit}>
      <AppLogo small />
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask your assistant anything..." aria-label="Ask your assistant" />
      <button type="button" className="voice-button" aria-label="Voice input"><Icon name="Mic" size={21} /></button>
      <button type="submit" className="send-button" aria-label="Send" disabled={busy || !value.trim()}>
        <Icon name={busy ? "LoaderCircle" : "Send"} size={24} className={busy ? "spin" : ""} />
      </button>
    </form>
  );
}

function EmptyState({ icon, title, detail }) {
  return <div className="empty-state"><Icon name={icon} size={28} /><h3>{title}</h3><p>{detail}</p></div>;
}

function ApprovalsView({ actions, loading, onApprove, onReject }) {
  return (
    <ViewShell eyebrow="Safety center" title="Approvals" detail="Review every change before it reaches your files, browser, or Windows settings.">
      <div className="view-toolbar"><span>{actions.filter((action) => action.status === "pending").length} pending</span></div>
      {loading ? <EmptyState icon="LoaderCircle" title="Loading approvals" detail="Checking the local action queue." /> : null}
      {!loading && !actions.length ? <EmptyState icon="ShieldCheck" title="Nothing needs review" detail="New assistant and system actions will appear here." /> : null}
      <div className="approval-list">
        {actions.map((action) => (
          <article className="approval-row" key={action.id}>
            <span className={`approval-kind approval-kind--${action.status}`}><Icon name={action.kind === "windows_open_uri" ? "Settings" : "Shield"} size={19} /></span>
            <div><strong>{action.reason}</strong><span>{action.kind.replaceAll("_", " ")} · {new Date(action.createdAt).toLocaleString()}</span></div>
            <span className={`state-pill state-pill--${action.status}`}>{action.status}</span>
            {action.status === "pending" ? <div className="row-actions"><button onClick={() => onReject(action.id)} type="button">Reject</button><button className="primary-button" onClick={() => onApprove(action.id)} type="button">Approve</button></div> : null}
          </article>
        ))}
      </div>
    </ViewShell>
  );
}

function MemoriesView({ memories, onCreate, onDelete }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("preference");
  const submit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    onCreate(content.trim(), category).then(() => setContent(""));
  };
  return (
    <ViewShell eyebrow="Local memory" title="Memories" detail="Everything remembered is stored locally and stays inspectable and removable.">
      <form className="memory-form" onSubmit={submit}>
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Remember a preference or project detail" aria-label="Memory content" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Memory category">
          <option value="preference">Preference</option><option value="project">Project</option><option value="fact">Fact</option><option value="instruction">Instruction</option>
        </select>
        <button className="primary-button" type="submit"><Icon name="Plus" size={17} /> Add memory</button>
      </form>
      {!memories.length ? <EmptyState icon="Bookmark" title="No memories yet" detail="Add one above or approve a memory suggested by the assistant." /> : null}
      <div className="memory-grid">
        {memories.map((memory) => <article className="memory-item" key={memory.id}><span>{memory.category}</span><p>{memory.content}</p><button type="button" onClick={() => onDelete(memory.id)} aria-label="Delete memory"><Icon name="Trash2" size={17} /></button></article>)}
      </div>
    </ViewShell>
  );
}

function ConversationsView({ conversations, selected, onSelect, onSend, busy }) {
  const [value, setValue] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim(), selected?.id);
    setValue("");
  };
  return (
    <ViewShell eyebrow="Local assistant" title="Conversations" detail="Continue a thread or start a new one with the same private local history.">
      <div className="conversation-layout">
        <aside className="conversation-list">
          <button className="new-chat" type="button" onClick={() => onSelect(null)}><Icon name="Plus" size={17} /> New conversation</button>
          {conversations.map((conversation) => <button className={selected?.id === conversation.id ? "selected" : ""} type="button" key={conversation.id} onClick={() => onSelect(conversation)}><strong>{conversation.title}</strong><span>{conversation.messageCount} messages</span></button>)}
        </aside>
        <section className="chat-panel">
          <div className="messages">
            {selected?.messages?.length ? selected.messages.map((message) => <div className={`message message--${message.role}`} key={message.id}><span>{message.role === "user" ? "You" : "Live Desktop"}</span><p>{message.content}</p></div>) : <EmptyState icon="MessageCircle" title="Start a conversation" detail="Ask about your files, system, or current work." />}
          </div>
          <form className="chat-compose" onSubmit={submit}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Message your assistant" /><button className="primary-button" type="submit" disabled={busy}><Icon name={busy ? "LoaderCircle" : "Send"} size={17} className={busy ? "spin" : ""} /> Send</button></form>
        </section>
      </div>
    </ViewShell>
  );
}

function ViewShell({ eyebrow, title, detail, children }) {
  return <main className="view-shell"><header><span>{eyebrow}</span><h1>{title}</h1><p>{detail}</p></header>{children}</main>;
}

export function App() {
  const [activeView, setActiveView] = useState("home");
  const [system, setSystem] = useState(FALLBACK_SYSTEM);
  const [apps, setApps] = useState([]);
  const [phone, setPhone] = useState({ installed: false, running: false, detail: "Checking Phone Link" });
  const [health, setHealth] = useState({ connected: false, configured: false });
  const [actions, setActions] = useState([]);
  const [memories, setMemories] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [pendingControl, setPendingControl] = useState(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = "neutral") => {
    setToast({ message, tone });
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadDashboard = useCallback(async () => {
    const results = await Promise.allSettled([
      api("/health"),
      api("/api/system"),
      api("/api/system/apps"),
      api("/api/integrations/phone-link"),
      api("/api/actions"),
      api("/api/memories"),
      api("/api/conversations"),
    ]);
    if (results[0].status === "fulfilled") setHealth({ connected: true, configured: Boolean(results[0].value.openAiConfigured) });
    else setHealth({ connected: false, configured: false });
    if (results[1].status === "fulfilled") setSystem(results[1].value);
    if (results[2].status === "fulfilled") setApps(results[2].value);
    if (results[3].status === "fulfilled") setPhone(results[3].value);
    if (results[4].status === "fulfilled") setActions(results[4].value);
    if (results[5].status === "fulfilled") setMemories(results[5].value);
    if (results[6].status === "fulfilled") setConversations(results[6].value);
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(loadDashboard, 15000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  const controls = useMemo(() => {
    const byId = new Map(system.controls.map((control) => [control.id, control]));
    return CONTROL_ORDER.map((id) => ({ ...CONTROL_META[id], ...byId.get(id), id }));
  }, [system]);

  const pendingCount = actions.filter((action) => action.status === "pending").length;

  const queueControl = async (id) => {
    setPendingControl(id);
    try {
      await api(`/api/system/controls/${id}`, { method: "POST" });
      notify(`${CONTROL_META[id].label} settings added to approvals.`, "success");
      await loadDashboard();
      setActiveView("approvals");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPendingControl(null);
    }
  };

  const openPhone = async () => {
    setPendingControl("phone");
    try {
      await api("/api/integrations/phone-link/open", { method: "POST" });
      notify("Phone Link added to approvals.", "success");
      await loadDashboard();
      setActiveView("approvals");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPendingControl(null);
    }
  };

  const updateAction = async (id, verb) => {
    try {
      const updated = await api(`/api/actions/${id}/${verb}`, { method: "POST" });
      notify(verb === "approve" ? (updated.status === "completed" ? "Action completed." : "Action could not complete.") : "Action rejected.", updated.status === "failed" ? "error" : "success");
      await loadDashboard();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const createMemory = async (content, category) => {
    try {
      await api("/api/memories", { method: "POST", body: JSON.stringify({ content, category }) });
      notify("Memory saved locally.", "success");
      await loadDashboard();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const deleteMemory = async (id) => {
    try {
      await api(`/api/memories/${id}`, { method: "DELETE" });
      notify("Memory forgotten.", "success");
      await loadDashboard();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const selectConversation = async (summary) => {
    if (!summary) {
      setSelectedConversation(null);
      return;
    }
    try {
      setSelectedConversation(await api(`/api/conversations/${summary.id}`));
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const sendMessage = async (message, conversationId = selectedConversation?.id) => {
    setAssistantBusy(true);
    try {
      const result = await api("/api/chat", { method: "POST", body: JSON.stringify({ message, conversationId }) });
      setActiveView("conversations");
      await loadDashboard();
      await selectConversation({ id: result.conversationId });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setAssistantBusy(false);
    }
  };

  return (
    <div className="desktop-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveView("home")}><AppLogo /><span><strong>Live Desktop</strong><small>Your local Windows assistant</small></span></button>
        <nav aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => <button type="button" key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => setActiveView(item.id)}><Icon name={item.icon} size={19} />{item.label}{item.id === "approvals" && pendingCount ? <b>{pendingCount}</b> : null}</button>)}
        </nav>
        <div className="topbar-actions">
          <span className="local-status"><i className={health.connected ? "" : "offline"} /><strong>{health.connected ? "Local mode" : "Preview mode"}</strong><small>{health.connected ? "All data stays on this PC" : "Backend is offline"}</small></span>
          <button type="button" className="settings-button" onClick={() => { setActiveView("home"); window.setTimeout(() => document.getElementById("system-controls")?.focus(), 50); }}><Icon name="Settings" size={20} /><span>Settings</span></button>
          <img src="/assets/user-avatar.png" alt="Local user profile" />
        </div>
      </header>

      {activeView === "home" ? (
        <main className="home-view">
          <section id="system-controls" className="control-strip" aria-label="System controls" tabIndex={-1}>
            {controls.map((control) => (
              <div className="control-item" key={control.id}>
                <Icon name={control.icon} size={26} className={control.enabled ? "control-icon--active" : ""} />
                <div><strong>{control.label}</strong><span>{control.detail === "Opens Windows settings after approval" ? CONTROL_META[control.id].detail : control.detail}</span></div>
                <Toggle enabled={control.enabled} pending={pendingControl === control.id} disabled={!control.available} onClick={() => queueControl(control.id)} label={control.label} />
              </div>
            ))}
          </section>
          <button className="capability-notice" type="button" onClick={() => setActiveView("approvals")}>
            <Icon name="Info" size={18} /><span>System controls open the matching Windows setting after your approval.</span><b>Review device control</b><Icon name="ChevronRight" size={16} />
          </button>
          <div className="dashboard-grid">
            <section className="today-panel">
              <header><h1>Today on your PC</h1><p>Sunday, August 2, 2026</p></header>
              <div className="today-columns">
                <SystemHealth system={system} connected={health.connected} configured={health.configured} />
                <RecentApps apps={apps} />
                <CalendarAndMedia />
              </div>
            </section>
            <PhonePanel phone={phone} onOpen={openPhone} busy={pendingControl === "phone"} />
          </div>
          <AssistantBar onSubmit={sendMessage} busy={assistantBusy} />
          <p className="privacy-note">Local first. Private by design.</p>
        </main>
      ) : null}

      {activeView === "approvals" ? <ApprovalsView actions={actions} loading={false} onApprove={(id) => updateAction(id, "approve")} onReject={(id) => updateAction(id, "reject")} /> : null}
      {activeView === "memories" ? <MemoriesView memories={memories} onCreate={createMemory} onDelete={deleteMemory} /> : null}
      {activeView === "conversations" ? <ConversationsView conversations={conversations} selected={selectedConversation} onSelect={selectConversation} onSend={sendMessage} busy={assistantBusy} /> : null}

      {toast ? <div className={`toast toast--${toast.tone}`} role="status"><Icon name={toast.tone === "error" ? "CircleAlert" : "CircleCheck"} size={18} />{toast.message}<button type="button" onClick={() => setToast(null)} aria-label="Dismiss"><Icon name="X" size={16} /></button></div> : null}
    </div>
  );
}
