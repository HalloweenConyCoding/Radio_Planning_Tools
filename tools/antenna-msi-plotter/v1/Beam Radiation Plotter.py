# %% Import libraries
import os
import re
import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict
from matplotlib.cm import get_cmap

# %% Configuration
# H65 = "D:\Beer\Work\Data Sheet\MSI\PC7038-4X65C-1113T0_MSI"
# V65 = "D:\Beer\Work\Data Sheet\MSI\PC1727-4X33C-12T0_MSI"
base_folder = r"D:\Beer\Work\Data Sheet\MSI\PC7038-4X65C-1113T0_MSI"
rotate = 'No'  # Change to 'No' (any capitalization) to disable tilt rotation

# %% MSI parser and helper functions
def parse_msiread_style(file_path):
    h_pattern, v_pattern = {}, {}
    gain_value = None
    reading_h = reading_v = False

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if line.upper().startswith("GAIN"):
            try:
                gain_value = float(line.split()[1])
            except:
                pass

        if line.startswith("HORIZONTAL"):
            reading_h, reading_v = True, False
            continue
        elif line.startswith("VERTICAL"):
            reading_v, reading_h = True, False
            continue

        if reading_h:
            try:
                angle, value = map(float, line.split())
                h_pattern[angle] = value
            except:
                pass
        elif reading_v:
            try:
                angle, value = map(float, line.split())
                v_pattern[angle] = value
            except:
                pass

    return h_pattern, v_pattern, gain_value

# %% Smart filename parser for frequency and tilt
def extract_info_from_filename(filename):
    name = os.path.splitext(filename)[0]  # remove .msi
    if '_' in name:
        parts = name.split('_')
    else:
        parts = name.split('-')

    frequency = None
    tilt = 0

    # First pass: try to extract frequency in 600-2700 MHz range
    for part in parts:
        try:
            value = int(part)
            if 600 <= value <= 2700:
                frequency = value
        except:
            continue

    # Second pass: look for tilt indicators like '00T', 'T2', 'T05', '-01T', 'T-01'
    for part in parts:
        if 'T' in part.upper():
            cleaned = part.upper().replace('T', '')
            is_negative = '-' in cleaned
            cleaned = cleaned.replace('-', '')
            try:
                tilt = int(cleaned)
                if is_negative:
                    tilt = -tilt
                break
            except:
                continue

    return frequency, 'AutoPort', tilt

# %% Prepare pattern with optional tilt rotation
def prepare_pattern_data_abs_gain(pattern, tilt=0, rotate_enabled=False):
    angles = np.array(sorted(pattern.keys()))
    raw_values = np.array([-abs(pattern[a]) for a in angles])
    gains = raw_values - np.max(raw_values)
    angles_rad = np.deg2rad(angles)

    if rotate_enabled:
        angles_rad -= np.deg2rad(tilt)

    return angles_rad, gains

# %% Plot grouped patterns
def plot_grouped_patterns_with_vivid_colors(data_dict):
    color_map = get_cmap('nipy_spectral')
    line_styles = ['-', '--', '-.', ':']

    for freq in sorted(data_dict.keys()):
        # Horizontal
        plt.figure(figsize=(8, 6), dpi=150)
        ax = plt.subplot(111, polar=True)
        plt.title(f"{freq} MHz - Horizontal Pattern")
        for idx, ((port, tilt), (angles, gains)) in enumerate(data_dict[freq]['H']):
            color = color_map(idx / max(1, len(data_dict[freq]['H']) - 1))
            style = line_styles[(idx // 20) % len(line_styles)]
            label = f"{port}-{tilt}T"
            ax.plot(angles, gains, style, color=color, label=label, linewidth=0.75)
        ax.set_theta_zero_location('N')
        ax.set_theta_direction(-1)
        # ax.set_thetagrids(range(0, 360, 10))
        ticks = np.arange(0, 360, 10)                     # tick positions in degrees
        labels = [str(d if d <= 180 else d - 360) for d in ticks]  # 0..180, then negatives
        ax.set_thetagrids(ticks, labels=labels)
        
        ax.set_rgrids(range(-30, 1, 5), angle=135)
        ax.set_rlim(-35, 0)
        ax.set_rlabel_position(45)
        ax.grid(True, linestyle="--", linewidth=0.6)
        ax.plot(np.linspace(0, 2 * np.pi, 360), [-3] * 360, color='lightcoral', linewidth=0.6)  # -3 dB line
        ax.legend(fontsize="x-small", bbox_to_anchor=(1.25, 1.0), loc='upper left')
        plt.tight_layout(rect=[0, 0, 0.75, 1])
        plt.show()

        # Vertical
        plt.figure(figsize=(8, 6), dpi=150)
        ax = plt.subplot(111, polar=True)
        plt.title(f"{freq} MHz - Vertical Pattern (Tilt Adjusted)")
        for idx, ((port, tilt), (angles, gains)) in enumerate(data_dict[freq]['V']):
            color = color_map(idx / max(1, len(data_dict[freq]['V']) - 1))
            style = line_styles[(idx // 20) % len(line_styles)]
            label = f"{port}-{tilt}T"
            ax.plot(angles, gains, style, color=color, label=label, linewidth=0.75)
        ax.set_theta_zero_location('E')
        ax.set_theta_direction(-1)
        # ax.set_thetagrids(range(0, 360, 10))
        ticks = np.arange(0, 360, 10)                     # tick positions in degrees
        labels = [str(d if d <= 180 else d - 360) for d in ticks]  # 0..180, then negatives
        ax.set_thetagrids(ticks, labels=labels)
        ax.set_rgrids(range(-30, 1, 5), angle=135)
        ax.set_rlim(-35, 0)
        ax.set_rlabel_position(-45)
        ax.grid(True, linestyle="--", linewidth=0.6)
        ax.plot(np.linspace(0, 2 * np.pi, 360), [-3] * 360, color='lightcoral', linewidth=0.6)  # -3 dB line
        ax.legend(fontsize="x-small", bbox_to_anchor=(1.25, 1.0), loc='upper left')
        plt.tight_layout(rect=[0, 0, 0.75, 1])
        plt.show()

# %% Main logic
grouped_data = defaultdict(lambda: {'H': [], 'V': []})

for root, dirs, files in os.walk(base_folder):
    for file in files:
        if file.lower().endswith(".msi"):
            freq, port, tilt = extract_info_from_filename(file)
            if freq is None:
                continue
            full_path = os.path.join(root, file)
            h, v, gain = parse_msiread_style(full_path)
            if h:
                h_angles, h_gains = prepare_pattern_data_abs_gain(h)
                grouped_data[freq]['H'].append(((port, tilt), (h_angles, h_gains)))
            if v:
                do_rotate = rotate.strip().lower() == 'yes'
                v_angles, v_gains = prepare_pattern_data_abs_gain(v, tilt=tilt, rotate_enabled=do_rotate)
                grouped_data[freq]['V'].append(((port, tilt), (v_angles, v_gains)))

# %% Run it!
plot_grouped_patterns_with_vivid_colors(grouped_data)
