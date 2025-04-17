# Server

## Descrizione del Progetto
Questo è il server backend di Passione Decorazione, sviluppato utilizzando Node.js con TypeScript e Express.js.

## Struttura del Progetto
├── src/ # Directory principale del codice sorgente
│ ├── app.ts # Entry point dell'applicazione
│ ├── config/ # Configurazioni dell'applicazione
│ ├── core/ # Componenti core dell'applicazione
│ │ └── prisma/ # Schema e configurazione del database Prisma
│ └── features/ # Feature modules dell'applicazione
│
├── .env # File di configurazione per le variabili d'ambiente
├── .env.example # Template per le variabili d'ambiente
├── package.json # Configurazione npm e dipendenze
├── tsconfig.json # Configurazione TypeScript
└── README.md # Documentazione del progetto

## Tecnologie Principali

- **Runtime**: Node.js con TypeScript
- **Framework**: Express.js
- **Database ORM**: Prisma
- **Autenticazione**: JWT (jsonwebtoken)
- **Sicurezza**: 
  - bcrypt per l'hashing delle password
  - helmet per la protezione delle headers HTTP
  - express-rate-limit per il rate limiting
  - cors per la gestione delle Cross-Origin Resource Sharing

## Dipendenze Principali

### Produzione
- `@prisma/client`: ORM per l'interazione con il database
- `express`: Framework web
- `bcrypt`: Hashing delle password
- `jsonwebtoken`: Gestione dei token JWT
- `zod`: Validazione degli schemi
- `mailgun.js`: Servizio email
- `helmet`: Sicurezza delle headers HTTP
- `cors`: Gestione CORS
- `dotenv`: Gestione variabili d'ambiente

### Sviluppo
- `typescript`: Supporto TypeScript
- `prisma`: CLI e tooling per Prisma
- `ts-node`: Esecuzione diretta di file TypeScript
- `tsconfig-paths`: Gestione dei path alias in TypeScript

## Script Disponibili

- `npm start`: Avvia il server in modalità sviluppo

## Configurazione

Copiare il file `.env.example` in `.env` e configurare le variabili necessarie prima dell'avvio.

## Database

Il progetto utilizza Prisma come ORM. Lo schema del database si trova in `src/core/prisma/schema.prisma`.

## Struttura del Codice

- `src/app.ts`: Entry point dell'applicazione che configura e avvia il server Express
- `src/config/`: Contiene le configurazioni dell'applicazione
- `src/core/`: Contiene i componenti fondamentali dell'applicazione
- `src/features/`: Contiene i moduli feature-based dell'applicazione

### Config (/src/config)
- `env.ts`: Gestisce la validazione e l'accesso alle variabili d'ambiente
- `mailgun.ts`: Configurazione e setup del client Mailgun per l'invio di email

### Core (/src/core)

#### Auth
- Implementazione core dell'autenticazione
- Middleware di autenticazione
- Gestione dei token JWT

#### Errors
- Definizioni delle classi di errore personalizzate
- Middleware per la gestione degli errori
- Utility per la formattazione degli errori

#### Prisma
- `schema.prisma`: Definizione del modello dati
- Client Prisma configurato

#### Security
- Implementazioni di sicurezza
- Middleware di protezione
- Utility per l'hashing e la crittografia

#### Types
- Interfacce TypeScript
- Type definitions
- Enumerazioni

#### Utils
- Funzioni di utilità condivise
- Helper functions
- Costanti

### Features (/src/features)

#### Auth
- Routes per autenticazione
- Controllers per login/logout
- Gestione della registrazione
- Recupero password

#### Manage Users
- CRUD operations per gli utenti
- Gestione dei ruoli
- Amministrazione utenti

#### User Settings
- Gestione profilo utente
- Preferenze utente
- Impostazioni account

