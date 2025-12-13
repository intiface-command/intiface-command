import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "intiface-command";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const LOG_PREFIX = "[Intiface Command]";

const defaultSettings = {
    allTalkBaseUrl: "http://localhost:7851",
    voiceModel: "",
    ttsChunkCharLimit: 1500,
    silenceMs: 180,
    baseWpm: 180,
    playbackSpeed: 1.0,
    outputVolume: 1.0,
    randomMinValues: 4,
    randomMaxValues: 10,
    randomMinDuration: 1,
    randomMaxDuration: 15,
    randomMinIntensity: 0.1,
    randomMaxIntensity: 1.0,
};

const SUPPORTED_COMMANDS = new Set([
    "vibrate",
    "oscillate",
    "linear",
    "rotate",
    "scalar",
    "stop",
    "pattern",
]);


/* ================================================================================================
   Normalize AllTalk's variable voice response formats
================================================================================================ */
function normalizeAllTalkVoices(data) {
    const out = [];
    if (!data) return out;

    const push = v => {
        if (!v) return;
        if (typeof v === "string") {
            out.push({ id: v, label: v });
            return;
        }
        const id = v.id || v.name || v.voice || v.model;
        const label = v.display_name || v.name || id;
        if (id) out.push({ id, label });
    };

    if (Array.isArray(data.voices)) {
        data.voices.forEach(push);
    } else if (Array.isArray(data)) {
        data.forEach(push);
    } else if (typeof data === "object") {
        Object.values(data).forEach(push);
    }

    return out;
}

/* ================================================================================================
   Status UI helpers
================================================================================================ */
function updateIntifaceStatus(isConnected) {
    const el = document.getElementById("ic_intiface_status");
    if (!el) return;

    if (isConnected) {
        el.textContent = "Ready";
        el.classList.remove("error");
        el.classList.add("ready");
    } else {
        el.textContent = "Not Connected";
        el.classList.remove("ready");
        el.classList.add("error");
    }
}

async function updateAllTalkStatus() {
    const statusEl = document.getElementById("ic_alltalk_status");
    if (!statusEl) return;

    statusEl.textContent = "Checking...";
    statusEl.className = "";

    const base = extension_settings?.[extensionName]?.allTalkBaseUrl;
    if (!base) {
        statusEl.textContent = "Not Connected";
        statusEl.classList.add("error");
        return;
    }

    const url = base.replace(/\/+$/, "") + "/api/voices";

    try {
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) throw new Error(String(res.status));

        statusEl.textContent = "Ready";
        statusEl.classList.add("ready");
    } catch {
        statusEl.textContent = "Not Connected";
        statusEl.classList.add("error");
    }
}

async function refreshVoicesFromAllTalk() {
    const settings = extension_settings[extensionName] || {};
    const baseUrl = (settings.allTalkBaseUrl || defaultSettings.allTalkBaseUrl).replace(/\/+$/, "");

    const select = document.getElementById("ic_voice_model");
    if (!select) return;

    select.innerHTML = `<option value="">Loading voices...</option>`;

    try {
        const res = await fetch(`${baseUrl}/api/voices`);
        if (!res.ok) {
            console.warn(LOG_PREFIX, "Voice list request failed:", res.status);
            select.innerHTML = `<option value="">(Failed to load voices)</option>`;
            return;
        }

        const data = await res.json().catch(() => null);
        const voices = normalizeAllTalkVoices(data);

        if (!voices.length) {
            console.warn(LOG_PREFIX, "No voices returned by AllTalk");
            select.innerHTML = `<option value="">(No voices found)</option>`;
            return;
        }

        select.innerHTML = "";
        for (const v of voices) {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = v.label || v.id;
            select.appendChild(opt);
        }

        console.log(`${LOG_PREFIX} Loaded ${voices.length} voices from AllTalk`);

        const current = settings.voiceModel;
        if (current && voices.some(v => v.id === current)) {
            select.value = current;
        }
    } catch (err) {
        console.warn(LOG_PREFIX, "Error loading voices:", err);
        select.innerHTML = `<option value="">(Error loading voices)</option>`;
    }
}

/* ================================================================================================
   Settings load/bind
================================================================================================ */
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const settings = extension_settings[extensionName];

    for (const k in defaultSettings) {
        if (settings[k] === undefined) settings[k] = defaultSettings[k];
    }

    $("#ic_alltalk_base_url").val(settings.allTalkBaseUrl);
    $("#ic_chunk_size").val(settings.ttsChunkCharLimit);
    $("#ic_silence_ms").val(settings.silenceMs);
    $("#ic_base_wpm").val(settings.baseWpm);
    $("#ic_playback_speed").val(settings.playbackSpeed);
    $("#ic_playback_speed_value").val(settings.playbackSpeed);
    $("#ic_output_volume").val(settings.outputVolume);
    $("#ic_output_volume_value").val(settings.outputVolume);
    $("#ic_rand_min_values").val(settings.randomMinValues);
    $("#ic_rand_max_values").val(settings.randomMaxValues);
    $("#ic_rand_min_duration").val(settings.randomMinDuration);
    $("#ic_rand_max_duration").val(settings.randomMaxDuration);
    $("#ic_rand_min_intensity").val(settings.randomMinIntensity);
    $("#ic_rand_max_intensity").val(settings.randomMaxIntensity);


    await refreshVoicesFromAllTalk();
    await updateAllTalkStatus();
}

function bindEvents() {
    $("#ic_alltalk_base_url").on("input", function () {
        extension_settings[extensionName].allTalkBaseUrl = $(this).val();
        saveSettingsDebounced();
    });

    $("#ic_voice_model").on("change", function () {
        extension_settings[extensionName].voiceModel = this.value;
        saveSettingsDebounced();
    });

    $("#ic_chunk_size").on("input", function () {
        extension_settings[extensionName].ttsChunkCharLimit = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_silence_ms").on("input", function () {
        extension_settings[extensionName].silenceMs = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_base_wpm").on("input", function () {
        extension_settings[extensionName].baseWpm = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_refresh_voices").on("click", function (e) {
        e.preventDefault();
        refreshVoicesFromAllTalk();
        updateAllTalkStatus();
    });

    $("#ic_playback_speed").on("input", function () {
        const v = Number(this.value);
        $("#ic_playback_speed_value").val(v);
        extension_settings[extensionName].playbackSpeed = v;
        if (hasAudioPlayer()) AudioState.player.playbackRate = v;
        saveSettingsDebounced();
    });

    $("#ic_playback_speed_value").on("input", function () {
        const v = Number(this.value);
        $("#ic_playback_speed").val(v);
        extension_settings[extensionName].playbackSpeed = v;
        if (hasAudioPlayer()) AudioState.player.playbackRate = v;
        saveSettingsDebounced();
    });

    $("#ic_output_volume").on("input", function () {
        const v = Number(this.value);
        $("#ic_output_volume_value").val(v);
        extension_settings[extensionName].outputVolume = v;
        if (hasAudioPlayer()) AudioState.player.volume = v;
        saveSettingsDebounced();
    });

    $("#ic_output_volume_value").on("input", function () {
        const v = Number(this.value);
        $("#ic_output_volume").val(v);
        extension_settings[extensionName].outputVolume = v;
        if (hasAudioPlayer()) AudioState.player.volume = v;
        saveSettingsDebounced();
    });

    $("#ic_rand_min_values").on("input", function () {
        extension_settings[extensionName].randomMinValues = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_rand_max_values").on("input", function () {
        extension_settings[extensionName].randomMaxValues = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_rand_min_duration").on("input", function () {
        extension_settings[extensionName].randomMinDuration = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_rand_max_duration").on("input", function () {
        extension_settings[extensionName].randomMaxDuration = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_rand_min_intensity").on("input", function () {
        extension_settings[extensionName].randomMinIntensity = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_rand_max_intensity").on("input", function () {
        extension_settings[extensionName].randomMaxIntensity = Number(this.value);
        saveSettingsDebounced();
    });

    $("#ic_pause_audio").on("click", function (e) {
        e.preventDefault();
        pauseTTSPlayback();
    });

    $("#ic_resume_audio").on("click", function (e) {
        e.preventDefault();
        resumeTTSPlayback();
    });

    $("#ic_stop_audio").on("click", function (e) {
        e.preventDefault();
        stopTTSPlayback();
    });

}

/* ================================================================================================
   INIT — Load settings.html + initialize everything
================================================================================================ */
jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $("#extensions_settings").append(settingsHtml);

    await loadSettings();
    bindEvents();

    console.log(`${LOG_PREFIX} Settings UI loaded and initialized.`);
});

/* ================================================================================================
   CONFIG ACCESSOR
================================================================================================ */
const IC = () => {
    const s = extension_settings?.[extensionName];
    return s ? { ...defaultSettings, ...s } : { ...defaultSettings };
};

/* ================================================================================================
   STATE WRAPPERS
================================================================================================ */

const Intiface = {
    SERVER_ADDRESS: "ws://localhost:12345",
    socket: null,
    messageId: 1,
    reconnectTimer: null,


    defaultDeviceIndex: null,
    deviceCapabilities: {
        canVibrate: false,
        canStopDevice: false,
        canLinear: false,
        canRotate: false,
        canScalarCmd: false,
    },

    connect() {
        if (this.socket &&
            (this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING)) return;


        console.log(`${LOG_PREFIX} Connecting to Intiface…`);
        this.socket = new WebSocket(this.SERVER_ADDRESS);

        this.socket.onopen = () => {
            updateIntifaceStatus(true);
            this.send({
                RequestServerInfo: {
                    Id: this.messageId++,
                    ClientName: "SillyTavern Intiface Command",
                    MessageVersion: 3,
                }
            });
        };

        this.socket.onclose = () => {
            updateIntifaceStatus(false);

            if (this.reconnectTimer) return;

            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, 2000);
        };


        this.socket.onerror = (err) => {
            updateIntifaceStatus(false);
            console.error(`${LOG_PREFIX} WS error:`, err);
        };

        this.socket.onmessage = (evt) => {
            let messages;
            try { messages = JSON.parse(evt.data); }
            catch { return; }
            messages.forEach((m) => this.handleMessage(m));
        };
    },

    send(msgObj) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify([msgObj]));
    },

    handleMessage(msg) {
        if (msg.ServerInfo) {
            this.send({ StartScanning: { Id: this.messageId++ } });
            this.send({ RequestDeviceList: { Id: this.messageId++ } });
            return;
        }

        if (msg.DeviceList) {
            const devices = msg.DeviceList.Devices || [];

            const d = devices.length === 1
                ? devices[0]
                : devices.find(dev => !dev.IsSensor) || devices[0];


            if (!d) {
                this.defaultDeviceIndex = null;
                this.deviceCapabilities = {
                    canVibrate: false,
                    canStopDevice: false,
                    canLinear: false,
                    canRotate: false,
                    canScalarCmd: false,
                };
                return;
            }

            this.defaultDeviceIndex = d.DeviceIndex;

            const rawMsgs = d.DeviceMessages || [];
            let msgNames = [];
            if (Array.isArray(rawMsgs)) {
                msgNames = rawMsgs.flatMap(m => {
                    if (typeof m === "string") return [m];
                    if (m && typeof m === "object") return Object.keys(m);
                    return [];
                });
            } else if (rawMsgs && typeof rawMsgs === "object") {
                msgNames = Object.keys(rawMsgs);
            }


            this.deviceCapabilities = {
                canVibrate: msgNames.some(n => /Vibrate/i.test(n)),
                canLinear: msgNames.some(n => /Linear/i.test(n)),
                canRotate: msgNames.some(n => /Rotate/i.test(n)),
                canStopDevice: msgNames.some(n => /StopDevice/i.test(n)),
                canScalarCmd: msgNames.some(n => /Scalar/i.test(n)),
            };



            console.log(`${LOG_PREFIX} Device capabilities:`, this.deviceCapabilities);
            return;
        }

        if (msg.Error) console.error(`${LOG_PREFIX} Intiface Error:`, msg.Error);
    }
};

function warnCapabilityMissing(actionName) {
    const msg = `Compatible device not found for [${actionName}], command ignored.`;
    console.warn(LOG_PREFIX, msg);
    if (window.toastr) window.toastr.error(msg, "Intiface Command");
}

function warnUnknownCommand(commandName) {
    const msg = `Command not recognized: [${commandName}]`;
    console.warn(LOG_PREFIX, msg);
    if (window.toastr) window.toastr.error(msg, "Intiface Command");
}

const ActuatorState = {
    protocol: null,
    scalarType: null, // ← add this
};


const DeviceCommands = {
    clamp01(x) { return Math.max(0, Math.min(1, x)); },

    applyContinuous(level) {
        if (Intiface.defaultDeviceIndex == null) return;
        const v = this.clamp01(level);

        if (ActuatorState.protocol === "vibrate" || !Intiface.deviceCapabilities.canScalarCmd) {
            return this.vibrate(v);
        }

        return this.oscillate(v);
    },

    vibrate(level) {
        if (Intiface.defaultDeviceIndex == null) return;

        ActuatorState.protocol = "vibrate";

        Intiface.send({
            VibrateCmd: {
                Id: Intiface.messageId++,
                DeviceIndex: Intiface.defaultDeviceIndex,
                Speeds: [{
                    Index: 0,
                    Speed: this.clamp01(level),
                }],
            }
        });
    },

    oscillate(level, actuatorIndex = 0) {
        if (Intiface.defaultDeviceIndex == null) return;
        if (!Intiface.deviceCapabilities.canScalarCmd) {
            return warnCapabilityMissing("oscillate");
        }

        ActuatorState.protocol = "scalar";
        ActuatorState.scalarType = "Oscillate";

        Intiface.send({
            ScalarCmd: {
                Id: Intiface.messageId++,
                DeviceIndex: Intiface.defaultDeviceIndex,
                Scalars: [{
                    Index: actuatorIndex,
                    Scalar: this.clamp01(level),
                    ActuatorType: "Oscillate",
                }],
            }
        });
    },

    linear(position, duration = 1.0) {
        if (Intiface.defaultDeviceIndex == null) return;
        if (!Intiface.deviceCapabilities.canLinear) return warnCapabilityMissing("linear");
        Intiface.send({
            LinearCmd: {
                Id: Intiface.messageId++,
                DeviceIndex: Intiface.defaultDeviceIndex,
                Vectors: [{
                    Index: 0,
                    Position: this.clamp01(position),
                    Duration: Math.max(0, duration * 1000),
                }],
            }
        });
    },

    rotate(speed, clockwise = true) {
        if (Intiface.defaultDeviceIndex == null) return;
        if (!Intiface.deviceCapabilities.canRotate) return warnCapabilityMissing("rotate");
        Intiface.send({
            RotateCmd: {
                Id: Intiface.messageId++,
                DeviceIndex: Intiface.defaultDeviceIndex,
                Rotations: [{
                    Index: 0,
                    Speed: this.clamp01(speed),
                    Clockwise: !!clockwise,
                }],
            }
        });
    },

    scalar(level, actuatorIndex = 0) {
        if (Intiface.defaultDeviceIndex == null) return;
        if (!Intiface.deviceCapabilities.canScalarCmd) return warnCapabilityMissing("scalar");
        Intiface.send({
            ScalarCmd: {
                Id: Intiface.messageId++,
                DeviceIndex: Intiface.defaultDeviceIndex,
                Scalars: [{
                    Index: actuatorIndex,
                    Scalar: this.clamp01(level),
                }],
            }
        });
    },

    stopAll() {
        if (Intiface.defaultDeviceIndex == null) return;

        if (Intiface.deviceCapabilities.canScalarCmd) {
            const scalar = {
                Index: 0,
                Scalar: 0,
            };

            if (ActuatorState.scalarType) {
                scalar.ActuatorType = ActuatorState.scalarType;
            }

            Intiface.send({
                ScalarCmd: {
                    Id: Intiface.messageId++,
                    DeviceIndex: Intiface.defaultDeviceIndex,
                    Scalars: [scalar],
                }
            });
        }


        if (Intiface.deviceCapabilities.canVibrate) {
            Intiface.send({
                VibrateCmd: {
                    Id: Intiface.messageId++,
                    DeviceIndex: Intiface.defaultDeviceIndex,
                    Speeds: [{
                        Index: 0,
                        Speed: 0,
                    }],
                }
            });
        }

        if (Intiface.deviceCapabilities.canStopDevice) {
            Intiface.send({
                StopDeviceCmd: {
                    Id: Intiface.messageId++,
                    DeviceIndex: Intiface.defaultDeviceIndex,
                }
            });
        }

        ActuatorState.protocol = null;
        ActuatorState.scalarType = null;
    },
};

const PatternEngine = {
    activePattern: null,
    activeTimer: null,

    stop() {
        if (this.activePattern) clearInterval(this.activePattern);
        if (this.activeTimer) clearTimeout(this.activeTimer);
        this.activePattern = null;
        this.activeTimer = null;
    },

    generateRampSegment(from, to) {
        const diff = Math.abs(to - from);
        const steps = diff <= 0.2 ? 4 : diff <= 0.5 ? 8 : 16;
        return Array.from({ length: steps }, (_, i) =>
            from + (to - from) * ((i + 1) / steps)
        );
    },

    smoothPatternSteps(orig) {
        if (!orig?.length) return [];
        const out = [orig[0]];
        for (let i = 0; i < orig.length - 1; i++) {
            out.push(...this.generateRampSegment(orig[i], orig[i + 1]));
        }
        return out;
    },

    startPattern(steps, durationSec, done) {
        this.stop();
        if (!steps.length) return done();

        const stepMs = (durationSec * 1000) / steps.length;
        let i = 0;

        const tick = () => {
            if (i >= steps.length) {
                this.stop();

                DeviceCommands.stopAll();

                done();
                return;
            }

            DeviceCommands.applyContinuous(steps[i]);
            i++;
        };

        tick();
        this.activePattern = setInterval(tick, stepMs);
    }
};

const CommandQueue = {
    queue: [],
    running: false,

    enqueue(cmd) {
        this.queue.push({ ...cmd, _gen: commandGeneration });
        this.process();
    },

    process() {
        if (this.running) return;

        while (this.queue.length && this.queue[0]?._gen !== commandGeneration) {
            this.queue.shift();
        }

        if (!this.queue.length) return;

        this.running = true;
        const cmd = this.queue.shift();

        runCommand(cmd, () => {
            this.running = false;
            this.process();
        });
    },

    clear() {
        this.queue = [];
        this.running = false;
    }
};


const MessageState = {
    commandCache: new Map(),
    lastAssistantMsgInfo: null,
};

const AudioState = {
    player: new Audio(),
    currentAudioCommands: [],
    ttsMessageTimer: null,
    lastObjectUrl: null,
};

let commandGeneration = 0;

AudioState.player.preload = "auto";

function fullStop() {
    commandGeneration++;
    PatternEngine.stop();
    CommandQueue.clear();
    DeviceCommands.stopAll();
}


function hasAudioPlayer() {
    return AudioState?.player instanceof HTMLAudioElement;
}

/* ================================================================================================
   EXECUTE COMMAND
================================================================================================ */
function runCommand(cmd, done) {
    const {
        command,
        rawCommandKey,
        value,
        duration,
        pattern,
        values,
        index,
    } = cmd;

    if (!command && rawCommandKey && !pattern) {
        warnUnknownCommand(rawCommandKey);
        return done();
    }


    if (pattern !== "custom") {
        PatternEngine.stop();
    }

    if (command === "stop") {
        fullStop();
        return done();
    }

    if (pattern === "custom") {
        return PatternEngine.startPattern(
            PatternEngine.smoothPatternSteps(values),
            duration || 1,
            done
        );
    }

    const finishAfter = (seconds) => {
        if (seconds > 0) {
            PatternEngine.activeTimer = setTimeout(() => {
                DeviceCommands.stopAll();
                done();
            }, seconds * 1000);
        } else {
            done();
        }
    };

    if (command === "vibrate") {
        DeviceCommands.vibrate(value);
        finishAfter(duration);
        return;
    }

    if (command === "oscillate") {
        DeviceCommands.oscillate(value);
        finishAfter(duration);
        return;
    }

    if (command === "linear") {
        DeviceCommands.linear(value, duration);
        finishAfter(duration);
        return;
    }

    if (command === "rotate") {
        DeviceCommands.rotate(value);
        finishAfter(duration);
        return;
    }

    if (command === "scalar") {
        DeviceCommands.scalar(value, index || 0);
        finishAfter(duration);
        return;
    }

    done();
}

/* ================================================================================================
   COMMAND PARSING
================================================================================================ */
function parseCommandBlock(content) {
    const pairs = content.split(";").map(s => s.trim()).filter(Boolean);

    let command = null;
    let rawCommandKey = null;
    let value = null;
    let duration = null;
    let pattern = null;
    let values = [];
    let index = null;

    if (pairs.length) {
        const [firstKey] = pairs[0].split(":").map(s => s.trim());
        rawCommandKey = firstKey?.toLowerCase() || null;

        if (
            !SUPPORTED_COMMANDS.has(rawCommandKey) &&
            rawCommandKey !== "pattern"
        ) {
            return {
                command: null,
                rawCommandKey,
                value: null,
                duration: null,
                pattern: null,
                values: [],
                index: null,
            };
        }
    }

    for (const p of pairs) {
        const [k, v] = p.split(":").map(s => s.trim());
        if (!k) continue;

        const key = k.toLowerCase();

        if (key === "vibrate") { command = "vibrate"; value = parseFloat(v); }
        else if (key === "oscillate") { command = "oscillate"; value = parseFloat(v); }
        else if (key === "linear") { command = "linear"; value = parseFloat(v); }
        else if (key === "rotate") { command = "rotate"; value = parseFloat(v); }
        else if (key === "scalar") { command = "scalar"; value = parseFloat(v); }
        else if (key === "stop") { command = "stop"; }
        else if (key === "duration") { duration = parseFloat(v); }
        else if (key === "index") { index = parseInt(v, 10); }
        else if (key === "pattern") { pattern = (v || "").toLowerCase(); }
        else if (key === "values") {
            if ((v || "").toLowerCase() === "random") {
                const s = IC();

                const minVals = Math.max(1, s.randomMinValues);
                const maxVals = Math.max(minVals, s.randomMaxValues);

                const minDur = Math.max(1, s.randomMinDuration);
                const maxDur = Math.max(minDur, s.randomMaxDuration);

                const minInt = Math.max(0, Math.min(1, s.randomMinIntensity));
                const maxInt = Math.max(minInt, Math.min(1, s.randomMaxIntensity));

                const count =
                    Math.floor(Math.random() * (maxVals - minVals + 1)) + minVals;

                values = Array.from({ length: count }, () =>
                    +(
                        Math.random() * (maxInt - minInt) +
                        minInt
                    ).toFixed(2)
                );

                duration ??=
                    Math.floor(Math.random() * (maxDur - minDur + 1)) + minDur;

                console.log(
                    `{pattern:custom; values:${values.join(",")}; duration:${duration}}`
                );
            } else {
                values = (v || "")
                    .split(",")
                    .map(n => parseFloat(n.trim()))
                    .filter(n => !isNaN(n));
            }
        }

    }

    return { command, rawCommandKey, value, duration, pattern, values, index };
}

function extractCommandsWithOffsets(text) {
    const out = [];
    const regex = /\{([^}]+)\}/g;
    let m;

    while ((m = regex.exec(text))) {
        out.push({ ...parseCommandBlock(m[1]), charIndex: m.index });
    }

    return out;
}


/* ================================================================================================
   SPEECH TIMING
================================================================================================ */
function stripCommandBlocksForSpeech(text) {
    return text
        .replace(/<command>[\s\S]*?<\/command>/gi, "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function locateWordIndexFromFullText(full, charIndex) {
    let inCmd = false, inTag = false;
    let wordIndex = 0;
    let cur = "";

    for (let i = 0; i < full.length && i < charIndex; i++) {
        const ch = full[i];

        if (ch === "<") { inTag = true; if (cur) wordIndex++, cur = ""; continue; }
        if (ch === ">") { inTag = false; continue; }
        if (inTag) continue;

        if (ch === "{") { inCmd = true; if (cur) wordIndex++, cur = ""; continue; }
        if (ch === "}") { inCmd = false; continue; }
        if (inCmd) continue;

        if (/\s/.test(ch)) {
            if (cur) wordIndex++, cur = "";
        } else cur += ch;
    }

    if (cur) wordIndex++;
    return Math.max(0, wordIndex - 1);
}

function estimateSpeechTimeForText(spokenText) {
    const s = IC();
    const BASE_WPM = s.baseWpm;

    const words = spokenText.trim().split(/\s+/).filter(Boolean);
    const baseWPS = BASE_WPM / 60;

    let time = 0;
    const timestamps = [];

    for (const w of words) {
        let slow = 0;
        if (/[.,!?]/.test(w)) slow += 0.25;
        if (/[:;]$/.test(w)) slow += 0.15;

        const vowelCount = w.replace(/[^aeiouy]/gi, "").length || 1;
        const syllables = Math.min(5, Math.max(1, vowelCount));
        const wTime = (syllables / 3) / baseWPS;

        timestamps.push({ start: time });
        time += wTime + slow;
    }

    return { totalTime: time, timestamps };
}

/* =================================================================================================
   WAV HANDLING
================================================================================================ */
function parseWavToPCM(arr) {
    const dv = new DataView(arr);

    let offset = 12;
    let numChannels = 1, sampleRate = 22050, bits = 16;
    let dataStart = 0, dataSize = 0;

    while (offset < dv.byteLength) {
        const id = String.fromCharCode(
            dv.getUint8(offset),
            dv.getUint8(offset + 1),
            dv.getUint8(offset + 2),
            dv.getUint8(offset + 3)
        );

        const size = dv.getUint32(offset + 4, true);
        offset += 8;

        if (id === "fmt ") {
            if (dv.getUint16(offset, true) !== 1) {
                throw new Error("Only PCM WAV supported");
            }
            numChannels = dv.getUint16(offset + 2, true);
            sampleRate = dv.getUint32(offset + 4, true);
            bits = dv.getUint16(offset + 14, true);
        } else if (id === "data") {
            dataStart = offset;
            dataSize = size;
            break;
        }

        offset += size;
    }

    return {
        numChannels,
        sampleRate,
        bitsPerSample: bits,
        samples: new Int16Array(arr, dataStart, dataSize / 2),
    };
}

function buildCombinedWavBlobFromChunks(parsed) {
    const s = IC();
    const silenceMs = s.silenceMs;

    const { numChannels, sampleRate, bitsPerSample } = parsed[0];

    const bytesPerSample = 2;
    const silenceSamples = Math.floor(sampleRate * (silenceMs / 1000));

    let totalSamplesOriginal = parsed.reduce((a, b) => a + b.samples.length, 0);
    const totalSamples = silenceSamples + totalSamplesOriginal;
    const dataBytes = totalSamples * bytesPerSample;

    const buf = new ArrayBuffer(44 + dataBytes);
    const dv = new DataView(buf);
    const out = new Int16Array(buf, 44, totalSamples);

    const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
            dv.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeStr(0, "RIFF");
    dv.setUint32(4, 36 + dataBytes, true);
    writeStr(8, "WAVE");

    writeStr(12, "fmt ");
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, numChannels, true);
    dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    dv.setUint16(32, numChannels * bytesPerSample, true);
    dv.setUint16(34, bitsPerSample, true);

    writeStr(36, "data");
    dv.setUint32(40, dataBytes, true);

    let o = silenceSamples;
    for (const ch of parsed) {
        if (
            ch.sampleRate !== sampleRate ||
            ch.numChannels !== numChannels ||
            ch.bitsPerSample !== bitsPerSample
        ) {
            console.warn(LOG_PREFIX, "Skipping WAV chunk with mismatched format");
            continue;
        }

        out.set(ch.samples, o);
        o += ch.samples.length;
    }


    return new Blob([buf], { type: "audio/wav" });
}

async function buildCombinedWavFromUrls(urls) {
    const parsed = [];

    for (const u of urls) {
        try {
            const arr = await (await fetch(u)).arrayBuffer();
            parsed.push(parseWavToPCM(arr));
        } catch (err) {
            console.error(`${LOG_PREFIX} WAV fetch error:`, u, err);
        }
    }

    if (!parsed.length) return null;
    return URL.createObjectURL(buildCombinedWavBlobFromChunks(parsed));
}


/* =================================================================================================
   AUDIO-BASED COMMAND SYNC
================================================================================================ */
function handleTTSAudioForMessage(fullText, url) {
    if (!url || !fullText) return;

    commandGeneration++;

    const spoken = stripCommandBlocksForSpeech(fullText);
    const { totalTime, timestamps } = estimateSpeechTimeForText(spoken);

    const cached = MessageState.commandCache.get(MessageState.lastAssistantMsgInfo?.id);
    const cmds = cached ?? extractCommandsWithOffsets(fullText);

    if (!cmds.length) return;

    AudioState.currentAudioCommands = cmds.map((cmd) => {
        const idx = locateWordIndexFromFullText(fullText, cmd.charIndex);
        const ts = timestamps[Math.min(idx, timestamps.length - 1)];

        return {
            ...cmd,
            wordIndex: idx,
            normTime: ts.start / (totalTime || 1),
            estimatedTime: null,
            _fired: false,
        };
    });

    try {
        AudioState.player.pause();
        AudioState.player.currentTime = 0;
    } catch { }


    if (AudioState.lastObjectUrl) {
        URL.revokeObjectURL(AudioState.lastObjectUrl);
    }
    AudioState.lastObjectUrl = url;
    AudioState.player.src = url;


    const s = IC();
    AudioState.player.volume = s.outputVolume ?? 1.0;
    AudioState.player.playbackRate = s.playbackSpeed ?? 1.0;

    AudioState.player.onloadstart = () => {
        AudioState.currentAudioCommands.forEach((c) => (c._fired = false));
    };

    AudioState.player.onloadeddata = () => {
        const dur = AudioState.player.duration;

        if (isFinite(dur) && dur > 0) {
            AudioState.currentAudioCommands.forEach(
                (c) => (c.estimatedTime = c.normTime * dur)
            );
        }

        try { AudioState.player.currentTime = 0; } catch { }

        requestAnimationFrame(() => {
            AudioState.player.play().catch((err) =>
                console.error(`${LOG_PREFIX} Audio play error:`, err)
            );
        });
    };

    AudioState.player.ontimeupdate = () => {
        const t = AudioState.player.currentTime;

        for (const cmd of AudioState.currentAudioCommands) {
            if (!cmd._fired && cmd.estimatedTime != null && t >= cmd.estimatedTime) {
                cmd._fired = true;
                const { charIndex, normTime, ...queueCmd } = cmd;
                CommandQueue.enqueue(queueCmd);
            }
        }
    };
}

function stopTTSPlayback() {
    try {
        AudioState.player.pause();
        AudioState.player.currentTime = 0;
    } catch { }
    fullStop();
    console.log(`${LOG_PREFIX} Audio + pattern stopped.`);
}

function pauseTTSPlayback() {
    try { AudioState.player.pause(); } catch { }
}

function resumeTTSPlayback() {
    try { AudioState.player.play().catch(() => { }); } catch { }
}

/* =================================================================================================
   CHUNKING + TTS GENERATION
================================================================================================ */
function chunkTextForTTS(text, maxLen) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];

    let cur = "";
    for (const w of words) {
        if (!cur.length) cur = w;
        else if (cur.length + 1 + w.length <= maxLen) cur += " " + w;
        else {
            chunks.push(cur);
            cur = w;
        }
    }

    if (cur.length) chunks.push(cur);
    return chunks;
}

async function generateTTSForMessage(fullText) {
    const s = IC();
    const TTS_URL = s.allTalkBaseUrl + "/api/tts-generate";

    const spoken = stripCommandBlocksForSpeech(fullText);
    if (!spoken) return;

    const chunks =
        spoken.length > s.ttsChunkCharLimit
            ? chunkTextForTTS(spoken, s.ttsChunkCharLimit)
            : [spoken];

    const audioUrls = [];

    for (const c of chunks) {
        const p = new URLSearchParams();
        p.set("text_input", c);
        p.set("character_voice_gen", s.voiceModel);
        p.set("output_file_name", "st_output");
        p.set("output_file_timestamp", "true");

        const res = await fetch(TTS_URL, { method: "POST", body: p });
        if (!res.ok) continue;

        const data = await res.json().catch(() => null);
        if (!data) continue;

        const rel = data.output_cache_url || data.output_file_url || data.audio_url;
        if (!rel) continue;

        audioUrls.push(rel.startsWith("http") ? rel : s.allTalkBaseUrl + rel);
    }

    if (!audioUrls.length) return;

    const finalUrl =
        audioUrls.length === 1
            ? audioUrls[0]
            : await buildCombinedWavFromUrls(audioUrls);

    handleTTSAudioForMessage(fullText, finalUrl);
}

/* =================================================================================================
   SILLYTAVERN EVENTS + TTS SUPPRESSION
================================================================================================ */
(function init() {
    if (!window.SillyTavern) return setTimeout(init, 200);

    const { eventSource, event_types } = SillyTavern.getContext();

    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        const ctx = SillyTavern.getContext();
        const chat = ctx.chat || [];
        const msg = chat[chat.length - 1];
        if (!msg || msg.is_user) return;

        const text = msg.mes || msg.text || msg.content || "";
        const mid = msg.id ?? ("idx:" + (chat.length - 1));

        const cmds = extractCommandsWithOffsets(text);
        MessageState.commandCache.set(mid, cmds);

        MessageState.lastAssistantMsgInfo = {
            id: mid,
            msg,
            fullText: text,
        };

        clearTimeout(AudioState.ttsMessageTimer);
        AudioState.ttsMessageTimer = setTimeout(() => {
            if (MessageState.lastAssistantMsgInfo?.fullText === text) {
                generateTTSForMessage(text);
            }
        }, 300);
    });

    Intiface.connect();
})();

console.log(`${LOG_PREFIX} Intiface Command extension loaded (FULL)`);

window.addEventListener("beforeunload", () => {
    try {
        Intiface.socket?.close();
    } catch { }

    try {
        AudioState.player?.pause();
    } catch { }
});
