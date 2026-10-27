#!/usr/bin/env python3
"""Produce stable, locally generated PNG app icons; no artwork uploaded."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys

destination = Path(sys.argv[1])
destination.mkdir(parents=True, exist_ok=True)
s = 1024
im = Image.new("RGBA", (s,s), (34,61,121,255))
d = ImageDraw.Draw(im)
d.rounded_rectangle((85,95,939,930),radius=160,fill=(28,51,105,255),
                    outline=(95,124,195,255),width=7)
bold_fonts = [
 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
]
normal_fonts = [
 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
]
def font(paths,size):
    for path in paths:
        if Path(path).is_file():
            return ImageFont.truetype(path,size)
    return ImageFont.load_default()
strong=font(bold_fonts,390)
bbox=d.textbbox((0,0),"DD",font=strong)
d.text(((s-(bbox[2]-bbox[0]))/2-bbox[0],135-bbox[1]),"DD",
       font=strong,fill=(250,252,255,255))
d.rounded_rectangle((300,610,724,621),radius=5,fill=(96,176,151,255))
suits=font(normal_fonts,141)
for symbol,x,colour in [("♠",344,(255,255,255,255)),
                         ("♥",605,(255,140,170,255))]:
    bbox=d.textbbox((0,0),symbol,font=suits)
    d.text((x-(bbox[2]-bbox[0])/2-bbox[0],680-bbox[1]),
           symbol,font=suits,fill=colour)
for size,name in [(180,"apple-touch-icon.png"),
                  (192,"icon-192.png"),(512,"icon-512.png")]:
    image=im.resize((size,size),Image.Resampling.LANCZOS).convert("RGB")
    image=image.quantize(colors=96,method=Image.Quantize.MEDIANCUT)
    image.save(destination/name,optimize=True,compress_level=9)
    print("Created",name)
