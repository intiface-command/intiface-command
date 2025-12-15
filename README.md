# Intiface Command (SillyTavern Extension)

**Version:** 1.0.0

Intiface Command is a SillyTavern extension that allows LLM responses to control Intiface-compatible devices using inline commands embedded directly in assistant messages. 

Commands are executed in approximate sync with TTS audio using AllTalk.

This extension is designed for **local, trusted setups** and handles its own audio pipeline in order to support timing-based synchronization.

---

## Important Usage Notes

* **Do not use this extension alongside SillyTavern’s default TTS extension.**
  Intiface Command generates and plays its own audio and relies on that audio for command timing. Running another TTS system at the same time may result in conflicts or duplicated audio.

* Audio playback and command execution are tightly coupled. Because of this, **audio generation does not begin until the LLM response is fully received**.

* Pause Audio, Resume Audio, and Stop Audio + Device buttons are available in the extension settings menu.

---

## What This Extension Does (TL;DR)

This extension allows SillyTavern to interact with your toys and devices by executing commands at the moment (give or take) they occur in the narration.

A starter character is included in the extension files to demonstrate how commands can be naturally embedded into responses. You may use this character as-is, modify it, or use the extension with any character of your choice, as long as the model outputs valid command blocks.

It works best with **short to medium responses (1–4 paragraphs)**, but it is capable of handling very long responses as well. As responses grow longer:

* Command timing will **degrade slightly**, but should remain reasonably close
* Audio generation and playback will take longer
* The next narration cannot begin until the current audio and command sequence has completed

Because timing is based on generated audio, this behavior is unavoidable and is influenced by:

* Response length
* TTS backend performance
* Hardware capabilities

---

## Tested Environment

This extension was developed and tested with the following software and versions:

* **AllTalk TTS Standalone**

  * Piper backend used during development
  * Other AllTalk-supported backends should work
* **Intiface Central 2.6.8**
* **SillyTavern Standalone 1.13.1**
* **LM Studio**

Hardware used during development and testing:

* **NVIDIA GeForce RTX 5080**

Lower-end or different hardware configurations may require tuning of playback speed, chunk size, or timing-related settings.

---

## Device Compatibility

The extension should work with the broad range of devices supported by Intiface / Buttplug.

However:

* Development testing was limited to **vibrate** and **oscillate**-based devices
* Other capabilities (linear, rotate, scalar) are supported in code but may not have been personally tested

Device capabilities are detected automatically at runtime, and unsupported commands are safely ignored with warnings.

---

## Features

* Inline device control using simple text commands
* Works with Intiface / Buttplug-compatible devices
* Audio-synced command execution via AllTalk TTS
* Pattern and ramp-based motion support
* Automatic device capability detection
* Safe command queueing and interruption handling
* Random pattern generation
* Manual audio playback controls (pause / resume / stop)

---

## Installation

1. Place the extension folder in:

   ```
   SillyTavern/data/default-user/extensions/intiface-command
   ```
(Or another valid SillyTavern extensions folder.)

2. Restart SillyTavern.

3. Open **Extensions → Intiface Command** in the settings panel.

4. Ensure:

   * Intiface Central is running and connected to a device
   * AllTalk is running
   * A voice model is selected

Connection status indicators will show when both services are available.

---

## Command Syntax

Commands are embedded directly in assistant messages using curly braces:

```
{command: value; option: value}
```

Commands are removed from spoken audio but retained for timing and execution.

---

## Supported Commands

### vibrate

```
{vibrate: 0.8; duration: 3}
```

### oscillate

```
{oscillate: 0.6; duration: 5}
```

### linear

```
{linear: 0.2; duration: 2}
```

### rotate

```
{rotate: 0.7; duration: 4}
```

### scalar

```
{scalar: 0.5; index: 0; duration: 3}
```

### stop

Immediately stops all active output and clears queued commands.

```
{stop}
```

---

## Pattern Commands

### Custom Pattern

```
{pattern: custom; values: 0.1,0.6,0.3,0.9; duration: 6}
```

Supports an unlimited number of values, but keep in mind they will all be fit into the specified duration (in seconds).

Values are automatically smoothed into ramps.

### Random Pattern

```
{pattern: custom; values: random}
```

Generates a custom pattern with a randomly-selected number of random variables, for a random duration. The generated command is not shown in the UI but is printed in the browser console for reference.

Minimum and maximum values for random behavior are controlled via the extension settings menu:

* Number of steps
* Duration range
* Intensity range

---

## Timing Behavior

* Commands are aligned to narration using estimated word timing
* Timing is approximate and depends on:

  * Voice model
  * Playback speed
  * Base WPM setting
* Commands execute once their estimated audio timestamp is reached

This is **best-effort synchronization**, not sample-accurate alignment.

---

## Safety Notes

* This extension assumes trusted, local services
* Do not expose Intiface or AllTalk to untrusted networks
* Commands execute automatically when generated by the assistant
* Use appropriate device safety limits and settings

---

## Known Limitations

* Nested or malformed command blocks are not supported
* Timing accuracy degrades slightly with very long responses
* Only one device is controlled at a time
* No phoneme-level synchronization

---

## License

MIT License
