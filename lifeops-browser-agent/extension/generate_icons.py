import os
from PIL import Image, ImageDraw

def create_icon(size: int, output_path: str):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient/Rounded Background
    margin = int(size * 0.05)
    corner_radius = int(size * 0.22)
    
    # Draw rounded rectangle with violet/indigo gradient
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=corner_radius,
        fill=(99, 102, 241, 255),  # Indigo 600
        outline=(139, 92, 246, 255),  # Purple 500
        width=max(1, int(size * 0.03))
    )
    
    # Draw Center Star / Sparkle
    cx, cy = size / 2, size / 2
    r_outer = size * 0.32
    r_inner = size * 0.12
    
    # 4-point sparkle star
    points = [
        (cx, cy - r_outer),
        (cx + r_inner, cy - r_inner),
        (cx + r_outer, cy),
        (cx + r_inner, cy + r_inner),
        (cx, cy + r_outer),
        (cx - r_inner, cy + r_inner),
        (cx - r_outer, cy),
        (cx - r_inner, cy - r_inner),
    ]
    draw.polygon(points, fill=(255, 255, 255, 255))
    
    # Save file
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Generated icon: {output_path} ({size}x{size})")

if __name__ == "__main__":
    base_dir = r"c:\Users\lokes\Lifeops Ai\lifeops-browser-agent\extension\icons"
    for s in [16, 32, 48, 128]:
        create_icon(s, os.path.join(base_dir, f"icon{s}.png"))
