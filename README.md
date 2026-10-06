# Grywalizacja wyjazdów — Mazowsze ZHR

Strona z rankingiem okręgoleonów i postępem przygotowań do wyjazdów. Dane pochodzą z Google Sheets. Administrator wybiera jeden wariant podczas przygotowania wdrożenia:

- `winter` — **HAZ**, narciarze i zimowa kolorystyka;
- `summer` — **HAL**, statki płynące w prawo i letnia kolorystyka.

Na stronie nie ma przełącznika sezonów. Sezon, rok i źródło punktacji ustawia osoba publikująca stronę. Zmiana wymaga ponownego wdrożenia. Wszystkie warianty korzystają z tego samego kodu.

## Autorzy i pochodzenie

Projekt powstał na podstawie **[pawelmarczuk/okret-haz25](https://github.com/pawelmarczuk/okret-haz25/)** autorstwa **Pawła Marczuka**. Dziękujemy za pierwotny pomysł, stronę PHP, zasady rankingu oraz grafiki narciarza i wody.

Ta wersja rozwija projekt dla [Mazowsze ZHR](https://github.com/mazowsze-zhr): przenosi wyświetlanie do przeglądarki, odświeża interfejs i dodaje konfigurację wdrożenia oraz wariant letni. Podziękowanie dla oryginalnego projektu jest również w stopce strony.

Ikonę statku **Mayflower ship** stworzył [Umeicon](https://www.flaticon.com/authors/umeicon); pochodzi z [Flaticon](https://www.flaticon.com/free-icon/mayflower-ship_8823135). Darmowe użycie wymaga oznaczenia autora — stopka wariantu letniego zawiera odpowiednie linki. Szczegóły w [ASSET-LICENSES.md](ASSET-LICENSES.md). Pliki graficzne zachowują własne warunki użycia; repozytorium nie nadaje im nowej licencji.

## Wymagania

- **Node.js 22 lub nowszy** z npm.
- Git oraz dostęp do tego repozytorium.
- Do publikacji: konto Google z dostępem do projektu Firebase i [Firebase CLI](https://firebase.google.com/docs/cli).
- Arkusz Google dostępny do odczytu dla **każdego z linkiem**.

Nie są potrzebne PHP, React, baza danych ani klucz Google Sheets API. Aplikacja używa HTML, CSS i JavaScriptu oraz publicznego interfejsu Google Visualization. Skrypty budowania i testy korzystają wyłącznie z Node.js; nie ma zależności npm do instalowania dla samej aplikacji.

## Pierwsze uruchomienie

```sh
git clone https://github.com/mazowsze-zhr/grywalizacja-strona.git
cd grywalizacja-strona
cp site.config.example.json site.config.json
```

Edytuj `site.config.json` i wpisz właściwy identyfikator arkusza:

```json
{
  "season": "winter",
  "year": 2027,
  "spreadsheetId": "WKLEJ_ID_ARKUSZA",
  "sheetName": "Punktacja",
  "range": "B2:E",
  "totalTasks": 12,
  "refreshSeconds": 60
}
```

Identyfikator to część adresu pomiędzy `/d/` a `/edit`, np. `https://docs.google.com/spreadsheets/d/IDENTYFIKATOR/edit`. Nie wklejaj całego URL.

| Ustawienie | Znaczenie |
| --- | --- |
| `season` | `winter` dla HAZ lub `summer` dla HAL. |
| `year` | Rok w tytule i nagłówku, np. `2027`. |
| `spreadsheetId` | Identyfikator publicznie udostępnionego arkusza. |
| `sheetName` | Dokładna nazwa zakładki, np. `Punktacja`. |
| `range` | Zakres danych bez nagłówka, np. `B2:E`. |
| `totalTasks` | Liczba zadań do mety/portu. Skala i pozycje aktualizują się automatycznie. |
| `refreshSeconds` | Odstęp odświeżania w sekundach, co najmniej `30`. |

`site.config.json` jest lokalny i pomijany przez Git. Po sklonowaniu na innym komputerze trzeba go utworzyć ponownie. Do konfiguracji wpisuj wyłącznie dane publiczne — ustawienia trafiają do przeglądarki w bloku JSON wewnątrz HTML. Nagłówek i grafiki korzystają dzięki temu z tej samej konfiguracji, a nazwy plików JS/CSS zawierają skrót ich zawartości, aby odróżniać wersje w pamięci podręcznej. Nie wpisuj haseł ani kluczy API; nieznane pola zatrzymują budowanie.

Uruchom:

```sh
npm test
npm start
```

Otwórz **http://127.0.0.1:8081**. `npm start` najpierw buduje stronę, potem uruchamia lokalny serwer. Po zmianie kodu lub ustawień zatrzymaj go przez Ctrl+C i uruchom ponownie. Jeśli port jest zajęty: `PORT=8082 npm start` (macOS/Linux).

## Przygotowanie arkusza

Dla domyślnego zakresu `B2:E`:

| Kolumna | Zawartość |
| --- | --- |
| B | Nazwa wyjazdu — puste nazwy są pomijane. |
| C | Liczba punktów (okręgoleonów). |
| D | Liczba wykonanych zadań. |
| E | Dawna kolumna pomocnicza — obecnie nie jest używana. |

Nagłówki umieść w pierwszym wierszu. Przy innym zakresie zachowaj kolejność: nazwa, punkty, zadania. W **Udostępnij → Dostęp ogólny** ustaw **Każdy, kto ma link → Przeglądający**. Takie udostępnienie dotyczy całego pliku, a nie tylko zakładki punktacji; źródło strony powinno zawierać dane przeznaczone do publicznego odczytu.

Ranking sortuje punkty malejąco. Remis oznacza wspólne miejsce, a kolejne miejsce zwiększa się o jeden: `1, 1, 2`. Postęp jest dzielony przez `totalTasks`; pozycja grafiki pozostaje w zakresie 0–100%. Ujemne punkty są obsługiwane, puste wartości liczbowe są traktowane jako zero.

Dane odświeżają się po otwarciu, powrocie do karty, kliknięciu przycisku oraz zgodnie z `refreshSeconds` w widocznej karcie. Google może buforować dane. Po błędzie odświeżenia strona pozostawia ostatni odczyt i pokazuje ostrzeżenie.

## Publikacja na Firebase Hosting

### Jednorazowe przygotowanie

```sh
npm install -g firebase-tools
firebase login
firebase projects:list
firebase use --add
```

Wybierz właściwy projekt i alias `default`. Firebase zapisze wybór lokalnie w `.firebaserc` (plik nie trafia do Git). Jeśli projekt nie istnieje, utwórz go w [Firebase Console](https://console.firebase.google.com/) lub poleceniem `firebase projects:create TWOJ_UNIKALNY_ID --display-name "Grywalizacja"`, a następnie wykonaj `firebase use --add`.

Nie trzeba uruchamiać `firebase init` — gotowy `firebase.json` jest w repozytorium. Hosting publikuje wyłącznie `dist/`; pliki źródłowe, konfiguracja lokalna, `.env` i dane logowania pozostają poza katalogiem publikacji.

### Wdrożenie

1. Ustaw sezon, rok i arkusz w `site.config.json`.
2. Uruchom `npm test` i sprawdź podgląd przez `npm start`.
3. Opublikuj stronę:

```sh
npm run deploy
# Możesz też jawnie wskazać projekt:
npm run deploy -- --project TWOJ_ID_PROJEKTU
```

Hook `predeploy` w `firebase.json` **zawsze buduje stronę z aktualnych ustawień**, również przy bezpośrednim `firebase deploy --only hosting`. Błąd konfiguracji zatrzymuje wdrożenie. Nie edytuj ręcznie `dist/`, bo jest odtwarzany przy każdym budowaniu.

Firebase CLI wyświetli adres strony po udanym wdrożeniu. Podstawowy wariant działa na statycznym Firebase Hosting; nie używa Functions, Cloud Run ani Firestore.

### Zmiana sezonu przy wdrożeniu

Zmień `season` w `site.config.json` lub nadpisz go zmienną środowiskową (macOS/Linux):

```sh
SEASON=summer npm run deploy -- --project TWOJ_ID_PROJEKTU
SEASON=winter YEAR=2028 npm run deploy -- --project TWOJ_ID_PROJEKTU
```

PowerShell: `$env:SEASON = "summer"`, potem `npm run deploy -- --project TWOJ_ID_PROJEKTU`. Po pracy usuń nadpisanie: `Remove-Item Env:SEASON`.

Dostępne nadpisania: `SEASON`, `YEAR`, `SPREADSHEET_ID`, `SHEET_NAME`, `SHEET_RANGE`, `TOTAL_TASKS`, `REFRESH_SECONDS`. Najpierw wczytywany jest JSON, następnie zmienne środowiskowe. To ustawienia **budowania**, nie przełączniki w konsoli Firebase ani parametry URL. Pliki `.env` nie są automatycznie wczytywane.

Dla kilku hostingów utrzymuj osobne pliki konfiguracji poza repozytorium i podawaj `SITE_CONFIG=/pelna/sciezka/ustawienia.json`. Każdy hosting może mieć inny sezon i arkusz. Nie uruchamiaj równocześnie kilku wdrożeń z tego samego katalogu, ponieważ współdzielą `dist/`.

Starszy adres `/hal/` przekierowuje na `/`, gdzie zawsze wyświetla się sezon wybrany przez administratora. Nie pozwala zmienić sezonu.

## Struktura projektu

```text
src/                      HTML, CSS, JavaScript i oryginalne grafiki
scripts/build.mjs         walidacja konfiguracji i generowanie jednej wersji
scripts/serve.mjs         lokalny serwer udostępniający wyłącznie dist/
tests/                    testy danych, rankingu i budowania obu wariantów
site.config.example.json  wzór ustawień dla następnego administratora
site.config.json          Twoje lokalne ustawienia (poza Git)
firebase.json             publikacja, nagłówki i hook budowania
dist/                     gotowa strona (generowana, poza Git)
ASSET-LICENSES.md          źródła grafik i wymagane oznaczenia
```

## Rozwiązywanie problemów

- **Brak konfiguracji / błędny identyfikator:** skopiuj przykład do `site.config.json` i zastąp `WKLEJ_ID_ARKUSZA` rzeczywistym ID.
- **Nie udało się pobrać punktacji:** sprawdź dostęp do arkusza bez logowania, nazwę zakładki i zakres. Czasem potrzebne jest ponowne odświeżenie po chwili.
- **Zły sezon po publikacji:** sprawdź `season`, ewentualną zmienną `SEASON`, plik wskazany przez `SITE_CONFIG` i wybrany projekt Firebase. Ponów wdrożenie.
- **Brak dostępu do Firebase:** wykonaj `firebase login --reauth` i sprawdź uprawnienia konta do projektu.
- **Stara punktacja:** poczekaj na następny odczyt; opóźnienie może wynikać z bufora Google.

Przekazując utrzymanie, zapewnij następnej osobie dostęp do organizacji GitHub, projektu Firebase i edycji arkusza oraz przekaż właściwe ustawienia wdrożenia. Sam dostęp do repozytorium nie nadaje dostępu do tych usług.
