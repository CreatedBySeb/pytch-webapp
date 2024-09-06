from PIL import Image
import sys

"""
Install dependencies with

    poetry install

and then run this script from this directory using

    poetry run python grey_blocked_text.py

and feed it (on stdin) the Python code you want to
turn into grey blocks.  The output is written to

    flat.png

and you should move/rename this where needed.
"""

charbox_wd = 12  # Adjust to look OK.
charbox_ht = 17
charbox_size = (charbox_wd, charbox_ht)
charbox_colour = (144,) * 3
flat_leading = 1
charbox_vstride = charbox_ht + flat_leading

flat_left_margin = 5
flat_top_margin = 0

im_char = Image.new("RGB", charbox_size, charbox_colour)


def paste_text_blocks(im, lines, offset_x, offset_y):
    for (row, line) in enumerate(lines):
        line = line.rstrip()
        for (col, ch) in enumerate(line):
            prev_ch = " " if col == 0 else line[col - 1]
            next_ch = " " if col == len(line) - 1 else line[col + 1]
            if ch != " ":
                x0 = offset_x + col * charbox_wd
                x1 = x0 + charbox_wd - 1
                y0 = offset_y + row * charbox_vstride
                y1 = y0 + charbox_ht - 1
                if y0 < im.size[1]:
                    px = im.load()
                    im_bg = px[x0, y0]
                    im.paste(im_char, (x0, y0))
                    if prev_ch == " ":
                        px[x0, y0] = im_bg
                        px[x0, y1] = im_bg
                    if next_ch == " ":
                        px[x1, y0] = im_bg
                        px[x1, y1] = im_bg

def mk_flat_image(code_text):
    code_lines = code_text.rstrip().split("\n")
    n_lines = len(code_lines)
    max_len = max(map(len, code_lines))
    thumbnail_size = (
        flat_left_margin + max_len * charbox_wd,
        flat_top_margin + n_lines * charbox_vstride - flat_leading
    )
    im = Image.new("RGB", thumbnail_size, (255, 255, 255))
    paste_text_blocks(
        im,
        code_lines,
        flat_left_margin,
        flat_top_margin
    )
    im.save("flat.png")


if __name__ == "__main__":
    mk_flat_image(sys.stdin.read())
