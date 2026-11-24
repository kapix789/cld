# Algebra — wspomaganie nauki z AI

Trener algebry liniowej w przeglądarce: macierze, równania macierzowe, układy równań, wyznaczniki i rząd — z animowanymi rozwiązaniami krok po kroku. Wszystko liczy się na ułamkach zwykłych, bez zaokrągleń. Nic nie jest wysyłane do sieci.

**Otwórz:** https://kapix789.github.io/cld/algebra-wspomaganie-nauki-z-ai/ (po scaleniu z gałęzią `main`)
albo pobierz [`index.html`](index.html) i otwórz go z dysku — działa offline (poza czcionkami).

Zbudowane z pomocą AI (Claude).

## Co jest w środku

| Zakładka | Do czego służy |
|---|---|
| **X na liczbach** | Równania macierzowe z liczbami: `AX = B`, `XA − 2B = C`, `AXB = C`, także z prostokątną *X* i takie, które rozwiązuje się przez niewiadome (`AX + XB = C`, `AX + Xᵀ = B`). |
| **X na literach** | Wyznaczanie *X* symbolicznie (`AᵀB⁻¹XCA = (AD)⁻¹D`) z odsłanianiem kroków; potem „Policz na liczbach” dla własnych macierzy. |
| **Układy równań** | Gauss, metoda macierzowa *X = A⁻¹B*, wzory Cramera; układy oznaczone, nieoznaczone i sprzeczne; własny układ wpisany tekstem. |
| **Ćwiczenia** | Wszystkie tematy z rejestru w jednym miejscu: działania, odwrotność, równania, układy, układy z parametrem, wyznaczniki (2×2, Sarrus, Laplace 4×4, własności), rząd. |
| **Sprawdzian** | Losowy zestaw 5–10 zadań z wybranych działów, opcjonalny limit czasu, ocena w skali 2,0–5,0 i przegląd z rozwiązaniami. |
| **Znajdź błąd** | Przepisujesz swoje kolejne macierze z eliminacji Gaussa (albo iloczyn) — trener wskazuje krok, wiersz i kolumnę z błędem oraz zgaduje, jaką operację chciałeś zrobić. |
| **Postęp** | Wyniki z ostatnich 10 prób każdego tematu (zapis w przeglądarce) i powtórka, która częściej losuje słabe, nowe i dawno nie ćwiczone tematy. |
| **Ściąga** | Wzory i przepisy: odwrotność, równania, Gauss, Kronecker–Capelli, Cramer, wyznaczniki, Laplace, rząd, parametr. |

Przy każdym zadaniu jest przycisk **▶ Krok po kroku** — animacja pokazuje na macierzach, co się dzieje (element główny, odejmowany wiersz, rachunek dla każdego elementu, przekątne Sarrusa, mnożenie wiersz × kolumna…). Sterowanie: Wstecz / Dalej / Odtwarzaj, tempo, strzałki, spacja, Esc.

## Jak dodać nowy temat

Wszystkie tematy są w jednym rejestrze — [`src/topics.js`](src/topics.js), tablica `TOPICS`. Ćwiczenia, Sprawdzian, Postęp i Powtórki biorą je stamtąd automatycznie, w interfejsie nic więcej nie trzeba zmieniać.

```js
{ id:'slad', sec:'Działania', name:'Ślad macierzy', gen: () => {
    const A = M.make(3, 3, () => F(rnd(-5, 9)));           // losowa macierz 3×3 (ułamki Fr)
    const tr = A.reduce((s, r, i) => s.add(r[i]), F(0));  // suma przekątnej
    return {
      q: 'Oblicz ślad macierzy <i>A</i>',                  // polecenie
      body: givenH([['A', A]]),                           // treść zadania
      ans: { kind: 'num', v: tr, lab: 'tr <i>A</i>' },    // oczekiwana odpowiedź
      sol: `<p>Ślad to suma liczb na przekątnej.</p><div class="line res">tr <i>A</i> = ${tr.html()}</div>`,
      hint: 'Dodaj liczby na przekątnej.',                // opcjonalnie
      // fr: () => [...klatki animacji...]               // opcjonalnie, format w engine.js
    };
}},
```

Rodzaje odpowiedzi (`ans.kind`): `mat` (siatka pól), `num` (liczba), `formula` (wzór na *X*), `sys` (układ: ile rozwiązań + wartości), `param` (dyskusja układu z parametrem). Opis pól jest na początku `topics.js`. `id` musi być stałe — pod nim zapisuje się postęp.

## Struktura

```
src/
  engine.js   matematyka bez DOM: ułamki, macierze, Gauss, równania, układy, klatki animacji
  topics.js   nowe działy, „Znajdź błąd”, format odpowiedzi i REJESTR TEMATÓW
  ui.js       interfejs: zakładki, odtwarzacz krok po kroku, ćwiczenia, sprawdzian, postęp
  page.html   znaczniki zakładek
  style.css   wygląd (jasny i ciemny motyw)
build.py      składa src/ w index.html
tests/        testy silnika i rejestru (Node, bez przeglądarki)
```

## Budowanie i testy

```sh
python3 build.py              # po każdej zmianie w src/ — odświeża index.html
node tests/engine.test.js     # losuje zadania z każdego tematu i sprawdza je (wymaga Node 18+)
```

Test sprawdza m.in., że każdy temat poprawną odpowiedź ocenia na 100%, że klatki animacji są spójne, że rozwinięcie Laplace'a zgadza się z eliminacją i że „Znajdź błąd” wskazuje właściwą komórkę.
