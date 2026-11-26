// Wczytuje rdzeń i wszystkie przedmioty w Node (bez przeglądarki), w tej samej kolejności co build.py.
//   const K = require('./load')(['TOPICS', 'ansCheck', ...]);
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const SUBJECTS = ['algebra', 'fizyka', 'so'];
module.exports = function load(names) {
  const libs = s => fs.readdirSync(path.join(SRC, s)).filter(f => f.endsWith('.js') && f !== 'topics.js' && f !== 'tools.js').sort();
  const files = ['core.js', 'engine.js', ...SUBJECTS.flatMap(s => [...libs(s), 'topics.js'].map(f => s + '/' + f))];
  const code = files.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  return new Function(code + `\nreturn {${names.join(',')}};`)();
};
