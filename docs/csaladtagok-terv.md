# Családtagok és utazás-résztvevők — átalakítási terv

## Alapelv

> **A személy egy fiók. A családtag csak egy háztartás bejegyzése valakiről. A hozzáférés (közreműködő) és a részvétel (résztvevő) két külön dolog.**

| Fogalom | Mit jelent | Ki kezeli |
|---|---|---|
| Családtag (`FamilyMember`) | Egy háztartás címjegyzék-bejegyzése (lehet fiók nélküli, gyerek is) | A háztartás tulajdonosa |
| Fiókhoz kötés (`linkedUserId`) | A bejegyzés ugyanaz a személy, mint egy regisztrált fiók | Csak **megerősítéssel** jöhet létre |
| Résztvevő (`TripParticipant`) | Ki utazik | Az út tulajdonosa mindenkit, a szerkesztők a saját családtagjaikat |
| Közreműködő (`TripCollaborator`) | Kinek van hozzáférése az úthoz (szerkesztő / olvasó) | Az út tulajdonosa |

## Mi volt a baj (és mi lesz)

| # | Probléma | Megoldás | Séma-változás |
|---|---|---|---|
| 1 | Bejelentkezéskor névegyezés alapján automatikus összekötés + szerkesztői jog idegen utazásokhoz | Automatikus egyezés **csak e-mail** alapján, és csak **függő kérelmet** hoz létre (a felhasználó megerősíti). Utazáson belüli átvétel csak az adott utazáshoz ad jogot | nincs |
| 2 | Az e-mail megadásakor kiderül, kinek van fiókja (név + e-mail) | Semleges válaszok; a felület mindig felajánlja a kérelmet, a létezést nem árulja el. Sebességkorlát a műveleteken | nincs |
| 3 | Egy fiók csak egy külső profillal köthető össze | Több háztartás is hivatkozhat ugyanarra a fiókra; háztartáson belül továbbra is csak egy profil | nincs (a DB-ben már nincs egyediségi megszorítás) |
| 4 | Eltávolított közreműködő "szelleme" a résztvevők között | Eltávolításkor választható: a hozzá kötött résztvevői sorok is törlődnek (alapból igen) | nincs |
| 5 | A tulajdonos nem kezelhet más háztartás résztvevőit; zavaros címkék | Tulajdonos bárkit eltávolíthat; egyértelmű címkék (szerep, fiókkal/fiók nélkül); a "gyógyító" automatika megszűnik | nincs |
| 6 | Új útnál rossz alapértelmezett résztvevő (ábécé szerinti első) | A saját, fiókhoz kötött profil | nincs |
| 7 | Két eltérő `ensureSelfFamilyMember` | Egy közös implementáció | nincs |
| 8 | Oldalmegnyitás adatot módosít (auto-claim, résztvevő-gyógyítás) | Eltávolítva; ezek csak csatlakozáskor / kérelem elfogadásakor futnak | nincs |
| 9 | `isChild` nyers SQL, elnyelt hibákkal | Prisma mező | nincs (az oszlop már létezik) |
| 10 | Családtag törlése figyelmeztetés nélkül | Megerősítő ablak a következményekkel (résztvevői sorok, kifizetett költségek, dokumentumok) | nincs |

## Lépések

1. **Biztonság (1., 2.)** — `actions/family.ts`, `lib/auth.ts`: automatikus összekötés átalakítása, semleges válaszok, sebességkorlát.
2. **Profil-logika (6., 7., 8., 9.)** — közös self-profil, `isChild`, olvasás közbeni írások eltávolítása.
3. **Több háztartás egy fiókhoz (3.)** — `findExternalLinkedProfile` helyett háztartáson belüli ellenőrzés.
4. **Résztvevő-kezelés (4., 5.)** — új `removeTripParticipant`, `removeCollaborator` kiegészítés, felület.
5. **Törlés-hatásvizsgálat (10.)** — `getFamilyMemberDeleteImpact` + megerősítő ablak.
6. **Ellenőrzés** — tesztek, típusellenőrzés, lint, build.

## Nem cél (később)

- A költségelszámolás összevonása azonos fiókhoz kötött, de két háztartásban szereplő profilokra (ma külön személynek számítanak).
- Értesítés a tulajdonosnak, ha valaki elutasítja az automatikus kérelmet.
