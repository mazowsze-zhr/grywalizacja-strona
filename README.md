# Grywalizacja wyjazdów — Mazowsze ZHR

**Strona: https://grywalizacja.web.app**

Jeden stały adres z aktualną akcją i poprzednimi edycjami. Strona główna automatycznie pokazuje najnowszą skonfigurowaną akcję. Poprzednie można wybrać nad rankingiem.

Obecnie:

| Akcja | Wariant | Adres |
| --- | --- | --- |
| HAZ27 | zimowy, narciarze | [Strona główna](https://grywalizacja.web.app/) lub [/akcje/haz27/](https://grywalizacja.web.app/akcje/haz27/) |
| HAL26 | letni, statki | [/akcje/hal26/](https://grywalizacja.web.app/akcje/hal26/) |
| HAZ26 | zimowy, narciarze | [/akcje/haz26/](https://grywalizacja.web.app/akcje/haz26/) |
| HAL25 | letni, statki | [/akcje/hal25/](https://grywalizacja.web.app/akcje/hal25/) |
| HAZ25 | zimowy, narciarze | [/akcje/haz25/](https://grywalizacja.web.app/akcje/haz25/) |
| HAL24 | letni, statki | [/akcje/hal24/](https://grywalizacja.web.app/akcje/hal24/) |

Każda akcja ma osobny arkusz, rok, sezon i liczbę zadań. Zmiana akcji otwiera jej własną stronę; konfiguracja i dane nie mieszają się między akcjami. Sezon wynika z ustawień akcji, a użytkownik wybiera edycję, nie dowolną skórkę.

Najnowsza akcja jest wyznaczana według roku, a w tym samym roku HAL następuje po HAZ. Kolejność wpisów w pliku nie ma znaczenia. Dodanie HAL27 sprawi więc, że domyślnie wyświetli się HAL27, a HAZ27 pozostanie w archiwum. Stałe odnośniki `/akcje/<id>/` nie zmieniają znaczenia po dodaniu kolejnych edycji.

## Autorzy i pochodzenie

Projekt powstał na podstawie **[pawelmarczuk/okret-haz25](https://github.com/pawelmarczuk/okret-haz25/)** autorstwa **Pawła Marczuka**. Dziękujemy za pierwotny pomysł, stronę PHP, zasady rankingu oraz grafiki narciarza i wody.

Rozwijany dla [Mazowsze ZHR](https://github.com/mazowsze-zhr). Podziękowanie jest również w stopce strony. Ikonę statku [Mayflower ship](https://www.flaticon.com/free-icon/mayflower-ship_8823135) stworzył [Umeicon](https://www.flaticon.com/authors/umeicon) z Flaticon. Jej darmowe użycie wymaga podpisu — jest automatycznie dodawany do stron letnich. Szczegóły: [ASSET-LICENSES.md](ASSET-LICENSES.md). Grafiki zachowują własne warunki użycia; repozytorium nie nadaje im nowej licencji.

## Pierwsze uruchomienie

Wymagania: **Node.js 22+**, npm i Git. Do wdrażania potrzebne są Firebase CLI oraz dostęp do projektu Firebase. PHP, React, baza danych i klucz Google Sheets API nie są potrzebne. Aplikacja nie ma zależności npm do instalowania.

```sh
git clone https://github.com/mazowsze-zhr/grywalizacja-strona.git
cd grywalizacja-strona
npm test
npm start
```

Otwórz **http://127.0.0.1:8081**. Konfiguracja aktualnych akcji jest już w [actions.json](actions.json), więc po sklonowaniu niczego nie trzeba kopiować ani uzupełniać, żeby zobaczyć stronę.

`npm start` buduje stronę i uruchamia lokalny serwer. Po edycji kodu lub konfiguracji zatrzymaj serwer przez Ctrl+C i uruchom ponownie. Inny port: `PORT=8082 npm start` (macOS/Linux).

## Dodanie następnej akcji

Można poprosić o to w czacie, przekazując nazwę akcji i link do arkusza. Osoba wykonująca zmianę powinna:

1. Dodać wpis do tablicy `actions` w `actions.json` — zachowując poprzednie wpisy.
2. Sprawdzić właściwą zakładkę punktacji oraz układ kolumn (zakładka wskazana przez `gid` w linku nie zawsze zawiera punktację).
3. Uruchomić testy i sprawdzić podgląd.
4. Wysłać zmiany do tego repozytorium i opublikować stronę na Firebase.

Przykład pojedynczego wpisu dla przyszłej akcji:

```json
{
  "id": "hal27",
  "season": "summer",
  "year": 2027,
  "spreadsheetId": "IDENTYFIKATOR_NOWEGO_ARKUSZA",
  "sheetName": "Punktacja",
  "range": "B2:E",
  "totalTasks": 12
}
```

| Pole | Znaczenie |
| --- | --- |
| `id` | Unikalny, trwały identyfikator w adresie strony, np. `haz27`. Nie zmieniaj go w istniejących akcjach. |
| `season` | `winter` = HAZ i narciarze; `summer` = HAL i statki. |
| `year` | Rok akcji, decydujący również o kolejności. |
| `spreadsheetId` | Część URL arkusza pomiędzy `/d/` i `/edit`, bez całego adresu. |
| `sheetName` | Nazwa zakładki zawierającej ranking. |
| `range` | Zakres bez nagłówków, np. `B2:E`. |
| `totalTasks` | Liczba zadań do mety/portu. Skala i pozycje dostosowują się automatycznie. |

`refreshSeconds` na głównym poziomie pliku określa odświeżanie wszystkich akcji (minimum 30 sekund).

Konfiguracja jest publiczna i trafia do wygenerowanego HTML. Nie wpisuj haseł ani kluczy API. Nieznane pola, powtórzone identyfikatory, zduplikowany sezon/rok i nieprawidłowe ustawienia zatrzymują budowanie.

Obowiązującym źródłem jest `actions.json`. Dawne `site.config.json` i zmienne `SEASON`, `YEAR` itp. nie sterują już stroną. Do pracy nad oddzielną kopią można użyć `SITE_CONFIG=/pelna/sciezka/katalog-akcji.json`; struktura powinna być taka jak w `actions.json`. Wzór bez rzeczywistych źródeł znajduje się w `site.config.example.json`. Nie uruchamiaj kilku wdrożeń równocześnie z jednego katalogu, ponieważ korzystają z tego samego `dist/`.

## Arkusze i punktacja

Dla zakresu `B2:E` kolumny to:

| Kolumna | Zawartość |
| --- | --- |
| B | Nazwa wyjazdu. Puste nazwy są pomijane. |
| C | Punkty / okręgoleony. |
| D | Liczba wykonanych zadań. |
| E | Dawna kolumna pomocnicza, obecnie niewykorzystywana. |

Przy innym zakresie zachowaj kolejność: nazwa, punkty, zadania. Nagłówki powinny być poza zakresem danych.

Każdy arkusz musi być dostępny w trybie **Każdy, kto ma link → Przeglądający**. Dotyczy to całego pliku, nie tylko zakładki, więc źródło powinno zawierać dane przeznaczone do publicznego odczytu. Odczyt odbywa się przez Google Visualization, bez klucza API i bez logowania.

Ranking jest malejący. Remisy mają to samo miejsce, następne miejsce zwiększa się o jeden (`1, 1, 2`). Postęp to liczba wykonanych zadań podzielona przez `totalTasks`, wizualnie ograniczona do 0–100%. Puste wartości liczbowe są traktowane jako zero.

Strona pobiera dane przy otwarciu, powrocie do karty, kliknięciu przycisku oraz okresowo w widocznej karcie. Google może buforować odpowiedzi. Przy błędzie odświeżania pozostaje ostatni odczyt z ostrzeżeniem.

**Archiwum również czyta swoje arkusze na żywo** — nie jest zapisaną kopią punktacji. Aby zachować historyczne wyniki, pozostaw wcześniejsze arkusze bez zmian lub utwórz ich kopie i zmień źródła odpowiednich akcji.

## Wdrożenie Firebase

Projekt Google/Firebase pozostaje `haz2027grywalizacja`, ale główna witryna Hosting nazywa się **`grywalizacja`**, stąd adres **grywalizacja.web.app**. Nazwa projektu nie musi być taka sama jak nazwa witryny.

Jednorazowo na nowym komputerze:

```sh
npm install -g firebase-tools
firebase login
firebase projects:list
```

Publikacja w naszym projekcie:

```sh
npm test
npm run deploy -- --project haz2027grywalizacja
```

`firebase.json` zawiera dwie witryny:

- `grywalizacja`: publikuje `dist/`, czyli najnowszą akcję i archiwum. Hook `predeploy` zawsze buduje aktualną wersję.
- `haz2027grywalizacja`: przekierowuje stary adres na nową witrynę. Starsze `/hal/` prowadzi do HAL26, a `/akcje/<id>/` zachowuje wybraną edycję.

Nie uruchamiaj `firebase init` — konfiguracja jest w repo. Publikuj obie witryny przez `--only hosting` (tak działa `npm run deploy`). Ustawienia i źródła nie są serwowane jako osobny katalog; do sieci trafia wygenerowana strona. Pliki `.env` nie są używane.

Nie ma automatycznego wdrożenia przy `git push`: zmiany trzeba **wysłać do GitHub i osobno opublikować**. Dla innej organizacji/projektu utwórz własną witrynę Firebase i zmień `site` oraz przekierowania w `firebase.json` — nie publikuj przypadkiem na naszym hostingu.

Konfiguracja akcji jest osadzona w tym samym HTML co nagłówek, a pliki JS/CSS mają nazwy zależne od zawartości. Ogranicza to mieszanie konfiguracji między wersjami z pamięci podręcznej.

## Struktura

```text
actions.json               aktualny katalog akcji i źródła danych
src/                       wspólny szablon, CSS, JS i grafiki
scripts/build.mjs          walidacja, wybór najnowszej akcji, generowanie stron
scripts/serve.mjs          lokalny serwer plików dist/
tests/                     testy rankingu, katalogu, archiwum i budowania
firebase.json              główna witryna i przekierowanie starego adresu
redirect/                  zapasowy HTML starego hostingu
dist/                      wygenerowana strona (poza Git)
ASSET-LICENSES.md           źródła grafik i wymagane oznaczenia
```

## Typowe problemy

- **Brak punktacji:** sprawdź publiczne udostępnienie arkusza, nazwę zakładki i zakres. Link do arkusza może otwierać zakładkę inną niż „Punktacja”.
- **Zła akcja domyślna:** sprawdź rok i sezon wszystkich wpisów. W obrębie roku HAL jest nowsze niż HAZ. Nie dodawaj jeszcze akcji, która nie ma być dostępna.
- **Stare dane:** kliknij odświeżanie, a potem odczekaj na bufor Google.
- **Stara wersja strony:** odśwież przeglądarkę; sprawdź też, czy po `git push` wykonano wdrożenie Firebase.
- **Brak dostępu do hostingu:** `firebase login --reauth` i weryfikacja uprawnień do projektu.

Przy przekazywaniu utrzymania zapewnij następnej osobie dostęp do GitHub, projektu Firebase i edycji arkuszy. Dostęp do repozytorium nie nadaje uprawnień do pozostałych usług.
