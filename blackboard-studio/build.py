"""Build the standalone offline app from the files in src/. Python stdlib only."""
import re
from pathlib import Path

root = Path(__file__).resolve().parent
src = root / 'src'
# Token in src/index.html -> source file that replaces it.
parts = {
    'STYLES': 'styles.css',
    'ENGINE': 'engine.js',
    'VIEWPORT': 'viewport.js',
    'DRAFTS': 'drafts.js',
    'SEARCH': 'search.js',
    'WORKER': 'worker.js',
    'APP': 'app.js',
}
sources = {}
for token, name in parts.items():
    text = (src / name).read_text()
    if name.endswith('.js') and '</script' in text.lower():
        raise ValueError(f'Unsafe script terminator in {name}')
    if name.endswith('.css') and '</style' in text.lower():
        raise ValueError(f'Unsafe style terminator in {name}')
    sources[token] = text

template = (src / 'index.html').read_text()
pattern = re.compile(r'/\* (' + '|'.join(parts) + r') \*/')
found = pattern.findall(template)
if sorted(found) != sorted(parts):
    raise ValueError(f'Template tokens {found} do not match {list(parts)}')
# Single pass, so text inside one source can never be mistaken for another token.
html = pattern.sub(lambda m: sources[m.group(1)], template)
out = root / 'Blackboard-Studio.html'
out.write_text(html)
print(f'Built {out.name} ({out.stat().st_size:,} bytes)')
