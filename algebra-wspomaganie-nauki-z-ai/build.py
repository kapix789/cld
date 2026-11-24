#!/usr/bin/env python3
"""Składa trener z plików w src/ w jedną stronę HTML.

    python3 build.py                      # tworzy index.html (GitHub Pages, otwiera się też z dysku)
    python3 build.py --artifact out.html  # dodatkowo fragment strony dla Claude Artifacts

Kolejność skryptów ma znaczenie: engine.js (matematyka, bez DOM) → topics.js (rejestr tematów) → ui.js (interfejs).
"""
import argparse
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
SCRIPTS = ["engine.js", "topics.js", "ui.js"]
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700'
         '&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">')


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


def parts():
    css = read("style.css")
    page = read("page.html")
    js = "\n".join(read(n) for n in SCRIPTS)
    return css, page, js


def full_page(title):
    css, page, js = parts()
    return (
        "<!doctype html>\n<html lang=\"pl\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        f"<title>{title}</title>\n"
        "<meta name=\"description\" content=\"Trener algebry liniowej: macierze, równania macierzowe, układy równań, "
        "wyznaczniki, rząd — z animowanymi rozwiązaniami krok po kroku.\">\n"
        f"{FONTS}\n<style>\n{css}</style>\n</head>\n<body>\n{page}<script>\n{js}</script>\n</body>\n</html>\n"
    )


def artifact_fragment(title):
    # Claude Artifacts same dokładają <!doctype>, <head> i <body>.
    css, page, js = parts()
    return (
        f"<title>{title}</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n{FONTS}\n"
        f"<style>\n{css}</style>\n{page}<script>\n{js}</script>\n"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--artifact", help="ścieżka fragmentu strony dla Claude Artifacts")
    a = ap.parse_args()
    out = ROOT / "index.html"
    out.write_text(full_page("Algebra — wspomaganie nauki z AI"), encoding="utf-8")
    print(f"zapisano {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
    if a.artifact:
        p = pathlib.Path(a.artifact)
        p.write_text(artifact_fragment("Macierze — trener do algebry"), encoding="utf-8")
        print(f"zapisano {p} ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
