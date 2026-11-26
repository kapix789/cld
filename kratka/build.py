#!/usr/bin/env python3
"""Składa Kratkę z plików w src/ w jedną stronę HTML.

    python3 build.py                      # tworzy index.html (GitHub Pages, otwiera się też z dysku)
    python3 build.py --artifact out.html  # dodatkowo fragment strony dla Claude Artifacts

Kolejność skryptów ma znaczenie:
    core.js (język, rejestry) → engine.js (matematyka) → calc.js (kalkulator zeszytu) → steps.js (rozpisywanie)
    → hw-model.js, hw.js (czytanie pisma) → <przedmiot>/topics.js → app.js (interfejs) → notebook.js (zeszyt)
    → <przedmiot>/tools.js

Przedmiot to folder src/<id>/ z plikiem topics.js (tematy, addSubject) i opcjonalnie page.html (widoki, ściąga),
tools.js (kod tych widoków) oraz innymi plikami .js wczytywanymi przed topics.js (np. so/linux.js).
Nowy przedmiot dopisz do listy SUBJECTS poniżej.
"""
import argparse
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
SUBJECTS = ["algebra", "fizyka", "so"]
TITLE = "Kratka"
DESCRIPTION = ("Kratka: zadania z algebry liniowej, fizyki i systemów operacyjnych z rozwiązaniami krok po kroku, "
               "sprawdzaniem odpowiedzi, sprawdzianami i powtórkami.")
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500'
         '&family=Fira+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400'
         '&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">')
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='1' y='1' width='18' "
        "height='18' rx='1.5' fill='%23fff' stroke='%23152033' stroke-width='1.6'/%3E%3Cpath d='M7 2v16M13 2v16M2 7h16M2 13h16' "
        "stroke='%23152033'/%3E%3Crect x='7.6' y='7.6' width='4.8' height='4.8' fill='%232343b5'/%3E%3C/svg%3E")


def read(path):
    return (SRC / path).read_text(encoding="utf-8")


def optional(path):
    p = SRC / path
    return p.read_text(encoding="utf-8") if p.exists() else ""


def bilingual(html, name):
    """⟦polski⫽English⟧ → dwa bloki <div data-ln>, ⟪polski⫽English⟫ → dwa <span data-ln>; CSS pokazuje jeden język.
    W atrybucie aria-label="⟪polski⫽English⟫" obie wersje trafiają do data-al-pl/-en, a app.js podmienia etykietę."""
    html = re.sub(r'aria-label="⟪(.*?)⫽(.*?)⟫"', lambda m: f'aria-label="{m[1]}" data-al-pl="{m[1]}" data-al-en="{m[2]}"', html)
    html = re.sub(r"⟦(.*?)⫽(.*?)⟧", lambda m: f'<div data-ln="pl">{m[1]}</div><div data-ln="en">{m[2]}</div>', html, flags=re.S)
    html = re.sub(r"⟪(.*?)⫽(.*?)⟫", lambda m: f'<span data-ln="pl">{m[1]}</span><span data-ln="en">{m[2]}</span>', html, flags=re.S)
    left = [c for c in "⟦⟧⟪⟫⫽" if c in html]
    if left:
        raise SystemExit(f"{name}: niedomknięty znacznik języka {left}")
    return html


def parts():
    css = read("style.css")
    pages = "\n".join(bilingual(optional(f"{s}/page.html"), f"{s}/page.html") for s in SUBJECTS)
    shell = bilingual(read("page.html"), "page.html")
    if "<!-- @przedmioty -->" not in shell:
        raise SystemExit("page.html: brak znacznika <!-- @przedmioty -->")
    page = shell.replace("<!-- @przedmioty -->", pages)
    # w folderze przedmiotu: najpierw pliki pomocnicze (alfabetycznie), potem topics.js; tools.js dopiero po app.js
    libs = lambda s: sorted(p.name for p in (SRC / s).glob("*.js") if p.name not in ("topics.js", "tools.js"))
    scripts = (["core.js", "engine.js", "calc.js", "steps.js", "hw-model.js", "hw.js"]
               + [f"{s}/{n}" for s in SUBJECTS for n in libs(s) + ["topics.js"]]
               + ["app.js", "notebook.js", "home.js"] + [f"{s}/tools.js" for s in SUBJECTS if (SRC / s / "tools.js").exists()])
    js = "\n".join(read(n) for n in scripts) + "\nkratkaStart();\n"
    return css, page, js


def full_page():
    css, page, js = parts()
    return (
        "<!doctype html>\n<html lang=\"pl\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        f"<title>{TITLE}</title>\n<meta name=\"description\" content=\"{DESCRIPTION}\">\n"
        f"<link rel=\"icon\" href=\"{ICON}\">\n"
        f"{FONTS}\n<style>\n{css}</style>\n</head>\n<body>\n{page}<script>\n{js}</script>\n</body>\n</html>\n"
    )


def artifact_fragment():
    # Claude Artifacts same dokładają <!doctype>, <head> i <body>.
    css, page, js = parts()
    return (
        f"<title>{TITLE}</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n{FONTS}\n"
        f"<style>\n{css}</style>\n{page}<script>\n{js}</script>\n"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--artifact", help="ścieżka fragmentu strony dla Claude Artifacts")
    a = ap.parse_args()
    out = ROOT / "index.html"
    out.write_text(full_page(), encoding="utf-8")
    print(f"zapisano {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
    if a.artifact:
        p = pathlib.Path(a.artifact)
        p.write_text(artifact_fragment(), encoding="utf-8")
        print(f"zapisano {p} ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
