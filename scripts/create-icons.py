"""Generate the checked-in extension icon sizes (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / "icons"
root.mkdir(exist_ok=True)
scale = 4
image = Image.new("RGBA", (512 * scale, 512 * scale))
draw = ImageDraw.Draw(image)
def box(coords, radius, fill):
    draw.rounded_rectangle(tuple(int(c * scale) for c in coords), int(radius * scale), fill)
def poly(points, fill):
    draw.polygon([(int(x * scale), int(y * scale)) for x, y in points], fill=fill)
box((0, 0, 512, 512), 116, "#142b30")
box((80, 109, 365, 225), 42, "#65e0be")
poly([(266, 198), (352, 198), (352, 282)], "#65e0be")
box((147, 287, 432, 403), 42, "#ffffff")
poly([(160, 231), (160, 314), (246, 314)], "#ffffff")
for size in (16, 32, 48, 128, 256):
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / f"icon-{size}.png")
print("Generated AI Relay icons")
