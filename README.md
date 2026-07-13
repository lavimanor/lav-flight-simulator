# Advanced Desktop Flight Simulator

A lightweight flight simulator built using **Electron**, **HTML5/CSS3 (ES Modules)**, and **Three.js**. It features a decoupled, modular architecture and custom procedural asset generation.
The game is 100% AI generated

**Current version**: 0.1.3v 

---

## 🚀 Game Setup & Installation Instructions

Since the workspace includes a `.gitignore` locking out the `node_modules/` folder, follow these steps to set up and launch the desktop client on your local machine.

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16.0.0 or later is recommended).

### 2. Copy the Repository
Place all the project files into your local directory. Ensure that the folder hierarchy matches the project structure exactly.

### 3. Install Dependencies
Open your terminal in the project's root folder and install the locked dependencies (Electron and Three.js):
```bash
npm install
```

### 4. Running the Simulator
Launch the Electron desktop background thread:
```bash
npm start
```
> **Procedural Sound Asset Pipeline**: On boot, the background Node.js thread (`main.js` calling `scripts/sound-builder.js`) will verify whether your `src/assets/sound/` and `src/assets/sound/engine/` directories are present. If they are missing, it programmatically synthesizes and writes ten uncompressed, valid 16-bit PCM Mono WAV files to populate the folders automatically.

---

## ✈ Keyboard Controls & Binds

| Control Group | Keybind | Action |
|---|---|---|
| **Pitch (Elevator)** | `W` / `S` (or `Up` / `Down` arrows) | Nose Pitch Down / Pitch Up |
| **Roll (Ailerons)** | `A` / `D` (or `Left` / `Right` arrows) | Bank Left / Bank Right |
| **Yaw (Rudder)** | `Q` / `E` | Rudder Left / Rudder Right |
| **Throttle** | `Shift` (or `Space`) / `Ctrl` (or `X`) | Increase Throttle / Decrease Throttle |
| **Landing Gear** | `G` | Toggle Retractable Tricycle Gear |
| **Wing Flaps** | `F` | Cycle Wing Flaps (0% -> 50% -> 100%) |
| **Speedbrakes (Airbrakes)** | `C` | Toggle Aerodynamic Speedbrakes |
| **Wheel Brakes** | `B` | Toggle Pneumatic Wheel Brakes |
| **Starter Ignition** | `I` | Toggle Starter Ignition (Engine On/Off) |
| **Reset State** | `R` | Respawn on Runway (Only if crashed/splashdown) |

---

## ⚙ Pilot Configurations (Settings Menu)

The **Settings Menu** can be accessed from the **Pre-Flight Main Menu** or by clicking **⚙ SETTINGS** inside the in-flight pause menu ( Hangar selection screen). Values are saved to browser `localStorage` and persist across boots.

### Audio Settings
*   **Master Volume**: Adjusts global audio gains.
*   **Engine Volume**: Modulates turbine whines and piston chugs.
*   **Wind Volume**: Scales aerodynamic air friction.
*   **Effects Volume**: Modulates warning chimes, gear servos, tire squeals, and crashes.
*   **Mute All**: Instantly drops Web Audio listener gains to $0.0$.

### Simulation Parameters
*   **Enable G-Effects (Blackout)**: Toggles visual cockpit blackouts and redouts during high-G turns.
*   **Enable Aerodynamic Buffet**: Toggles high-frequency camera vibration offsets during stalls, transonic boundaries, or high-G stress [4, 8].
*   **Enable Wind & Turbulence**: Toggles atmospheric headwind vectors and high-frequency turbulence offsets.
*   **Enable ILS Guidance**: Toggles the glideslope and localizer deviation scales on the HUD glass.

---

## Up Next
| Title | Description | Version |
|---|---|---|
|  **More Planes & Better Physics** | Adding more planes, Improving the physics & Flight model and adding Ring Course | 0.1.3v |
|  **Micro:Bit Integration** | Data Host Communication, Calibration, Input Mapping. | 0.1.4v |
|  **Polishing & Releasing** | Polishing everything, fixing bugs, and finally, releasing (releasing both the executable and the source) | 1.0.0v |

**More To Come**, Awaiting for your ideas