#!/usr/bin/env python3
"""Chroma-key magenta, crop watermarks, trim, write PNGs."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SESS = Path(
    "/home/savage/.grok/sessions/"
    "%2Fhome%2Fsavage%2F.grok%2Fworktrees%2Fsrc-game-dev%2Funending"
    "/01a06f49-dcbb-7e81-8040-70d9ec39f325"
)
FRAMES = Path("/tmp/unending-frames")


def is_magenta(r, g, b):
    if r < 130 or b < 130:
        return False
    if g >= r * 0.72 or g >= b * 0.72:
        return False
    return ((r + b) / 2 - g) > 42


def key_image(im: Image.Image, crop_watermark=True) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    if crop_watermark:
        # Grok mark sits in the lower-right on magenta.
        im = im.crop((0, 0, w, int(h * 0.93)))
        w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)
            elif a > 0:
                # Soft-key near-magenta fringes from JPEG.
                dist = ((r - 255) ** 2 + g ** 2 + (b - 255) ** 2) ** 0.5
                if dist < 90 and g < 120:
                    px[x, y] = (0, 0, 0, 0)
    return im


def trim(im: Image.Image, pad=10) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def save_keyed(src: Path, dest: Path, crop_watermark=True, pad=10):
    im = Image.open(src)
    im = trim(key_image(im, crop_watermark=crop_watermark), pad=pad)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print(f"  {dest.relative_to(ROOT)}  {im.size}")


def save_bg(src: Path, dest: Path):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    # Crop Grok watermark corner.
    im = im.crop((0, 0, w, int(h * 0.96)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, quality=92)
    print(f"  {dest.relative_to(ROOT)}  {im.size}")


def main():
    print("Processing stills")
    save_bg(SESS / "images/3.jpg", ROOT / "assets/bg/forest.jpg")
    stills = {
        "assets/sprites/hero/hero.png": SESS / "images/4.jpg",
        "assets/sprites/enemies/grunt.png": SESS / "images/5.jpg",
        "assets/sprites/enemies/shield.png": SESS / "images/6.jpg",
        "assets/sprites/enemies/healer.png": SESS / "images/7.jpg",
        "assets/sprites/enemies/mage.png": SESS / "images/8.jpg",
        "assets/sprites/enemies/berserk.png": SESS / "images/9.jpg",
        "assets/sprites/enemies/archer.png": SESS / "images/10.jpg",
        "assets/sprites/fx/arrow.png": SESS / "images/11.jpg",
        "assets/ui/coin.png": SESS / "images/13.jpg",
        "assets/ui/heart.png": SESS / "images/14.jpg",
        "assets/ui/mana.png": SESS / "images/15.jpg",
        "assets/sprites/fx/bolt.png": SESS / "images/16.jpg",
    }
    for dest, src in stills.items():
        save_keyed(src, ROOT / dest)

    print("Processing hero idle")
    for i, n in enumerate([1, 8, 16, 24, 32, 40], start=1):
        save_keyed(
            FRAMES / "hero_idle" / f"{n:03d}.png",
            ROOT / f"assets/sprites/hero/idle_{i}.png",
        )

    print("Processing hero attack")
    for i, n in enumerate([8, 12, 16, 24], start=1):
        save_keyed(
            FRAMES / "hero_atk" / f"{n:03d}.png",
            ROOT / f"assets/sprites/hero/atk_{i}.png",
        )

    print("Processing grunt walk")
    for i, n in enumerate([1, 8, 16, 24, 32, 40], start=1):
        save_keyed(
            FRAMES / "grunt_walk" / f"{n:03d}.png",
            ROOT / f"assets/sprites/enemies/walk_{i}.png",
        )

    print("Done")


if __name__ == "__main__":
    main()
