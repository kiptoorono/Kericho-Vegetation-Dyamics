"""
Compose cartographic frames from GEE-exported GeoTIFFs.

Reads each RGB GeoTIFF exported from Google Earth Engine, converts it
to a numpy array, and adds a title, date stamp, legend (colorbar),
north arrow, and scale bar. Writes composed PNG frames ready for
FFmpeg encoding.
"""
from pathlib import Path
import re

import numpy as np
import rasterio
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.colorbar import ColorbarBase
from matplotlib.colors import ListedColormap, BoundaryNorm
import matplotlib.patheffects as pe


RAW_DIR = Path(r'C:\Users\Rono\Desktop\GEE\NDVI_Frames_v2-20260924T081520Z-1-001')
OUT_DIR = Path(r'C:\Users\Rono\Desktop\GEE\frames_composed')
# ------------------------------------------------

OUT_DIR.mkdir(exist_ok=True, parents=True)

NDVI_COLORS = ['#a50026', '#d73027', '#fdae61',
               '#fee08b', '#a6d96a', '#1a9850']
NDVI_BOUNDS = [-0.1, 0.0, 0.2, 0.4, 0.6, 0.8, 0.9]
CMAP = ListedColormap(NDVI_COLORS)
NORM = BoundaryNorm(NDVI_BOUNDS, CMAP.N)


def find_geotiffs(raw_dir: Path):
    """Find all GeoTIFFs recursively, tolerating case, trailing spaces,
    double extensions, and nesting."""
    if not raw_dir.exists():
        raise FileNotFoundError(f'{raw_dir} does not exist')

    found = []
    for p in raw_dir.rglob('*'):
        if not p.is_file():
            continue
        name = p.name.strip().lower()
        if '.tif' not in name and '.tiff' not in name:
            continue
        m = re.search(r'(\d{4}-\d{2})', p.name)
        if m:
            found.append((m.group(1), p))

    found.sort(key=lambda x: x[0])
    return found


def read_rgb_geotiff(path):
    """Read a 3-band GeoTIFF as an RGB uint8 array (H, W, 3)."""
    with rasterio.open(path) as src:
        arr = src.read()
        if arr.shape[0] < 3:
            raise ValueError(f'{path} has {arr.shape[0]} bands, expected 3')
        rgb = np.transpose(arr[:3], (1, 2, 0))
        if rgb.dtype != np.uint8:
            rgb = rgb.astype(np.uint8)
        return rgb


def compose_frame(tif_path: Path, out_path: Path, date_label: str):
    rgb = read_rgb_geotiff(tif_path)

    fig = plt.figure(figsize=(8, 10), dpi=150)
    fig.patch.set_facecolor('white')

    # --- Main map ---
    ax = fig.add_axes([0.04, 0.22, 0.92, 0.68])
    ax.imshow(rgb)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_edgecolor('#333333')
        spine.set_linewidth(0.8)~

    # --- Title ---
    fig.text(0.5, 0.965, 'Vegetation Dynamics in Kericho County, Kenya',
             ha='center', va='top', fontsize=15, fontweight='bold',
             color='#1a1a1a')
    fig.text(0.5, 0.935, 'Sentinel-2 NDVI, 10 m, Cloud Score+ mask',
             ha='center', va='top', fontsize=10, color='#555555')

    # --- Date stamp — top-right, inside map ---
    ax.text(0.985, 0.965, date_label, transform=ax.transAxes,
            ha='right', va='top', fontsize=14, fontweight='bold',
            color='black',
            path_effects=[pe.withStroke(linewidth=3, foreground='white')])

    # --- North arrow — top-left, black ---
    ax.annotate('',
                xy=(0.06, 0.92), xytext=(0.06, 0.82),
                xycoords='axes fraction', textcoords='axes fraction',
                arrowprops=dict(arrowstyle='-|>', color='black',
                                lw=2.5, mutation_scale=20))
    ax.text(0.06, 0.945, 'N', transform=ax.transAxes,
            ha='center', va='bottom', fontsize=14, fontweight='bold',
            color='black',
            path_effects=[pe.withStroke(linewidth=3, foreground='white')])

    # --- Scale bar — bottom-right, standard cartographic style ---
    bar_x0, bar_x1 = 0.72, 0.97
    bar_y = 0.06
    bar_h = 0.012
    n_segments = 4
    seg_w = (bar_x1 - bar_x0) / n_segments

    for i in range(n_segments):
        color = 'black' if i % 2 == 0 else 'white'
        rect = mpatches.Rectangle(
            (bar_x0 + i * seg_w, bar_y), seg_w, bar_h,
            transform=ax.transAxes, facecolor=color,
            edgecolor='black', linewidth=0.6, zorder=10,
            clip_on=False)
        ax.add_patch(rect)

    # Tick labels below the bar (0, 5, 10, 15, 20 km)
    for i in range(n_segments + 1):
        x = bar_x0 + i * seg_w
        ax.text(x, bar_y - 0.004, str(i * 5),
                transform=ax.transAxes, ha='center', va='top',
                fontsize=7, color='black',
                path_effects=[pe.withStroke(linewidth=2.5,
                                            foreground='white')])

    # Unit label above the bar
    ax.text((bar_x0 + bar_x1) / 2, bar_y + bar_h + 0.004, 'km',
            transform=ax.transAxes, ha='center', va='bottom',
            fontsize=7, color='black', style='italic',
            path_effects=[pe.withStroke(linewidth=2.5, foreground='white')])

    # --- Legend ---
    cax = fig.add_axes([0.15, 0.10, 0.7, 0.025])
    cb = ColorbarBase(cax, cmap=CMAP, norm=NORM,
                      orientation='horizontal',
                      ticks=NDVI_BOUNDS, drawedges=True)
    cb.set_label('NDVI', fontsize=10, labelpad=6)
    cb.ax.tick_params(labelsize=8)
    cb.outline.set_edgecolor('#333333')

    # --- Footer ---
    fig.text(0.5, 0.03,
             'Cross-validated against MODIS (r = 0.90)  ·  '
             'Data: Copernicus Sentinel-2 SR Harmonized',
             ha='center', va='bottom', fontsize=7, color='#666666')

    plt.savefig(out_path, dpi=150, facecolor='white')
    plt.close(fig)


def main():
    frames = find_geotiffs(RAW_DIR)

    if not frames:
        print(f'No GeoTIFFs found in {RAW_DIR.resolve()}')
        print('\nFirst 20 entries actually present:')
        for p in sorted(RAW_DIR.rglob('*'))[:20]:
            print(f'  {p}')
        return

    print(f'Composing {len(frames)} frames from {RAW_DIR}')
    for date_label, tif_path in frames:
        out = OUT_DIR / f'frame_{date_label}.png'
        try:
            compose_frame(tif_path, out, date_label)
            print(f'  {out.name}')
        except Exception as e:
            print(f'  ERROR on {tif_path.name}: {e}')
    print(f'\nDone. Frames in {OUT_DIR.resolve()}')


if __name__ == '__main__':
    main()