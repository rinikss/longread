# side c
# запусти меня: python3 side_c.py
# (или нажми ▶ справа сверху в VS Code)
import base64, hashlib, json, os, random, re, sys, time, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "side_c.dat")
KEY = b"33 1/3 rpm"

if os.name == "nt":
    os.system("")

W = "\033[97m"
G = "\033[90m"
B = "\033[1m"
R = "\033[0m"
HIDE = "\033[?25l"
SHOW = "\033[?25h"
CLEAR = "\033[2J\033[H"


def rgb(c):
    return "\033[38;2;%d;%d;%dm" % tuple(c)


def norm(s):
    s = s.lower().replace("ё", "е")
    return re.sub(r"[^a-zа-я0-9]", "", s)


def h(s):
    return hashlib.sha256(("side c:" + norm(s)).encode("utf-8")).hexdigest()


def load():
    try:
        raw = base64.b64decode(open(DATA, "rb").read())
        raw = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(raw))
        return json.loads(zlib.decompress(raw).decode("utf-8"))
    except Exception:
        return None


def out(s="", end="\n"):
    sys.stdout.write(s + end)
    sys.stdout.flush()


def typewrite(s, delay=0.045, color=W):
    sys.stdout.write(color)
    for ch in s:
        sys.stdout.write(ch)
        sys.stdout.flush()
        time.sleep(delay if ch != " " else delay * 0.6)
    sys.stdout.write(R + "\n")


DISC = [
    "        .-''''''-.        ",
    "      .'  .----.  '.      ",
    "     /   /  ..  \\   \\     ",
    "    |   |  (  )  |   |    ",
    "     \\   \\  ''  /   /     ",
    "      '.  '----'  .'      ",
    "        '-......-'        ",
]
MARKS = [(0, 12), (2, 21), (4, 21), (6, 12), (4, 4), (2, 4)]


def spin(seconds, label=""):
    t0 = time.time()
    i = 0
    out(HIDE, end="")
    while time.time() - t0 < seconds:
        frame = [list(r) for r in DISC]
        y, x = MARKS[i % len(MARKS)]
        frame[y][x] = "•"
        el = time.time() - t0
        timer = "%02d:%02d:%02d" % (0, int(el), int((el % 1) * 100))
        out(CLEAR, end="")
        out(G + "  SIDE C" + " " * 10 + "33⅓ RPM" + R)
        out()
        for r in frame:
            out(W + "  " + "".join(r) + R)
        out()
        out(G + "  " + timer + "   " + label + R)
        time.sleep(0.12)
        i += 1
    out(SHOW, end="")


def sleeve(name, title, color):
    w = max(len(name), len(title or ""), 16) + 6
    out(W + "  ┌" + "─" * w + "┐")
    out("  │" + " " * w + "│")
    out("  │" + B + color + name.center(w) + R + W + "│")
    if title:
        out("  │" + G + title.center(w) + W + "│")
    out("  │" + " " * w + "│")
    out("  └" + "─" * w + "┘" + R)


def play(rec, d):
    color = rgb(rec.get("color", (255, 255, 255)))
    spin(2.4, "…")
    out(CLEAR, end="")
    out()
    sleeve(rec["name"], rec.get("title"), color)
    out()
    time.sleep(0.8)
    for line in rec.get("lines") or ["…"]:
        if not line.strip():
            time.sleep(0.9)
            out()
            continue
        typewrite("  " + line, color=color)
        time.sleep(0.35)
    out()
    time.sleep(1.2)
    outro = d.get("outro", [])
    for i, line in enumerate(outro):
        typewrite("  " + line, 0.05, B + W if i == len(outro) - 1 else G)
        time.sleep(0.5)
    out()


def main():
    d = load()
    if not d or "q" not in d:
        out(G + "  пластинка не найдена." + R)
        return
    try:
        spin(2.0, d.get("intro", ""))
        out(CLEAR, end="")
        out()
        typewrite("  " + d["q"], 0.05, B + W)
        tries = 0
        while True:
            ans = input(G + "  > " + R)
            i = d["answers"].get(h(ans))
            if i is not None:
                play(d["records"][i], d)
                return
            tries += 1
            typewrite("  " + random.choice(d["wrong"]), 0.03, G)
            if tries == 2:
                typewrite("  " + d["hint"], 0.03, G)
            if tries >= 4:
                typewrite("  …" + random.choice(d["first"]), 0.03, G)
    except (KeyboardInterrupt, EOFError):
        out(SHOW + R)


if __name__ == "__main__":
    main()
